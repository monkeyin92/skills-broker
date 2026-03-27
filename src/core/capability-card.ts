import type { BrokerIntent } from "./types";

export type CapabilityCardKind = "skill" | "mcp";

export type CapabilityCard = {
  id: string;
  kind: CapabilityCardKind;
  label: string;
  intent: BrokerIntent;
  hosts: {
    currentHostSupported: boolean;
    portabilityScore: number;
  };
  prepare: {
    authRequired: boolean;
    installRequired: boolean;
  };
  ranking: {
    contextCost: number;
    confidence: number;
  };
  sourceMetadata: Record<string, unknown>;
};

export type CapabilityCandidate = {
  kind: CapabilityCardKind;
  id: string;
  label: string;
  intent: BrokerIntent;
};

export function toCapabilityCard(candidate: CapabilityCandidate): CapabilityCard {
  const kind = candidate.kind;

  return {
    id: candidate.id,
    kind,
    label: candidate.label,
    intent: candidate.intent,
    hosts: {
      currentHostSupported: true,
      portabilityScore: kind === "skill" ? 1 : 0
    },
    prepare: {
      authRequired: false,
      installRequired: kind === "mcp"
    },
    ranking: {
      contextCost: kind === "skill" ? 0 : 1,
      confidence: 1
    },
    sourceMetadata: {}
  };
}
