import type { CapabilityCard } from "../core/capability-card.js";

export type PrepareContext = {
  currentHost: string;
};

export type PrepareCandidateResult = {
  ready: true;
  candidate: CapabilityCard;
  context: PrepareContext;
};

export async function prepareCandidate(
  candidate: CapabilityCard,
  context: PrepareContext
): Promise<PrepareCandidateResult> {
  return {
    ready: true,
    candidate,
    context
  };
}
