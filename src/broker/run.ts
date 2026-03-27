import { join } from "node:path";
import { buildHandoffEnvelope, type HandoffEnvelope } from "./handoff";
import { discoverCandidates } from "./discover";
import { explainDecision } from "./explain";
import { prepareCandidate } from "./prepare";
import { rankCapabilities } from "./rank";
import { toCapabilityCard, type CapabilityCard } from "../core/capability-card";
import {
  handleRefreshFailure,
  isWithinHardTtl,
  shouldRefreshToday
} from "../core/cache/policy";
import { FileBackedCacheStore } from "../core/cache/store";
import { normalizeRequest, type NormalizeRequestInput } from "../core/request";
import type { BrokerIntent, BrokerOutcomeCode } from "../core/types";
import { loadHostSkillCandidates } from "../sources/host-skill-catalog";
import { searchMcpRegistry } from "../sources/mcp-registry";

type CachedWinnerCard = CapabilityCard & {
  fetchedAt: string;
};

type BrokerCacheRecord = {
  card: CachedWinnerCard;
  currentHost: string;
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

const DEFAULT_CURRENT_HOST = "codex";

function defaultHostCatalogFilePath(): string {
  return join(process.cwd(), "tests/fixtures/host-skill-catalog.json");
}

function defaultMcpRegistryFilePath(): string {
  return join(process.cwd(), "tests/fixtures/mcp-registry/search-response.json");
}

function defaultCacheFilePath(): string {
  return join(process.cwd(), ".skills-broker-cache.json");
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
  const [hostCandidates, mcpCandidates] = await Promise.all([
    loadHostSkillCandidates(intent, hostCatalogFilePath),
    searchMcpRegistry(intent, mcpRegistryFilePath)
  ]);

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
    cachedRecord.currentHost === currentHost &&
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
  const handoff = buildHandoffEnvelope(prepared.candidate, prepared.context);

  await cacheStore.write({
    card: {
      ...winner,
      fetchedAt: now.toISOString()
    },
    currentHost,
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
