import type {
  BrokerIntent,
  CapabilityImplementationType,
  CapabilityOwnershipSurface
} from "./types.js";

export type CapabilityCardKind = "skill" | "mcp";

export type CapabilityImplementation = {
  id: string;
  type: CapabilityImplementationType;
  ownerSurface: CapabilityOwnershipSurface;
};

export type CapabilityCard = {
  id: string;
  kind: CapabilityCardKind;
  label: string;
  intent: BrokerIntent;
  implementation: CapabilityImplementation;
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
  implementation?: Partial<CapabilityImplementation>;
  sourceMetadata?: Record<string, unknown>;
};

function defaultImplementationType(
  kind: CapabilityCardKind
): CapabilityImplementationType {
  return kind === "skill" ? "local_skill" : "mcp_server";
}

export function toCapabilityCard(candidate: CapabilityCandidate): CapabilityCard {
  const kind = candidate.kind;
  const implementation: CapabilityImplementation = {
    id: candidate.implementation?.id ?? candidate.id,
    type: candidate.implementation?.type ?? defaultImplementationType(kind),
    ownerSurface:
      candidate.implementation?.ownerSurface ?? "broker_owned_downstream"
  };

  return {
    id: candidate.id,
    kind,
    label: candidate.label,
    intent: candidate.intent,
    implementation,
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
    sourceMetadata: candidate.sourceMetadata ?? {}
  };
}
