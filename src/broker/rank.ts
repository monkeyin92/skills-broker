import type { CapabilityCard } from "../core/capability-card.js";
import type {
  BrokerIntent,
  CapabilityQuery,
  CapabilityQueryTargetType
} from "../core/types.js";

export type RoutingHistory = {
  cacheHit?: boolean;
  successfulRoutes?: number;
};

export type RankCapabilitiesInput = {
  currentHost: string;
  requestIntent: BrokerIntent;
  candidates: CapabilityCard[];
  requestCapabilityQuery?: CapabilityQuery;
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

function overlapScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  let score = 0;

  for (let index = 0; index < left.length; index += 1) {
    if (rightSet.has(left[index])) {
      score += 1;
    }
  }

  return score;
}

function queryTargetTypes(query: CapabilityQuery): CapabilityQueryTargetType[] {
  if (query.targets === undefined) {
    return [];
  }

  return Array.from(new Set(query.targets.map((target) => target.type)));
}

function preferredCapabilityScore(
  card: CapabilityCard,
  preferredCapability: string | null | undefined
): number {
  if (preferredCapability === undefined || preferredCapability === null) {
    return 0;
  }

  const preferredNames = new Set([
    card.id,
    card.leaf.capabilityId,
    card.leaf.subskillId,
    card.implementation.id,
    ...(card.leaf.probe?.manifestNames ?? []),
    ...(card.leaf.probe?.aliases ?? [])
  ]);

  return preferredNames.has(preferredCapability) ? 1 : 0;
}

export function capabilityQueryScore(
  card: CapabilityCard,
  query: CapabilityQuery | undefined
): number {
  if (query === undefined) {
    return 0;
  }

  return (
    preferredCapabilityScore(card, query.preferredCapability) * 100 +
    overlapScore(card.query.jobFamilies, query.jobFamilies ?? []) * 10 +
    overlapScore(card.query.targetTypes, queryTargetTypes(query)) * 4 +
    overlapScore(card.query.artifacts, query.artifacts ?? []) * 3
  );
}

export function hasCapabilityQueryMatch(
  card: CapabilityCard,
  query: CapabilityQuery | undefined
): boolean {
  return capabilityQueryScore(card, query) > 0;
}

function compareCards(
  left: CapabilityCard,
  right: CapabilityCard,
  input: RankCapabilitiesInput
): number {
  if (left.hosts.currentHostSupported !== right.hosts.currentHostSupported) {
    return left.hosts.currentHostSupported ? -1 : 1;
  }

  const leftQueryScore = capabilityQueryScore(left, input.requestCapabilityQuery);
  const rightQueryScore = capabilityQueryScore(right, input.requestCapabilityQuery);

  if (leftQueryScore !== rightQueryScore) {
    return rightQueryScore - leftQueryScore;
  }

  const leftInstalled = left.package.installState === "installed" ? 1 : 0;
  const rightInstalled = right.package.installState === "installed" ? 1 : 0;

  if (leftInstalled !== rightInstalled) {
    return rightInstalled - leftInstalled;
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
