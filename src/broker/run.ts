import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { discoverCandidates } from "./discover.js";
import { buildPackageAcquisitionHint } from "./acquisition.js";
import {
  AcquisitionMemoryStore,
  acquisitionMemoryFilePath
} from "./acquisition-memory.js";
import {
  loadVerifiedDownstreamCandidates,
  writeVerifiedDownstreamManifest
} from "./downstream-manifest-source.js";
import { explainDecision } from "./explain.js";
import { buildHandoffEnvelope } from "./handoff.js";
import { resolveLocalSkillHandoffSource } from "./local-skill-handoff.js";
import { hydratePackageAvailability } from "./package-availability.js";
import { PrepareCandidateError, prepareCandidate } from "./prepare.js";
import {
  legacyIntentCacheKey,
  requestRoutingReasonCode,
  resolveBrokerRequest,
  type ResolvedBrokerRequest
} from "./resolved-request.js";
import {
  hasCapabilityQueryMatch,
  rankCapabilities,
  type SemanticRankingSignal,
  type RoutingHistory
} from "./rank.js";
import {
  resolveSemanticCandidates,
  type SemanticResolverResult
} from "./semantic-resolver.js";
import {
  type BrokerAdvisory,
  type BrokerDebug,
  type BrokerFailureResult,
  type BrokerSuccessResult,
  type RunBrokerResult
} from "./result.js";
import {
  createBrokerRoutingTrace,
  type BrokerRoutingTrace
} from "./trace.js";
import {
  appendBrokerRoutingTrace,
  routingTraceLogFilePath
} from "./trace-store.js";
import { WorkflowSessionStore } from "./workflow-session-store.js";
import {
  resumeWorkflowRun,
  startWorkflowRun
} from "./workflow-runtime.js";
import { toCapabilityCard, type CapabilityCandidate, type CapabilityCard } from "../core/capability-card.js";
import {
  handleRefreshFailure,
  isWithinHardTtl,
  shouldRefreshToday
} from "../core/cache/policy.js";
import { FileBackedCacheStore } from "../core/cache/store.js";
import type { BrokerEnvelope } from "../core/envelope.js";
import {
  AmbiguousBrokerRequestError,
  normalizeRequest,
  type NormalizeRequestInput,
  UnsupportedBrokerRequestError
} from "../core/request.js";
import type { WorkflowRecipe } from "../core/workflow.js";
import type {
  BrokerHost,
  BrokerHostAction,
  BrokerIntent,
  BrokerOutcomeCode,
  DownstreamExecutionFailure
} from "../core/types.js";
import { BROKER_HOSTS, isBrokerHost } from "../core/types.js";
import {
  loadHostDiscoverySnapshot,
  loadHostSkillCandidates,
  loadHostWorkflowRecipes
} from "../sources/host-skill-catalog.js";
import { searchMcpRegistry } from "../sources/mcp-registry.js";

type CachedWinnerCard = CapabilityCard & {
  fetchedAt: string;
};

type BrokerCacheRecord = {
  card: CachedWinnerCard;
  lastHost: string;
  compatibilityIntent?: BrokerIntent;
  requestQueryIdentity?: string;
  requestIntent?: BrokerIntent;
  requestCacheKey?: string;
  successfulRoutes: number;
};

type DiscoverySnapshot = {
  candidates: CapabilityCard[];
  workflowsById: Map<string, WorkflowRecipe>;
};

function mergeHistoryByCandidateId(
  ...histories: Array<Record<string, RoutingHistory> | undefined>
): Record<string, RoutingHistory> | undefined {
  const merged = new Map<string, RoutingHistory>();

  for (const history of histories) {
    if (history === undefined) {
      continue;
    }

    for (const [candidateId, candidateHistory] of Object.entries(history)) {
      const existing = merged.get(candidateId);

      merged.set(candidateId, {
        cacheHit:
          (existing?.cacheHit ?? false) || (candidateHistory.cacheHit ?? false),
        successfulRoutes:
          (existing?.successfulRoutes ?? 0) +
          (candidateHistory.successfulRoutes ?? 0)
      });
    }
  }

  if (merged.size === 0) {
    return undefined;
  }

  return Object.fromEntries(merged);
}

function resolveSemanticRankingSignal(
  request: ResolvedBrokerRequest,
  candidates: CapabilityCard[]
): {
  semanticResult?: SemanticResolverResult;
  semanticSignal?: SemanticRankingSignal;
} {
  if (request.compatibilityIntent !== "web_content_to_markdown") {
    return {};
  }

  const currentHostCandidates = candidates.filter(
    (candidate) => candidate.hosts.currentHostSupported
  );
  const semanticResult = resolveSemanticCandidates({
    requestText: request.request.capabilityQuery.requestText,
    candidates: currentHostCandidates.map((candidate) => ({
      candidateId: candidate.id,
      proofFamily: candidate.query.proofFamily,
      confidence: candidate.ranking.confidence
    }))
  });

  if (
    semanticResult.verdict !== "direct_route" ||
    semanticResult.topMatch === undefined
  ) {
    return {
      semanticResult
    };
  }

  return {
    semanticResult,
    semanticSignal: {
      candidateId: semanticResult.topMatch.candidateId,
      reason: "direct_route",
      proofFamily: semanticResult.topMatch.proofFamily
    }
  };
}

function semanticTraceInput(
  semanticResult: SemanticResolverResult | undefined
):
  | {
      verdict: SemanticResolverResult["verdict"];
      topMatch?: {
        candidateId: string;
        proofFamily: NonNullable<SemanticResolverResult["topMatch"]>["proofFamily"];
      };
    }
  | undefined {
  if (semanticResult === undefined) {
    return undefined;
  }

  return {
    verdict: semanticResult.verdict,
    topMatch:
      semanticResult.topMatch === undefined
        ? undefined
        : {
            candidateId: semanticResult.topMatch.candidateId,
            proofFamily: semanticResult.topMatch.proofFamily
          }
  };
}

export type RunBrokerOptions = {
  cacheFilePath?: string;
  workflowSessionFilePath?: string;
  hostCatalogFilePath?: string;
  mcpRegistryFilePath?: string;
  currentHost?: BrokerHost;
  brokerHomeDirectory?: string;
  packageSearchRoots?: string[];
  now?: Date;
};

export type { RunBrokerResult } from "./result.js";

const DEFAULT_CURRENT_HOST = "claude-code";

function assertCurrentHost(value: string): BrokerHost {
  if (!isBrokerHost(value)) {
    throw new Error(
      `Expected broker currentHost to be one of ${BROKER_HOSTS.join(", ")}.`
    );
  }

  return value;
}

function assertEnvelopeMode(
  input: NormalizeRequestInput
): void {
  if (
    "requestText" in input &&
    input.capabilityQuery !== undefined &&
    input.workflowResume !== undefined
  ) {
    throw new Error(
      "Expected broker envelope.capabilityQuery and broker envelope.workflowResume to be mutually exclusive."
    );
  }
}

function defaultHostCatalogFilePath(): string {
  return join(process.cwd(), "config/host-skills.seed.json");
}

function defaultMcpRegistryFilePath(): string {
  return join(process.cwd(), "config/mcp-registry.seed.json");
}

function isPackagedMcpSeedFilePath(filePath: string): boolean {
  return basename(filePath) === "mcp-registry.seed.json";
}

function isPlaceholderSeedMcpCandidate(candidate: CapabilityCard): boolean {
  const identifiers = [
    candidate.id,
    candidate.package.packageId,
    candidate.leaf.capabilityId,
    candidate.sourceMetadata.registryName
  ];

  return identifiers.some(
    (value) =>
      typeof value === "string" &&
      /^io\.example(?:[/:.-]|$)/i.test(value.trim())
  );
}

function filterPackagedSeedMcpCandidates(
  candidates: CapabilityCard[],
  filePath: string
): CapabilityCard[] {
  if (!isPackagedMcpSeedFilePath(filePath)) {
    return candidates;
  }

  // The packaged seed registry is demonstrative. Keep obvious placeholder
  // namespaces out of real broker runs so reranking does not surface fake
  // install targets after a downstream execution failure.
  return candidates.filter((candidate) => !isPlaceholderSeedMcpCandidate(candidate));
}

function defaultCacheFilePath(): string {
  return join(tmpdir(), "skills-broker-cache.json");
}

function defaultWorkflowSessionFilePath(options: RunBrokerOptions): string {
  if (options.workflowSessionFilePath !== undefined) {
    return options.workflowSessionFilePath;
  }

  if (options.brokerHomeDirectory !== undefined) {
    return join(options.brokerHomeDirectory, "state", "workflow-sessions.json");
  }

  if (options.cacheFilePath !== undefined) {
    return join(dirname(options.cacheFilePath), "workflow-sessions.json");
  }

  return join(tmpdir(), "skills-broker-workflow-sessions.json");
}

async function persistTraceIfConfigured(
  trace: BrokerRoutingTrace,
  brokerHomeDirectory: string | undefined
): Promise<BrokerAdvisory | undefined> {
  if (brokerHomeDirectory === undefined) {
    return undefined;
  }

  try {
    await appendBrokerRoutingTrace(
      routingTraceLogFilePath(brokerHomeDirectory),
      trace
    );
    return undefined;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "unknown routing trace failure";

    return {
      code: "routing_trace_write_failed",
      message:
        "Routing succeeded, but the routing trace could not be persisted. Repair broker-home state before relying on trace history.",
      detail
    };
  }
}

async function persistAcquisitionMemoryIfConfigured(
  store: AcquisitionMemoryStore | undefined,
  input: {
    canonicalKey: string;
    compatibilityIntent: BrokerIntent;
    winner: CapabilityCard;
    currentHost: BrokerHost;
    now: Date;
  }
): Promise<BrokerAdvisory | undefined> {
  if (store === undefined) {
    return undefined;
  }

  try {
    await store.recordVerifiedWinner(input);
    return undefined;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "unknown acquisition memory failure";

    return {
      code: "acquisition_memory_write_failed",
      message:
        "Routing succeeded, but acquisition memory could not be updated. Verify/reuse proof may remain incomplete until repaired.",
      detail
    };
  }
}

async function replayAcquisitionCandidatesIfConfigured(
  store: AcquisitionMemoryStore | undefined,
  canonicalKey: string
): Promise<CapabilityCard[]> {
  if (store === undefined) {
    return [];
  }

  try {
    return await store.replayCandidates(canonicalKey);
  } catch {
    return [];
  }
}

async function persistVerifiedDownstreamManifestIfConfigured(input: {
  brokerHomeDirectory?: string;
  winner: CapabilityCard;
  currentHost: BrokerHost;
  now: Date;
}): Promise<BrokerAdvisory | undefined> {
  try {
    await writeVerifiedDownstreamManifest(input);
    return undefined;
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "unknown verified downstream manifest failure";

    return {
      code: "verified_downstream_manifest_write_failed",
      message:
        "Routing succeeded, but the verified downstream manifest could not be written. Replay proof may remain incomplete until repaired.",
      detail
    };
  }
}

function withAdvisories<T extends RunBrokerResult>(
  result: T,
  advisories: BrokerAdvisory[]
): T {
  if (advisories.length === 0) {
    return result;
  }

  return {
    ...result,
    advisories: [...(result.advisories ?? []), ...advisories]
  };
}

function createNoCandidateResult(
  debug: BrokerDebug,
  trace: BrokerRoutingTrace
): BrokerFailureResult {
  const message =
    "The broker understood the request, but no matching capability was found. Offer capability discovery help.";
  const errorMessage = "No candidate matched the normalized broker request.";

  return {
    ok: false,
    outcome: {
      code: "NO_CANDIDATE",
      message,
      hostAction: "offer_capability_discovery"
    },
    error: {
      code: "NO_CANDIDATE",
      message: errorMessage
    },
    debug,
    trace
  };
}

function createPackageInstallRequiredResult(
  winner: CapabilityCard,
  debug: BrokerDebug,
  trace: BrokerRoutingTrace
): BrokerFailureResult {
  return {
    ok: false,
    outcome: {
      code: "INSTALL_REQUIRED",
      message: `The broker matched "${winner.leaf.capabilityId}", but package "${winner.package.packageId}" is not installed yet. Install and verify package "${winner.package.packageId}" before retrying.`,
      hostAction: "offer_package_install"
    },
    error: {
      code: "INSTALL_REQUIRED",
      message: `Package "${winner.package.packageId}" is not installed for capability "${winner.leaf.capabilityId}".`
    },
    acquisition: buildPackageAcquisitionHint(winner, {
      retryMode: "rerun_request"
    }),
    debug,
    trace
  };
}

function createExecutionFailureExhaustedResult(
  excludedCandidateIds: string[],
  debug: BrokerDebug,
  trace: BrokerRoutingTrace
): BrokerFailureResult {
  const excludedList = excludedCandidateIds.join(", ");
  const message =
    "The broker excluded previously failed downstream candidates but found no healthy alternative. Explain the failure clearly and do not silently bypass the broker.";

  return {
    ok: false,
    outcome: {
      code: "PREPARE_FAILED",
      message,
      hostAction: "show_graceful_failure"
    },
    error: {
      code: "PREPARE_FAILED",
      message: `No healthy alternative remained after excluding previously failed downstream candidates: ${excludedList}.`
    },
    debug,
    trace
  };
}

function createFailureResult(
  code: Exclude<
    BrokerOutcomeCode,
    | "HANDOFF_READY"
    | "WORKFLOW_STAGE_READY"
    | "WORKFLOW_BLOCKED"
    | "WORKFLOW_COMPLETED"
    | "NO_CANDIDATE"
    | "INSTALL_REQUIRED"
  >,
  message: string,
  hostAction: BrokerHostAction,
  debug: BrokerDebug,
  trace: BrokerRoutingTrace,
  errorMessage = message,
  failure?: BrokerFailureResult["failure"]
): BrokerFailureResult {
  return {
    ok: false,
    outcome: {
      code,
      message,
      hostAction
    },
    error: {
      code,
      message: errorMessage
    },
    failure,
    debug,
    trace
  };
}

function unsupportedRequestMessage(): string {
  return "This request is outside the broker's supported lanes. Continue with the host's normal workflow.";
}

function ambiguousRequestMessage(): string {
  return "This request looks broker-relevant but needs clarification before routing. Ask a clarifying question.";
}

function prepareFailedMessage(): string {
  return "The broker selected a candidate but could not prepare a handoff. Explain the failure clearly and do not silently bypass the broker.";
}

function prepareFailureUserMessage(error: PrepareCandidateError): string {
  return error.userMessage;
}

function packageInstalled(card: CapabilityCard): boolean {
  return card.package.installState === "installed";
}

function downstreamExecutionFailuresFromInput(
  input: NormalizeRequestInput
): DownstreamExecutionFailure[] {
  if ("task" in input) {
    return [];
  }

  return input.executionFailures ?? [];
}

function matchesExecutionFailure(
  candidate: CapabilityCard,
  failure: DownstreamExecutionFailure
): boolean {
  const hasSpecificIdentity =
    failure.candidateId !== undefined ||
    failure.leafCapabilityId !== undefined ||
    failure.implementationId !== undefined;

  if (hasSpecificIdentity) {
    return (
      failure.candidateId === candidate.id ||
      failure.leafCapabilityId === candidate.leaf.capabilityId ||
      failure.implementationId === candidate.implementation.id
    );
  }

  return failure.packageId === candidate.package.packageId;
}

function excludeFailedCandidates(
  candidates: CapabilityCard[],
  failures: DownstreamExecutionFailure[]
): {
  candidates: CapabilityCard[];
  excludedCandidateIds: string[];
} {
  if (failures.length === 0) {
    return {
      candidates,
      excludedCandidateIds: []
    };
  }

  const excludedCandidateIds = candidates
    .filter((candidate) =>
      failures.some((failure) => matchesExecutionFailure(candidate, failure))
    )
    .map((candidate) => candidate.id);

  if (excludedCandidateIds.length === 0) {
    return {
      candidates,
      excludedCandidateIds
    };
  }

  const excludedIdSet = new Set(excludedCandidateIds);

  return {
    candidates: candidates.filter((candidate) => !excludedIdSet.has(candidate.id)),
    excludedCandidateIds
  };
}

function filterExecutionFailureRecoveryCandidates(
  candidates: CapabilityCard[],
  requestCompatibilityIntent: BrokerIntent,
  failures: DownstreamExecutionFailure[]
): CapabilityCard[] {
  if (failures.length === 0) {
    return candidates;
  }

  return candidates.filter(
    (candidate) => candidate.compatibilityIntent === requestCompatibilityIntent
  );
}

function workflowCandidate(recipe: WorkflowRecipe): CapabilityCandidate {
  return {
    id: recipe.id,
    kind: "skill",
    label: recipe.label,
    intent: recipe.compatibilityIntent,
    package: recipe.package,
    leaf: recipe.leaf,
    query: recipe.query,
    implementation: recipe.implementation,
    sourceMetadata: recipe.sourceMetadata
  };
}

function workflowWinnerCard(recipe: WorkflowRecipe): CapabilityCard {
  return toCapabilityCard(workflowCandidate(recipe));
}

function isResumeEnvelope(
  input: NormalizeRequestInput
): input is BrokerEnvelope & {
  workflowResume: NonNullable<BrokerEnvelope["workflowResume"]>;
} {
  return "requestText" in input && input.workflowResume !== undefined;
}

function cacheRecordMatchesQueryIdentity(
  record: BrokerCacheRecord,
  request: ResolvedBrokerRequest
): boolean {
  return record.requestQueryIdentity === request.requestQueryIdentity;
}

function cacheRecordMatchesLegacyKey(
  record: BrokerCacheRecord,
  request: ResolvedBrokerRequest
): boolean {
  const legacyKey =
    record.requestCacheKey ??
    (record.requestIntent === undefined && record.compatibilityIntent === undefined
      ? undefined
      : legacyIntentCacheKey(record.requestIntent ?? record.compatibilityIntent!));

  return (
    legacyKey === request.legacyRequestCacheKey ||
    legacyKey === request.legacyIntentCacheKey
  );
}

function cacheRecordMatchesCompatibilityIntent(
  record: BrokerCacheRecord,
  request: ResolvedBrokerRequest
): boolean {
  const recordIntent =
    record.requestIntent ?? record.compatibilityIntent ?? record.card.compatibilityIntent;

  return recordIntent === request.compatibilityIntent;
}

async function discoverCapabilityCards(
  request: ResolvedBrokerRequest,
  hostCatalogFilePath: string,
  mcpRegistryFilePath: string,
  acquisitionMemoryCandidates: CapabilityCard[] = [],
  downstreamManifestCandidates: CapabilityCard[] = []
): Promise<DiscoverySnapshot> {
  const [hostDiscoveryResult, mcpResult] = await Promise.allSettled([
    loadHostDiscoverySnapshot(undefined, hostCatalogFilePath),
    searchMcpRegistry(
      {
        intent: request.compatibilityIntent,
        capabilityQuery: request.request.capabilityQuery
      },
      mcpRegistryFilePath
    )
  ]);

  if (
    hostDiscoveryResult.status === "rejected" &&
    mcpResult.status === "rejected" &&
    acquisitionMemoryCandidates.length === 0 &&
    downstreamManifestCandidates.length === 0
  ) {
    throw new AggregateError(
      [hostDiscoveryResult.reason, mcpResult.reason],
      "All discovery sources failed."
    );
  }

  const hostCandidates =
    hostDiscoveryResult.status === "fulfilled"
      ? hostDiscoveryResult.value.skillCandidates
      : [];
  const workflowRecipes =
    hostDiscoveryResult.status === "fulfilled"
      ? hostDiscoveryResult.value.workflowRecipes
      : [];
  const mcpCandidates =
    mcpResult.status === "fulfilled" ? mcpResult.value : [];

  const normalizedHostCandidates = hostCandidates.map(toCapabilityCard);
  const normalizedWorkflowCandidates = workflowRecipes
    .map((recipe) => workflowCandidate(recipe))
    .map(toCapabilityCard);
  const normalizedMcpCandidates = filterPackagedSeedMcpCandidates(
    mcpCandidates.map(toCapabilityCard),
    mcpRegistryFilePath
  );
  const mergedCandidates = discoverCandidates(
    {
      source: "downstream_manifest",
      candidates: downstreamManifestCandidates
    },
    {
      source: "acquisition_memory",
      candidates: acquisitionMemoryCandidates
    },
    {
      source: "host_catalog",
      candidates: normalizedHostCandidates
    },
    {
      source: "workflow_catalog",
      candidates: normalizedWorkflowCandidates
    },
    {
      source: "mcp_registry",
      candidates: normalizedMcpCandidates
    }
  )
    .filter(
      (candidate) =>
        candidate.compatibilityIntent === request.compatibilityIntent ||
        hasCapabilityQueryMatch(candidate, request.request.capabilityQuery)
    );

  return {
    candidates: mergedCandidates,
    workflowsById: new Map(workflowRecipes.map((recipe) => [recipe.id, recipe] as const))
  };
}

async function writeWinnerCache(
  cacheStore: FileBackedCacheStore<BrokerCacheRecord>,
  winner: CapabilityCard,
  cachedCard: BrokerCacheRecord | null,
  currentHost: BrokerHost,
  request: ResolvedBrokerRequest,
  now: Date
): Promise<void> {
  await cacheStore.write({
    card: {
      ...winner,
      fetchedAt: now.toISOString()
    },
    lastHost: currentHost,
    compatibilityIntent: request.compatibilityIntent,
    requestQueryIdentity: request.requestQueryIdentity,
    successfulRoutes:
      cachedCard?.card.id === winner.id ? cachedCard.successfulRoutes + 1 : 1
  });
}

async function runWorkflowResume(
  input: BrokerEnvelope & {
    workflowResume: NonNullable<BrokerEnvelope["workflowResume"]>;
  },
  options: RunBrokerOptions,
  currentHost: BrokerHost,
  now: Date,
  hostCatalogFilePath: string
): Promise<RunBrokerResult> {
  const sessionStore = new WorkflowSessionStore(
    defaultWorkflowSessionFilePath(options)
  );
  const acquisitionMemoryStore =
    options.brokerHomeDirectory === undefined
      ? undefined
      : new AcquisitionMemoryStore(
          acquisitionMemoryFilePath(options.brokerHomeDirectory)
        );
  const session = await sessionStore.read(input.workflowResume.runId);

  if (session === null) {
    return createFailureResult(
      "WORKFLOW_FAILED",
      `Workflow run "${input.workflowResume.runId}" was not found.`,
      "show_graceful_failure",
      {
        cacheHit: false,
        candidateCount: 0
      },
      createBrokerRoutingTrace({
        input,
        currentHost,
        resultCode: "WORKFLOW_FAILED",
        now,
        hostAction: "show_graceful_failure",
        candidateCount: 0,
        runId: input.workflowResume.runId,
        stageId: input.workflowResume.stageId,
        reasonCode: "UNKNOWN_RUN"
      }),
      `Workflow run "${input.workflowResume.runId}" was not found.`,
      {
        reasonCode: "UNKNOWN_RUN",
        retryable: false,
        runId: input.workflowResume.runId,
        stageId: input.workflowResume.stageId
      }
    );
  }

  const workflows = await loadHostWorkflowRecipes(undefined, hostCatalogFilePath);
  const recipe = workflows.find((candidate) => candidate.id === session.workflowId);

  if (recipe === undefined) {
    return createFailureResult(
      "WORKFLOW_FAILED",
      `Workflow "${session.workflowId}" is no longer available in the broker catalog.`,
      "show_graceful_failure",
      {
        cacheHit: false,
        candidateCount: 0
      },
      createBrokerRoutingTrace({
        input,
        currentHost,
        resultCode: "WORKFLOW_FAILED",
        now,
        hostAction: "show_graceful_failure",
        candidateCount: 0,
        workflowId: session.workflowId,
        runId: session.runId,
        stageId: session.activeStageId,
        reasonCode: "UNKNOWN_RUN"
      }),
      `Workflow "${session.workflowId}" is no longer available in the broker catalog.`,
      {
        reasonCode: "UNKNOWN_RUN",
        retryable: false,
        runId: session.runId,
        stageId: session.activeStageId ?? undefined
      }
    );
  }

  const resolvedRequest = resolveBrokerRequest(session.request);

  return resumeWorkflowRun({
    input,
    currentHost,
    now,
    request: session.request,
    routingReasonCode: requestRoutingReasonCode(
      workflowWinnerCard(recipe),
      resolvedRequest
    ),
    winner: workflowWinnerCard(recipe),
    recipe,
    sessionStore,
    requestQueryIdentity: resolvedRequest.requestQueryIdentity,
    acquisitionMemoryStore,
    brokerHomeDirectory: options.brokerHomeDirectory,
    packageSearchRoots: options.packageSearchRoots,
    resume: input.workflowResume,
    debug: {
      cacheHit: false,
      candidateCount: 1,
      decision: "resume_existing_workflow"
    }
  });
}

async function runSingleStep(
  input: NormalizeRequestInput,
  options: RunBrokerOptions,
  currentHost: BrokerHost,
  now: Date
): Promise<RunBrokerResult> {
  const cacheStore = new FileBackedCacheStore<BrokerCacheRecord>(
    options.cacheFilePath ?? defaultCacheFilePath()
  );
  const hostCatalogFilePath =
    options.hostCatalogFilePath ?? defaultHostCatalogFilePath();
  const mcpRegistryFilePath =
    options.mcpRegistryFilePath ?? defaultMcpRegistryFilePath();
  let request;

  try {
    request = normalizeRequest(input, currentHost);
  } catch (error) {
    if (error instanceof UnsupportedBrokerRequestError) {
      return createFailureResult(
        "UNSUPPORTED_REQUEST",
        unsupportedRequestMessage(),
        "continue_normally",
        {
          cacheHit: false,
          candidateCount: 0
        },
        createBrokerRoutingTrace({
          input,
          currentHost,
          resultCode: "UNSUPPORTED_REQUEST",
          now,
          hostAction: "continue_normally",
          candidateCount: 0
        }),
        error.message
      );
    }

    if (error instanceof AmbiguousBrokerRequestError) {
      return createFailureResult(
        "AMBIGUOUS_REQUEST",
        ambiguousRequestMessage(),
        "ask_clarifying_question",
        {
          cacheHit: false,
          candidateCount: 0
        },
        createBrokerRoutingTrace({
          input,
          currentHost,
          resultCode: "AMBIGUOUS_REQUEST",
          now,
          hostAction: "ask_clarifying_question",
          candidateCount: 0
        }),
        error.message
      );
    }

    throw error;
  }

  const resolvedRequest = resolveBrokerRequest(request);
  const acquisitionMemoryStore =
    options.brokerHomeDirectory === undefined
      ? undefined
      : new AcquisitionMemoryStore(
          acquisitionMemoryFilePath(options.brokerHomeDirectory)
        );
  const executionFailures = downstreamExecutionFailuresFromInput(input);
  const hasExecutionFailures = executionFailures.length > 0;

  const cachedRecord = await cacheStore.read();
  const exactCachedCard =
    cachedRecord !== null &&
    cacheRecordMatchesQueryIdentity(cachedRecord, resolvedRequest) &&
    cacheRecordMatchesCompatibilityIntent(cachedRecord, resolvedRequest) &&
    isWithinHardTtl(cachedRecord.card, now)
      ? cachedRecord
      : null;
  const legacyMatchedCard =
    exactCachedCard === null &&
    cachedRecord !== null &&
    cachedRecord.requestQueryIdentity === undefined &&
    cacheRecordMatchesLegacyKey(cachedRecord, resolvedRequest) &&
    cacheRecordMatchesCompatibilityIntent(cachedRecord, resolvedRequest) &&
    isWithinHardTtl(cachedRecord.card, now)
      ? cachedRecord
      : null;

  let cacheHit = false;
  let candidates: CapabilityCard[] = [];
  let workflowsById = new Map<string, WorkflowRecipe>();

  if (
    !hasExecutionFailures &&
    exactCachedCard !== null &&
    !shouldRefreshToday(exactCachedCard.card, now)
  ) {
    cacheHit = true;
    candidates = [
      {
        ...exactCachedCard.card
      }
    ];
  } else {
    try {
      const downstreamManifestCandidates =
        await loadVerifiedDownstreamCandidates({
          brokerHomeDirectory: options.brokerHomeDirectory,
          currentHost,
          visibleHosts: [
            currentHost,
            ...BROKER_HOSTS.filter((host) => host !== currentHost)
          ]
        });
      const acquisitionMemoryCandidates =
        await replayAcquisitionCandidatesIfConfigured(
          acquisitionMemoryStore,
          resolvedRequest.requestQueryIdentity
        );
      const discovered = await discoverCapabilityCards(
        resolvedRequest,
        hostCatalogFilePath,
        mcpRegistryFilePath,
        acquisitionMemoryCandidates,
        downstreamManifestCandidates
      );
      candidates = discovered.candidates;
      workflowsById = discovered.workflowsById;
    } catch (error) {
      if (exactCachedCard !== null) {
        const action = handleRefreshFailure(exactCachedCard.card);

        if (action.deleteCard) {
          await cacheStore.delete();
        }

        if (action.forceRediscovery) {
          candidates = [];
        }
      } else {
        throw error;
      }
    }
  }

  candidates = await hydratePackageAvailability(candidates, {
    currentHost,
    brokerHomeDirectory: options.brokerHomeDirectory,
    packageSearchRoots: options.packageSearchRoots
  });
  const failedCandidateFilter = excludeFailedCandidates(
    candidates,
    executionFailures
  );
  candidates = filterExecutionFailureRecoveryCandidates(
    failedCandidateFilter.candidates,
    resolvedRequest.compatibilityIntent,
    executionFailures
  );

  const acquisitionHistoryByCandidateId =
    acquisitionMemoryStore === undefined
      ? undefined
      : await acquisitionMemoryStore.historyByCandidateId(
          resolvedRequest.requestQueryIdentity,
          candidates
        );
  const cacheHistoryByCandidateId =
    exactCachedCard === null
      ? undefined
      : {
          [exactCachedCard.card.id]: {
            cacheHit,
            successfulRoutes: exactCachedCard.successfulRoutes
          }
        };
  const historyByCandidateId = mergeHistoryByCandidateId(
    acquisitionHistoryByCandidateId,
    cacheHistoryByCandidateId
  );
  const { semanticResult, semanticSignal } = resolveSemanticRankingSignal(
    resolvedRequest,
    candidates
  );

  const ranked = rankCapabilities({
    currentHost,
    requestCompatibilityIntent: resolvedRequest.compatibilityIntent,
    requestCapabilityQuery: request.capabilityQuery,
    candidates,
    historyByCandidateId,
    semanticSignal
  });

  if (ranked.length === 0) {
    if (failedCandidateFilter.excludedCandidateIds.length > 0) {
      return createExecutionFailureExhaustedResult(
        failedCandidateFilter.excludedCandidateIds,
        {
          cacheHit,
          cachedCandidateId: exactCachedCard?.card.id,
          candidateCount: 0
        },
        createBrokerRoutingTrace({
          input,
          currentHost,
          resultCode: "PREPARE_FAILED",
          now,
          hostAction: "show_graceful_failure",
          candidateCount: 0,
          reasonCode: "downstream_execution_failed",
          semanticRouting: semanticTraceInput(semanticResult)
        })
      );
    }

    return createNoCandidateResult(
      {
        cacheHit,
        cachedCandidateId: exactCachedCard?.card.id,
        candidateCount: 0
      },
      createBrokerRoutingTrace({
        input,
        currentHost,
        resultCode: "NO_CANDIDATE",
        now,
        hostAction: "offer_capability_discovery",
        candidateCount: 0,
        semanticRouting: semanticTraceInput(semanticResult)
      })
    );
  }

  const winner = ranked[0];
  const winnerReasonCode = requestRoutingReasonCode(winner, resolvedRequest);
  const debug: BrokerDebug = {
    cacheHit,
    cachedCandidateId: exactCachedCard?.card.id,
    candidateCount: ranked.length,
    decision: explainDecision(winner, {
      currentHost,
      requestCompatibilityIntent: resolvedRequest.compatibilityIntent,
      selectionReasonCode: winnerReasonCode,
      history:
        exactCachedCard?.card.id === winner.id
          ? {
              cacheHit,
              successfulRoutes: exactCachedCard.successfulRoutes
            }
          : undefined
    })
  };

  if (failedCandidateFilter.excludedCandidateIds.length > 0) {
    debug.decision = `${debug.decision}; excluded previously failed candidates: ${failedCandidateFilter.excludedCandidateIds.join(", ")}`;
  }

  if (winner.implementation.type === "broker_workflow") {
    let recipe = workflowsById.get(winner.id);

    if (recipe === undefined) {
      const loadedRecipes = await loadHostWorkflowRecipes(
        undefined,
        hostCatalogFilePath
      );
      recipe = loadedRecipes.find((candidate) => candidate.id === winner.id);
    }

    if (recipe !== undefined) {
      await writeWinnerCache(
        cacheStore,
        winner,
        exactCachedCard ?? legacyMatchedCard,
        currentHost,
        resolvedRequest,
        now
      );

      return startWorkflowRun({
        input,
        currentHost,
        now,
        request,
        routingReasonCode: winnerReasonCode,
        winner,
        recipe,
        sessionStore: new WorkflowSessionStore(
          defaultWorkflowSessionFilePath(options)
        ),
        requestQueryIdentity: resolvedRequest.requestQueryIdentity,
        acquisitionMemoryStore,
        brokerHomeDirectory: options.brokerHomeDirectory,
        packageSearchRoots: options.packageSearchRoots,
        debug
      });
    }
  }

  if (!packageInstalled(winner)) {
    return createPackageInstallRequiredResult(
      winner,
      debug,
      createBrokerRoutingTrace({
        input,
        currentHost,
        resultCode: "INSTALL_REQUIRED",
        now,
        hostAction: "offer_package_install",
        candidateCount: ranked.length,
        winner,
        reasonCode: "package_not_installed",
        semanticRouting: semanticTraceInput(semanticResult)
      })
    );
  }

  let prepared;

  try {
    prepared = await prepareCandidate(winner, {
      currentHost
    });
  } catch (error) {
    if (error instanceof PrepareCandidateError) {
      return createFailureResult(
        "PREPARE_FAILED",
        prepareFailureUserMessage(error),
        "show_graceful_failure",
        debug,
        createBrokerRoutingTrace({
          input,
          currentHost,
          resultCode: "PREPARE_FAILED",
          now,
          hostAction: "show_graceful_failure",
          candidateCount: ranked.length,
          winner,
          reasonCode: error.reasonCode,
          semanticRouting: semanticTraceInput(semanticResult)
        }),
        error.message
      );
    }

    return createFailureResult(
      "PREPARE_FAILED",
      prepareFailedMessage(),
      "show_graceful_failure",
      debug,
      createBrokerRoutingTrace({
        input,
        currentHost,
        resultCode: "PREPARE_FAILED",
        now,
        hostAction: "show_graceful_failure",
        candidateCount: ranked.length,
        winner,
        semanticRouting: semanticTraceInput(semanticResult)
      }),
      "Failed to prepare broker handoff."
    );
  }

  const localSkill = await resolveLocalSkillHandoffSource(prepared.candidate, {
    currentHost,
    brokerHomeDirectory: options.brokerHomeDirectory,
    packageSearchRoots: options.packageSearchRoots
  });
  const handoff = buildHandoffEnvelope(
    prepared.candidate,
    prepared.context,
    request,
    prepared.selection,
    localSkill
  );

  await writeWinnerCache(
    cacheStore,
    winner,
    exactCachedCard ?? legacyMatchedCard,
    currentHost,
    resolvedRequest,
    now
  );
  const advisories: BrokerAdvisory[] = [];
  const acquisitionAdvisory = await persistAcquisitionMemoryIfConfigured(
    acquisitionMemoryStore,
    {
      canonicalKey: resolvedRequest.requestQueryIdentity,
      compatibilityIntent: resolvedRequest.compatibilityIntent,
      winner,
      currentHost,
      now
    }
  );
  if (acquisitionAdvisory !== undefined) {
    advisories.push(acquisitionAdvisory);
  }
  const verifiedManifestAdvisory =
    await persistVerifiedDownstreamManifestIfConfigured({
      brokerHomeDirectory: options.brokerHomeDirectory,
      winner,
      currentHost,
      now
    });
  if (verifiedManifestAdvisory !== undefined) {
    advisories.push(verifiedManifestAdvisory);
  }

  const result: BrokerSuccessResult = {
    ok: true,
    winner,
    outcome: {
      code: "HANDOFF_READY",
      message: `Winner ${winner.id} is ready for handoff.`
    },
    handoff,
    ...(advisories.length > 0 ? { advisories } : {}),
    debug,
    trace: createBrokerRoutingTrace({
      input,
      currentHost,
      resultCode: "HANDOFF_READY",
      now,
      hostAction: null,
      candidateCount: ranked.length,
      winner,
      reasonCode: winnerReasonCode,
      semanticRouting: semanticTraceInput(semanticResult)
    })
  };

  return result;
}

export async function runBroker(
  input: NormalizeRequestInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerResult> {
  assertEnvelopeMode(input);
  const currentHost = assertCurrentHost(
    options.currentHost ?? DEFAULT_CURRENT_HOST
  );
  const now = options.now ?? new Date();
  const hostCatalogFilePath =
    options.hostCatalogFilePath ?? defaultHostCatalogFilePath();

  if (isResumeEnvelope(input)) {
    const result = await runWorkflowResume(
      input,
      options,
      currentHost,
      now,
      hostCatalogFilePath
    );

    const traceAdvisory = await persistTraceIfConfigured(
      result.trace,
      options.brokerHomeDirectory
    );
    return traceAdvisory === undefined
      ? result
      : withAdvisories(result, [traceAdvisory]);
  }

  const result = await runSingleStep(input, options, currentHost, now);

  const traceAdvisory = await persistTraceIfConfigured(
    result.trace,
    options.brokerHomeDirectory
  );
  return traceAdvisory === undefined
    ? result
    : withAdvisories(result, [traceAdvisory]);
}
