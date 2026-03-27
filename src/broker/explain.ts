import type { CapabilityCard } from "../core/capability-card";
import type { BrokerIntent } from "../core/types";
import type { RoutingHistory } from "./rank";

export type ExplainDecisionInput = {
  currentHost: string;
  requestIntent: BrokerIntent;
  history?: RoutingHistory;
};

function preparationBurden(card: CapabilityCard): number {
  return Number(card.prepare.authRequired) + Number(card.prepare.installRequired);
}

export function explainDecision(
  card: CapabilityCard,
  input: ExplainDecisionInput
): string {
  const history = input.history;
  const cacheReuse = history?.cacheHit ? "cache hit" : "no cache hit";
  const successfulRoutes = history?.successfulRoutes ?? 0;
  const intentMatch = card.intent === input.requestIntent ? "match" : "mismatch";
  const hostSupport = card.hosts.currentHostSupported ? "supported" : "unsupported";

  return [
    `current host ${input.currentHost} selected ${card.label}`,
    `current host support: ${hostSupport}`,
    `intent: ${intentMatch} for ${input.requestIntent}`,
    `preparation burden: ${preparationBurden(card)}`,
    `context cost: ${card.ranking.contextCost}`,
    `cache reuse: ${cacheReuse}, successful routing history: ${successfulRoutes}`,
    `portability bonus: ${card.hosts.portabilityScore}`
  ].join("; ");
}
