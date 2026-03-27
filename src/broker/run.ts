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
import { normalizeRequest, type NormalizeRequestInput } from "../core/request.js";
import type { BrokerIntent, BrokerOutcomeCode } from "../core/types.js";
import { loadHostSkillCandidates } from "../sources/host-skill-catalog.js";
import { searchMcpRegistry } from "../sources/mcp-registry.js";

type CachedWinnerCard = CapabilityCard & {
  fetchedAt: string;
};

type BrokerCacheRecord = {
  card: CachedWinnerCard;
  lastHost: string;
  requestIntent: BrokerIntent;
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
  const message = "No candidate matched the normalized broker request.";

  return {
    ok: false,
    outcome: {
      code: "NO_CANDIDATE",
      message
    },
    error: {
      code: "NO_CANDIDATE",
      message
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

export async function runBroker(
  input: NormalizeRequestInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerResult> {
  const request = normalizeRequest(input);
  const currentHost = options.currentHost ?? DEFAULT_CURRENT_HOST;
  const now = options.now ?? new Date();
  const cacheStore = new FileBackedCacheStore<BrokerCacheRecord>(
    options.cacheFilePath ?? defaultCacheFilePath()
  );
  const hostCatalogFilePath =
    options.hostCatalogFilePath ?? defaultHostCatalogFilePath();
  const mcpRegistryFilePath =
    options.mcpRegistryFilePath ?? defaultMcpRegistryFilePath();

  const cachedRecord = await cacheStore.read();
  const cachedCard =
    cachedRecord !== null &&
    cachedRecord.requestIntent === request.intent &&
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
  const prepared = await prepareCandidate(winner, {
    currentHost
  });
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
