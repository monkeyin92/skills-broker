import type { CapabilityCard } from "../core/capability-card.js";
import type { PackageAcquisitionHint } from "../core/types.js";
import type { AcquisitionMemoryEntry } from "./acquisition-memory.js";
import { describeCapabilityTrust } from "./capability-trust.js";

export type CapabilityGrowthStage =
  | "install_required"
  | "verified_handoff"
  | "reused_capability"
  | "degraded";

export type CapabilityGrowthNextAction =
  | "install"
  | "verify"
  | "rerun"
  | "refresh_metadata"
  | "prefer_verified_winner";

export type CapabilityGrowthProof = {
  stage: CapabilityGrowthStage;
  nextAction: CapabilityGrowthNextAction;
  candidateId: string;
  capabilityId: string;
  packageId: string;
  provenance: ReturnType<typeof describeCapabilityTrust>["provenance"];
  eligibility: ReturnType<typeof describeCapabilityTrust>["eligibility"];
  installRequired: boolean;
  successfulRoutes?: number;
  firstReuseAt?: string;
  verifiedHosts?: string[];
  installPlan?: PackageAcquisitionHint["installPlan"];
};

export function capabilityGrowthForInstallRequired(
  winner: CapabilityCard,
  acquisition: PackageAcquisitionHint
): CapabilityGrowthProof {
  const trust = describeCapabilityTrust(winner);

  return {
    stage: "install_required",
    nextAction: "install",
    candidateId: winner.id,
    capabilityId: winner.leaf.capabilityId,
    packageId: winner.package.packageId,
    provenance: trust.provenance,
    eligibility: trust.eligibility,
    installRequired: true,
    installPlan: acquisition.installPlan
  };
}

export function capabilityGrowthForVerifiedHandoff(
  winner: CapabilityCard,
  entry: AcquisitionMemoryEntry | undefined
): CapabilityGrowthProof {
  const trust = describeCapabilityTrust(winner);
  const successfulRoutes = entry?.successfulRoutes ?? 1;
  const stage: CapabilityGrowthStage = successfulRoutes > 1 ? "reused_capability" : "verified_handoff";

  return {
    stage,
    nextAction: successfulRoutes > 1 ? "prefer_verified_winner" : "rerun",
    candidateId: winner.id,
    capabilityId: winner.leaf.capabilityId,
    packageId: winner.package.packageId,
    provenance: trust.provenance,
    eligibility: trust.eligibility,
    installRequired: false,
    successfulRoutes,
    firstReuseAt: entry?.firstReuseAt,
    verifiedHosts: entry?.verifiedHosts
  };
}

export function capabilityGrowthForDegraded(
  winner: CapabilityCard,
  nextAction: CapabilityGrowthNextAction = "verify"
): CapabilityGrowthProof {
  const trust = describeCapabilityTrust(winner);

  return {
    stage: "degraded",
    nextAction,
    candidateId: winner.id,
    capabilityId: winner.leaf.capabilityId,
    packageId: winner.package.packageId,
    provenance: trust.provenance,
    eligibility: trust.eligibility,
    installRequired: winner.prepare.installRequired
  };
}
