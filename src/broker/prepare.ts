import type { CapabilityCard } from "../core/capability-card.js";
import type { CapabilitySelection } from "./selection.js";
import { buildCapabilitySelection } from "./selection.js";

export type PrepareContext = {
  currentHost: string;
  selectionMode?: "explicit";
};

export type PrepareCandidateResult = {
  ready: true;
  candidate: CapabilityCard;
  selection: CapabilitySelection;
  context: PrepareContext;
};

export async function prepareCandidate(
  candidate: CapabilityCard,
  context: PrepareContext
): Promise<PrepareCandidateResult> {
  if (!candidate.hosts.currentHostSupported) {
    throw new Error(
      `Candidate "${candidate.id}" is not supported on host "${context.currentHost}".`
    );
  }

  if (
    candidate.package.installState !== "installed" ||
    candidate.prepare.installRequired
  ) {
    throw new Error(
      `Candidate "${candidate.id}" is not ready for handoff because package "${candidate.package.packageId}" is not installed.`
    );
  }

  const selection = buildCapabilitySelection(candidate);

  return {
    ready: true,
    candidate,
    selection,
    context: {
      ...context,
      selectionMode: "explicit"
    }
  };
}
