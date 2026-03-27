import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerIntent } from "../core/types.js";

export type RoutingHistory = {
  cacheHit?: boolean;
  successfulRoutes?: number;
};

export type RankCapabilitiesInput = {
  currentHost: string;
  requestIntent: BrokerIntent;
  candidates: CapabilityCard[];
  historyByCandidateId?: Record<string, RoutingHistory>;
};

function preparationBurden(card: CapabilityCard): number {
  return Number(card.prepare.authRequired) + Number(card.prepare.installRequired);
}

function historyScore(history: RoutingHistory | undefined): {
  cacheHit: number;
  successfulRoutes: number;
} {
  return {
    cacheHit: history?.cacheHit ? 1 : 0,
    successfulRoutes: history?.successfulRoutes ?? 0
  };
}

function compareCards(
  left: CapabilityCard,
  right: CapabilityCard,
  input: RankCapabilitiesInput
): number {
  if (left.hosts.currentHostSupported !== right.hosts.currentHostSupported) {
    return left.hosts.currentHostSupported ? -1 : 1;
  }

  const leftIntentMatch = left.intent === input.requestIntent ? 1 : 0;
  const rightIntentMatch = right.intent === input.requestIntent ? 1 : 0;

  if (leftIntentMatch !== rightIntentMatch) {
    return rightIntentMatch - leftIntentMatch;
  }

  const leftBurden = preparationBurden(left);
  const rightBurden = preparationBurden(right);

  if (leftBurden !== rightBurden) {
    return leftBurden - rightBurden;
  }

  if (left.ranking.contextCost !== right.ranking.contextCost) {
    return left.ranking.contextCost - right.ranking.contextCost;
  }

  const leftHistory = historyScore(input.historyByCandidateId?.[left.id]);
  const rightHistory = historyScore(input.historyByCandidateId?.[right.id]);

  if (leftHistory.cacheHit !== rightHistory.cacheHit) {
    return rightHistory.cacheHit - leftHistory.cacheHit;
  }

  if (leftHistory.successfulRoutes !== rightHistory.successfulRoutes) {
    return rightHistory.successfulRoutes - leftHistory.successfulRoutes;
  }

  if (left.hosts.portabilityScore !== right.hosts.portabilityScore) {
    return right.hosts.portabilityScore - left.hosts.portabilityScore;
  }

  return left.id.localeCompare(right.id);
}

export function rankCapabilities(
  input: RankCapabilitiesInput
): CapabilityCard[] {
  return input.candidates
    .filter((candidate) => candidate.hosts.currentHostSupported)
    .sort((left, right) => compareCards(left, right, input));
}

export const rankCandidates = rankCapabilities;
