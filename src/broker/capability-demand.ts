import type { BrokerRoutingTrace } from "./trace.js";
import type { AcquisitionMemoryEntry } from "./acquisition-memory.js";

export type CapabilityDemandState =
  | "proven_demand"
  | "speculative_advisory"
  | "blocked_acquisition"
  | "stale_metadata"
  | "ready_for_promotion"
  | "satisfied_local_winner";

export type CapabilityDemandNextAction =
  | "install"
  | "verify"
  | "rerun"
  | "refresh_metadata"
  | "promote"
  | "prefer_verified_winner";

export type CapabilityDemandOpportunity = {
  key: string;
  label: string;
  state: CapabilityDemandState;
  nextAction: CapabilityDemandNextAction;
  recentDemand: number;
  totalDemand: number;
  installRequired: number;
  noCandidate: number;
  successfulRoutes: number;
  repeatUsages: number;
  crossHostReuses: number;
  degradedAcquisitions: number;
  failedAcquisitions: number;
  latestDemandAt?: string;
  latestVerifiedAt?: string;
  hosts: string[];
  evidence: Array<"routing_trace" | "install_required" | "no_candidate" | "acquisition_memory" | "verified_winner">;
};

export type CapabilityDemandSummary = {
  windowDays: number;
  status: "active" | "stale" | "missing";
  totals: {
    opportunities: number;
    recentDemand: number;
    provenDemand: number;
    speculativeAdvisory: number;
    blockedAcquisition: number;
    staleMetadata: number;
    readyForPromotion: number;
    satisfiedLocalWinners: number;
  };
  nextAction: CapabilityDemandNextAction;
  opportunities: CapabilityDemandOpportunity[];
};

type MutableOpportunity = Omit<CapabilityDemandOpportunity, "state" | "nextAction" | "hosts" | "evidence"> & {
  hosts: Set<string>;
  evidence: Set<CapabilityDemandOpportunity["evidence"][number]>;
  hasRecentDemand: boolean;
  hasRecentSuccess: boolean;
};

type SummarizeCapabilityDemandInput = {
  traces: BrokerRoutingTrace[];
  acquisitionEntries: AcquisitionMemoryEntry[];
  since: Date;
  windowDays: number;
};

function opportunityKeyForTrace(trace: BrokerRoutingTrace): string | undefined {
  return (
    trace.selectedCapabilityId ??
    trace.winnerId ??
    trace.semanticMatchCandidateId ??
    trace.requestedProofFamily ??
    undefined
  );
}

function opportunityLabelForTrace(trace: BrokerRoutingTrace, key: string): string {
  return trace.selectedCapabilityId ?? trace.winnerId ?? trace.requestedProofFamily ?? key;
}

function opportunityKeyForEntry(entry: AcquisitionMemoryEntry): string {
  return entry.leafCapabilityId || entry.candidateId;
}

function latestTimestamp(left: string | undefined, right: string | undefined): string | undefined {
  if (right === undefined) {
    return left;
  }

  if (left === undefined) {
    return right;
  }

  return new Date(right) > new Date(left) ? right : left;
}

function getOrCreateOpportunity(
  opportunities: Map<string, MutableOpportunity>,
  key: string,
  label: string
): MutableOpportunity {
  const existing = opportunities.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const created: MutableOpportunity = {
    key,
    label,
    recentDemand: 0,
    totalDemand: 0,
    installRequired: 0,
    noCandidate: 0,
    successfulRoutes: 0,
    repeatUsages: 0,
    crossHostReuses: 0,
    degradedAcquisitions: 0,
    failedAcquisitions: 0,
    hosts: new Set(),
    evidence: new Set(),
    hasRecentDemand: false,
    hasRecentSuccess: false
  };
  opportunities.set(key, created);
  return created;
}

function stateForOpportunity(opportunity: MutableOpportunity): CapabilityDemandState {
  if (opportunity.degradedAcquisitions > 0 || opportunity.failedAcquisitions > 0) {
    return "blocked_acquisition";
  }

  if (opportunity.installRequired > 0 && opportunity.successfulRoutes === 0) {
    return opportunity.hasRecentDemand ? "blocked_acquisition" : "stale_metadata";
  }

  if (!opportunity.hasRecentDemand && opportunity.totalDemand > 0) {
    return "stale_metadata";
  }

  if (opportunity.successfulRoutes > 0) {
    if (opportunity.repeatUsages > 0 || opportunity.crossHostReuses > 0) {
      return "ready_for_promotion";
    }

    return "satisfied_local_winner";
  }

  if (opportunity.noCandidate > 0) {
    return opportunity.noCandidate > 1 ? "proven_demand" : "speculative_advisory";
  }

  return opportunity.hasRecentDemand ? "proven_demand" : "speculative_advisory";
}

function nextActionForState(state: CapabilityDemandState): CapabilityDemandNextAction {
  switch (state) {
    case "blocked_acquisition":
      return "verify";
    case "stale_metadata":
      return "refresh_metadata";
    case "ready_for_promotion":
      return "promote";
    case "satisfied_local_winner":
      return "prefer_verified_winner";
    case "proven_demand":
      return "install";
    case "speculative_advisory":
      return "rerun";
  }
}

function priorityForState(state: CapabilityDemandState): number {
  switch (state) {
    case "blocked_acquisition":
      return 0;
    case "proven_demand":
      return 1;
    case "stale_metadata":
      return 2;
    case "ready_for_promotion":
      return 3;
    case "satisfied_local_winner":
      return 4;
    case "speculative_advisory":
      return 5;
  }
}

function summaryStatus(opportunities: CapabilityDemandOpportunity[]): CapabilityDemandSummary["status"] {
  if (opportunities.length === 0) {
    return "missing";
  }

  if (opportunities.some((opportunity) => opportunity.recentDemand > 0)) {
    return "active";
  }

  return "stale";
}

export function summarizeCapabilityDemand(
  input: SummarizeCapabilityDemandInput
): CapabilityDemandSummary {
  const opportunities = new Map<string, MutableOpportunity>();

  for (const trace of input.traces) {
    if (
      trace.hostDecision !== "broker_first" ||
      trace.resultCode === "HOST_SKIPPED_BROKER" ||
      (trace.resultCode !== "INSTALL_REQUIRED" &&
        trace.resultCode !== "NO_CANDIDATE" &&
        trace.resultCode !== "HANDOFF_READY")
    ) {
      continue;
    }

    const key = opportunityKeyForTrace(trace);
    if (key === undefined) {
      continue;
    }

    const isRecent = new Date(trace.timestamp) >= input.since;
    const opportunity = getOrCreateOpportunity(
      opportunities,
      key,
      opportunityLabelForTrace(trace, key)
    );
    opportunity.totalDemand += 1;
    opportunity.latestDemandAt = latestTimestamp(opportunity.latestDemandAt, trace.timestamp);
    opportunity.hosts.add(trace.host);
    opportunity.evidence.add("routing_trace");

    if (isRecent) {
      opportunity.recentDemand += 1;
      opportunity.hasRecentDemand = true;
    }

    if (trace.resultCode === "INSTALL_REQUIRED") {
      opportunity.installRequired += 1;
      opportunity.evidence.add("install_required");
    }

    if (trace.resultCode === "NO_CANDIDATE") {
      opportunity.noCandidate += 1;
      opportunity.evidence.add("no_candidate");
    }

    if (trace.resultCode === "HANDOFF_READY") {
      opportunity.hasRecentSuccess = opportunity.hasRecentSuccess || isRecent;
      opportunity.evidence.add("verified_winner");
    }
  }

  for (const entry of input.acquisitionEntries) {
    const key = opportunityKeyForEntry(entry);
    const opportunity = getOrCreateOpportunity(opportunities, key, entry.leafCapabilityId);
    opportunity.successfulRoutes += entry.successfulRoutes;
    opportunity.repeatUsages += entry.outcomes.repeatUsages;
    opportunity.crossHostReuses += entry.outcomes.crossHostReuses;
    opportunity.degradedAcquisitions += entry.outcomes.degradedAcquisitions;
    opportunity.failedAcquisitions += entry.outcomes.failedAcquisitions;
    opportunity.latestVerifiedAt = latestTimestamp(opportunity.latestVerifiedAt, entry.verifiedAt);
    opportunity.latestDemandAt = latestTimestamp(opportunity.latestDemandAt, entry.verifiedAt);
    opportunity.totalDemand += entry.successfulRoutes;
    opportunity.evidence.add("acquisition_memory");
    for (const host of entry.verifiedHosts) {
      opportunity.hosts.add(host);
    }

    if (new Date(entry.verifiedAt) >= input.since) {
      opportunity.recentDemand += entry.successfulRoutes;
      opportunity.hasRecentDemand = true;
    }
  }

  const resolved = Array.from(opportunities.values()).map((opportunity) => {
    const state = stateForOpportunity(opportunity);
    return {
      key: opportunity.key,
      label: opportunity.label,
      state,
      nextAction: nextActionForState(state),
      recentDemand: opportunity.recentDemand,
      totalDemand: opportunity.totalDemand,
      installRequired: opportunity.installRequired,
      noCandidate: opportunity.noCandidate,
      successfulRoutes: opportunity.successfulRoutes,
      repeatUsages: opportunity.repeatUsages,
      crossHostReuses: opportunity.crossHostReuses,
      degradedAcquisitions: opportunity.degradedAcquisitions,
      failedAcquisitions: opportunity.failedAcquisitions,
      latestDemandAt: opportunity.latestDemandAt,
      latestVerifiedAt: opportunity.latestVerifiedAt,
      hosts: Array.from(opportunity.hosts).sort(),
      evidence: Array.from(opportunity.evidence).sort()
    } satisfies CapabilityDemandOpportunity;
  }).sort((left, right) => {
    const priorityDelta = priorityForState(left.state) - priorityForState(right.state);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (left.recentDemand !== right.recentDemand) {
      return right.recentDemand - left.recentDemand;
    }

    return left.label.localeCompare(right.label);
  });

  const totals = {
    opportunities: resolved.length,
    recentDemand: resolved.reduce((total, opportunity) => total + opportunity.recentDemand, 0),
    provenDemand: resolved.filter((opportunity) => opportunity.state === "proven_demand").length,
    speculativeAdvisory: resolved.filter((opportunity) => opportunity.state === "speculative_advisory").length,
    blockedAcquisition: resolved.filter((opportunity) => opportunity.state === "blocked_acquisition").length,
    staleMetadata: resolved.filter((opportunity) => opportunity.state === "stale_metadata").length,
    readyForPromotion: resolved.filter((opportunity) => opportunity.state === "ready_for_promotion").length,
    satisfiedLocalWinners: resolved.filter((opportunity) => opportunity.state === "satisfied_local_winner").length
  };
  const status = summaryStatus(resolved);
  const topOpportunity = resolved[0];

  return {
    windowDays: input.windowDays,
    status,
    totals,
    nextAction:
      topOpportunity?.nextAction ??
      (status === "stale" ? "refresh_metadata" : "rerun"),
    opportunities: resolved
  };
}
