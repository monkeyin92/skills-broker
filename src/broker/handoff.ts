import type { CapabilityCard } from "../core/capability-card";

export type HandoffContext = {
  currentHost: string;
};

export type HandoffEnvelope = {
  brokerDone: true;
  candidate: CapabilityCard;
  context: HandoffContext;
};

export function buildHandoffEnvelope(
  candidate: CapabilityCard,
  context: HandoffContext
): HandoffEnvelope {
  return {
    brokerDone: true,
    candidate,
    context
  };
}
