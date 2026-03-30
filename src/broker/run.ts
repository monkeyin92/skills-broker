import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildHandoffEnvelope, type HandoffEnvelope } from "./handoff.js";
import { discoverCandidates } from "./discover.js";
import { explainDecision } from "./explain.js";
import { prepareCandidate } from "./prepare.js";
import { rankCapabilities } from "./rank.js";
import { toCapabilityCard, type CapabilityCard } from "../core/capability-card.js";
import {
  handleRefreshFailure,
  isWithinHardTtl,
  shouldRefreshToday
} from "../core/cache/policy.js";
import { FileBackedCacheStore } from "../core/cache/store.js";
import {
  AmbiguousBrokerRequestError,
  normalizeRequest,
  type NormalizeRequestInput,
  UnsupportedBrokerRequestError
} from "../core/request.js";
import type {
  BrokerHostAction,
  BrokerIntent,
  BrokerOutcomeCode
} from "../core/types.js";
import { loadHostSkillCandidates } from "../sources/host-skill-catalog.js";
import { searchMcpRegistry } from "../sources/mcp-registry.js";

type CachedWinnerCard = CapabilityCard & {
  fetchedAt: string;
};

type BrokerCacheRecord = {
  card: CachedWinnerCard;
  lastHost: string;
  requestIntent: BrokerIntent;
  requestCacheKey?: string;
  successfulRoutes: number;
};

type BrokerDebug = {
  cacheHit: boolean;
  cachedCandidateId?: string;
  candidateCount: number;
  decision?: string;
};

type BrokerSuccessResult = {
  ok: true;
  winner: CapabilityCard;
  outcome: {
    code: "HANDOFF_READY";
    message: string;
  };
  handoff: HandoffEnvelope;
  debug: BrokerDebug;
};

type BrokerFailureResult = {
  ok: false;
  outcome: {
    code: Exclude<BrokerOutcomeCode, "HANDOFF_READY">;
    message: string;
    hostAction: BrokerHostAction;
  };
  error: {
    code: Exclude<BrokerOutcomeCode, "HANDOFF_READY">;
    message: string;
  };
  debug: BrokerDebug;
};

export type RunBrokerResult = BrokerSuccessResult | BrokerFailureResult;

export type RunBrokerOptions = {
  cacheFilePath?: string;
  hostCatalogFilePath?: string;
  mcpRegistryFilePath?: string;
  currentHost?: string;
  now?: Date;
};

const DEFAULT_CURRENT_HOST = "claude-code";

function defaultHostCatalogFilePath(): string {
  return join(process.cwd(), "config/host-skills.seed.json");
}

function defaultMcpRegistryFilePath(): string {
  return join(process.cwd(), "config/mcp-registry.seed.json");
}

function defaultCacheFilePath(): string {
  return join(tmpdir(), "skills-broker-cache.json");
}

function createNoCandidateResult(debug: BrokerDebug): BrokerFailureResult {
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
    debug
  };
}

function createFailureResult(
  code: Exclude<BrokerOutcomeCode, "HANDOFF_READY" | "NO_CANDIDATE">,
  message: string,
  hostAction: BrokerHostAction,
  debug: BrokerDebug,
  errorMessage = message
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
    debug
  };
}

async function discoverCapabilityCards(
  intent: BrokerIntent,
  hostCatalogFilePath: string,
  mcpRegistryFilePath: string
): Promise<CapabilityCard[]> {
  const [hostResult, mcpResult] = await Promise.allSettled([
    loadHostSkillCandidates(intent, hostCatalogFilePath),
    searchMcpRegistry(intent, mcpRegistryFilePath)
  ]);

  if (hostResult.status === "rejected" && mcpResult.status === "rejected") {
    throw new AggregateError(
      [hostResult.reason, mcpResult.reason],
      "All discovery sources failed."
    );
  }

  const hostCandidates =
    hostResult.status === "fulfilled" ? hostResult.value : [];
  const mcpCandidates =
    mcpResult.status === "fulfilled" ? mcpResult.value : [];

  return discoverCandidates(hostCandidates, mcpCandidates).map(toCapabilityCard);
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

function stableListKey(values: string[] | undefined): string {
  return (values ?? []).slice().sort().join(",");
}

function buildRequestCacheKey(request: {
  intent: BrokerIntent;
  capabilityQuery?: {
    jobFamilies?: string[];
    artifacts?: string[];
    preferredCapability?: string | null;
    targets?: Array<{ type: string }>;
  };
}): string {
  if (request.capabilityQuery === undefined) {
    return `intent:${request.intent}`;
  }

  const targetTypes = stableListKey(
    request.capabilityQuery.targets?.map((target) => target.type)
  );

  return [
    `intent:${request.intent}`,
    `families:${stableListKey(request.capabilityQuery.jobFamilies)}`,
    `artifacts:${stableListKey(request.capabilityQuery.artifacts)}`,
    `targetTypes:${targetTypes}`,
    `preferred:${request.capabilityQuery.preferredCapability ?? ""}`
  ].join("|");
}

export async function runBroker(
  input: NormalizeRequestInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerResult> {
  const currentHost = options.currentHost ?? DEFAULT_CURRENT_HOST;
  const now = options.now ?? new Date();
  const cacheStore = new FileBackedCacheStore<BrokerCacheRecord>(
    options.cacheFilePath ?? defaultCacheFilePath()
  );
  const hostCatalogFilePath =
    options.hostCatalogFilePath ?? defaultHostCatalogFilePath();
  const mcpRegistryFilePath =
    options.mcpRegistryFilePath ?? defaultMcpRegistryFilePath();
  let request;

  try {
    request = normalizeRequest(input);
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
        error.message
      );
    }

    throw error;
  }

  const requestCacheKey = buildRequestCacheKey(request);

  const cachedRecord = await cacheStore.read();
  const cachedCard =
    cachedRecord !== null &&
    cachedRecord.requestIntent === request.intent &&
    (cachedRecord.requestCacheKey ?? `intent:${cachedRecord.requestIntent}`) ===
      requestCacheKey &&
    isWithinHardTtl(cachedRecord.card, now)
      ? cachedRecord
      : null;

  let cacheHit = false;
  let candidates: CapabilityCard[] = [];

  if (cachedCard !== null && !shouldRefreshToday(cachedCard.card, now)) {
    cacheHit = true;
    candidates = [
      {
        ...cachedCard.card
      }
    ];
  } else {
    try {
      candidates = await discoverCapabilityCards(
        request.intent,
        hostCatalogFilePath,
        mcpRegistryFilePath
      );
    } catch (error) {
      if (cachedCard !== null) {
        const action = handleRefreshFailure(cachedCard.card);

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

  const ranked = rankCapabilities({
    currentHost,
    requestIntent: request.intent,
    requestCapabilityQuery: request.capabilityQuery,
    candidates,
    historyByCandidateId:
      cachedCard === null
        ? undefined
        : {
            [cachedCard.card.id]: {
              cacheHit,
              successfulRoutes: cachedCard.successfulRoutes
            }
          }
  });

  if (ranked.length === 0) {
    return createNoCandidateResult({
      cacheHit,
      cachedCandidateId: cachedCard?.card.id,
      candidateCount: 0
    });
  }

  const winner = ranked[0];
  const decision = explainDecision(winner, {
    currentHost,
    requestIntent: request.intent,
    history:
      cachedCard?.card.id === winner.id
        ? {
            cacheHit,
            successfulRoutes: cachedCard.successfulRoutes
          }
        : undefined
  });
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
      {
        cacheHit,
        cachedCandidateId: cachedCard?.card.id,
        candidateCount: ranked.length,
        decision
      },
      "Failed to prepare broker handoff."
    );
  }

  const handoff = buildHandoffEnvelope(
    prepared.candidate,
    prepared.context,
    request
  );

  await cacheStore.write({
    card: {
      ...winner,
      fetchedAt: now.toISOString()
    },
    lastHost: currentHost,
    requestIntent: request.intent,
    requestCacheKey,
    successfulRoutes:
      cachedCard?.card.id === winner.id ? cachedCard.successfulRoutes + 1 : 1
  });

  return {
    ok: true,
    winner,
    outcome: {
      code: "HANDOFF_READY",
      message: `Winner ${winner.id} is ready for handoff.`
    },
    handoff,
    debug: {
      cacheHit,
      cachedCandidateId: cachedCard?.card.id,
      candidateCount: ranked.length,
      decision
    }
  };
}
