import type { CapabilityCard } from "../core/capability-card.js";
import type { CapabilitySelection } from "./selection.js";
import { buildCapabilitySelection } from "./selection.js";

export type PrepareCandidateFailureReason =
  | "host_not_supported"
  | "package_not_installed"
  | "installed_leaf_not_verified"
  | "candidate_selection_invalid";

export type PrepareContext = {
  currentHost: string;
  selectionMode?: "explicit";
};

export class PrepareCandidateError extends Error {
  readonly code = "PREPARE_FAILED" as const;
  readonly reasonCode: PrepareCandidateFailureReason;
  readonly userMessage: string;

  constructor(
    reasonCode: PrepareCandidateFailureReason,
    message: string,
    userMessage = message
  ) {
    super(message);
    this.name = "PrepareCandidateError";
    this.reasonCode = reasonCode;
    this.userMessage = userMessage;
  }
}

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
    throw new PrepareCandidateError(
      "host_not_supported",
      `Candidate "${candidate.id}" is not supported on host "${context.currentHost}".`
    );
  }

  if (candidate.package.installState !== "installed") {
    throw new PrepareCandidateError(
      "package_not_installed",
      `Candidate "${candidate.id}" is not ready for handoff because package "${candidate.package.packageId}" is not installed.`
    );
  }

  if (candidate.prepare.installRequired) {
    throw new PrepareCandidateError(
      "installed_leaf_not_verified",
      `Package "${candidate.package.packageId}" looks installed, but the leaf "${candidate.leaf.capabilityId}" could not be verified for handoff.`
    );
  }

  let selection: CapabilitySelection;

  try {
    selection = buildCapabilitySelection(candidate);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed broker handoff validation.";

    throw new PrepareCandidateError(
      "candidate_selection_invalid",
      message,
      `Candidate "${candidate.id}" failed broker handoff validation after installation.`
    );
  }

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
