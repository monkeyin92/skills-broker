import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { discoverCandidates } from "./discover.js";
import { explainDecision } from "./explain.js";
import { buildHandoffEnvelope } from "./handoff.js";
import { hydratePackageAvailability } from "./package-availability.js";
import { prepareCandidate } from "./prepare.js";
import {
  legacyIntentCacheKey,
  requestRoutingReasonCode,
  resolveBrokerRequest,
  type ResolvedBrokerRequest
} from "./resolved-request.js";
import {
  hasCapabilityQueryMatch,
  rankCapabilities
} from "./rank.js";
import {
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
  PackageAcquisitionHint
} from "../core/types.js";
import { BROKER_HOSTS, isBrokerHost } from "../core/types.js";
import {
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
): Promise<void> {
  if (brokerHomeDirectory === undefined) {
    return;
  }

  try {
    await appendBrokerRoutingTrace(
      routingTraceLogFilePath(brokerHomeDirectory),
      trace
    );
  } catch {
    // Trace logging must never break broker routing.
  }
}

function createNoCandidateResult(
  debug: BrokerDebug,
  trace: BrokerRoutingTrace
): BrokerFailureResult {
  const message =
    "The broker understood the request, but no installed capability matched it. Offer capability discovery or install help.";
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
      code: "NO_CANDIDATE",
      message: `The broker found a matching capability in package "${winner.package.packageId}", but that package is not installed yet. Offer package discovery or install help for "${winner.leaf.subskillId}".`,
      hostAction: "offer_capability_discovery"
    },
    error: {
      code: "NO_CANDIDATE",
      message: `Package "${winner.package.packageId}" is not installed for capability "${winner.leaf.capabilityId}".`
    },
    acquisition: {
      reason: "package_not_installed",
      package: winner.package,
      leafCapability: winner.leaf
    },
    debug,
    trace
  };
}

function createFailureResult(
  code: Exclude<
    BrokerOutcomeCode,
    "HANDOFF_READY" | "WORKFLOW_STAGE_READY" | "WORKFLOW_BLOCKED" | "WORKFLOW_COMPLETED" | "NO_CANDIDATE"
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

function packageInstalled(card: CapabilityCard): boolean {
  return card.package.installState === "installed";
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

async function discoverCapabilityCards(
  request: ResolvedBrokerRequest,
  hostCatalogFilePath: string,
  mcpRegistryFilePath: string
): Promise<DiscoverySnapshot> {
  const [hostResult, workflowResult, mcpResult] = await Promise.allSettled([
    loadHostSkillCandidates(undefined, hostCatalogFilePath),
    loadHostWorkflowRecipes(undefined, hostCatalogFilePath),
    searchMcpRegistry(
      {
        intent: request.compatibilityIntent,
        capabilityQuery: request.request.capabilityQuery
      },
      mcpRegistryFilePath
    )
  ]);

  if (
    hostResult.status === "rejected" &&
    workflowResult.status === "rejected" &&
    mcpResult.status === "rejected"
  ) {
    throw new AggregateError(
      [hostResult.reason, workflowResult.reason, mcpResult.reason],
      "All discovery sources failed."
    );
  }

  const hostCandidates =
    hostResult.status === "fulfilled" ? hostResult.value : [];
  const workflowRecipes =
    workflowResult.status === "fulfilled" ? workflowResult.value : [];
  const mcpCandidates =
    mcpResult.status === "fulfilled" ? mcpResult.value : [];

  const mergedCandidates = discoverCandidates(
    [
      ...hostCandidates,
      ...workflowRecipes.map((recipe) => workflowCandidate(recipe))
    ],
    mcpCandidates
  )
    .map(toCapabilityCard)
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

  const cachedRecord = await cacheStore.read();
  const exactCachedCard =
    cachedRecord !== null &&
    cacheRecordMatchesQueryIdentity(cachedRecord, resolvedRequest) &&
    isWithinHardTtl(cachedRecord.card, now)
      ? cachedRecord
      : null;
  const legacyMatchedCard =
    exactCachedCard === null &&
    cachedRecord !== null &&
    cachedRecord.requestQueryIdentity === undefined &&
    cacheRecordMatchesLegacyKey(cachedRecord, resolvedRequest) &&
    isWithinHardTtl(cachedRecord.card, now)
      ? cachedRecord
      : null;

  let cacheHit = false;
  let candidates: CapabilityCard[] = [];
  let workflowsById = new Map<string, WorkflowRecipe>();

  if (exactCachedCard !== null && !shouldRefreshToday(exactCachedCard.card, now)) {
    cacheHit = true;
    candidates = [
      {
        ...exactCachedCard.card
      }
    ];
  } else {
    try {
      const discovered = await discoverCapabilityCards(
        resolvedRequest,
        hostCatalogFilePath,
        mcpRegistryFilePath
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

  const ranked = rankCapabilities({
    currentHost,
    requestCompatibilityIntent: resolvedRequest.compatibilityIntent,
    requestCapabilityQuery: request.capabilityQuery,
    candidates,
    historyByCandidateId:
      exactCachedCard === null
        ? undefined
        : {
            [exactCachedCard.card.id]: {
              cacheHit,
              successfulRoutes: exactCachedCard.successfulRoutes
            }
          }
  });

  if (ranked.length === 0) {
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
        candidateCount: 0
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
        resultCode: "NO_CANDIDATE",
        now,
        hostAction: "offer_capability_discovery",
        candidateCount: ranked.length,
        winner
      })
    );
  }

  let prepared;

  try {
    prepared = await prepareCandidate(winner, {
      currentHost
    });
  } catch {
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
        winner
      }),
      "Failed to prepare broker handoff."
    );
  }

  const handoff = buildHandoffEnvelope(
    prepared.candidate,
    prepared.context,
    request,
    prepared.selection
  );

  await writeWinnerCache(
    cacheStore,
    winner,
    exactCachedCard ?? legacyMatchedCard,
    currentHost,
    resolvedRequest,
    now
  );

  const result: BrokerSuccessResult = {
    ok: true,
    winner,
    outcome: {
      code: "HANDOFF_READY",
      message: `Winner ${winner.id} is ready for handoff.`
    },
    handoff,
    debug,
    trace: createBrokerRoutingTrace({
      input,
      currentHost,
      resultCode: "HANDOFF_READY",
      now,
      hostAction: null,
      candidateCount: ranked.length,
      winner,
      reasonCode: winnerReasonCode
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

    await persistTraceIfConfigured(result.trace, options.brokerHomeDirectory);
    return result;
  }

  const result = await runSingleStep(input, options, currentHost, now);

  await persistTraceIfConfigured(result.trace, options.brokerHomeDirectory);
  return result;
}
