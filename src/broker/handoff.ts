import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerRequest } from "../core/types.js";

export type HandoffContext = {
  currentHost: string;
};

export type HandoffEnvelope = {
  brokerDone: true;
  candidate: CapabilityCard;
  chosenPackage: CapabilityCard["package"];
  chosenLeafCapability: CapabilityCard["leaf"];
  chosenImplementation: CapabilityCard["implementation"];
  context: HandoffContext;
  request: BrokerRequest;
};

export function buildHandoffEnvelope(
  candidate: CapabilityCard,
  context: HandoffContext,
  request: BrokerRequest
): HandoffEnvelope {
  return {
    brokerDone: true,
    candidate,
    chosenPackage: candidate.package,
    chosenLeafCapability: candidate.leaf,
    chosenImplementation: candidate.implementation,
    context,
    request
  };
}
