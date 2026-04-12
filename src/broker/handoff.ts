import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerRequest } from "../core/types.js";
import type { CapabilitySelection } from "./selection.js";
import { buildCapabilitySelection } from "./selection.js";

export type HandoffContext = {
  currentHost: string;
  selectionMode?: "explicit";
  workflow?: {
    workflowId: string;
    runId: string;
    stageId: string;
  };
};

export type HandoffEnvelope = {
  brokerDone: true;
  candidate: CapabilityCard;
  selection: CapabilitySelection;
  chosenPackage: CapabilityCard["package"];
  chosenLeafCapability: CapabilityCard["leaf"];
  chosenImplementation: CapabilityCard["implementation"];
  context: HandoffContext;
  request: BrokerRequest;
};

export function buildHandoffEnvelope(
  candidate: CapabilityCard,
  context: HandoffContext,
  request: BrokerRequest,
  selection = buildCapabilitySelection(candidate)
): HandoffEnvelope {
  return {
    brokerDone: true,
    candidate,
    selection,
    chosenPackage: selection.package,
    chosenLeafCapability: selection.leafCapability,
    chosenImplementation: selection.implementation,
    context: {
      ...context,
      selectionMode: "explicit"
    },
    request
  };
}
