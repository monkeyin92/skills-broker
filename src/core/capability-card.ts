import type { BrokerIntent } from "./types";

export type CapabilityCardKind = "skill" | "mcp";

export type CapabilityCard = {
  id: string;
  kind: CapabilityCardKind;
  label: string;
  intent: BrokerIntent | string;
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
  id: string;
  label: string;
  intent: BrokerIntent | string;
};

export function toCapabilityCard(candidate: CapabilityCandidate): CapabilityCard {
  const kind = candidate.id.startsWith("mcp-") ? "mcp" : "skill";

  return {
    id: candidate.id,
    kind,
    label: candidate.label,
    intent: candidate.intent,
    hosts: {
      currentHostSupported: kind === "skill",
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
