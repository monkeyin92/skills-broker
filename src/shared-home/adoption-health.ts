import type { BrokerHost } from "../core/types.js";
import type {
  DoctorProofRailState,
  DoctorWebsiteQaAdoptionSignal
} from "./doctor.js";

export type AdoptionHealthStatus = "green" | "blocked" | "inactive";

export type AdoptionHealthReasonCode =
  | "SHARED_HOME_FAILED"
  | "SHARED_HOME_MISSING"
  | "HOST_CONFLICT"
  | "HOST_NOT_WRITABLE"
  | "HOST_NOT_DETECTED"
  | "HOST_FAILED"
  | "HOST_COMPETING_PEERS"
  | "HOST_INTEGRITY_ISSUE"
  | "HOST_MANUAL_RECOVERY"
  | "BROKER_FIRST_STRICT_ISSUE"
  | "STATUS_STRICT_ISSUE"
  | "ACQUISITION_MEMORY_UNREADABLE"
  | "VERIFIED_DOWNSTREAM_MANIFESTS_UNREADABLE"
  | "WEBSITE_QA_SIGNAL_MISSING"
  | "WEBSITE_QA_SIGNAL_STALE"
  | "WEBSITE_QA_VERIFY_PENDING"
  | "WEBSITE_QA_REPEAT_USAGE_PENDING"
  | "WEBSITE_QA_CROSS_HOST_REUSE_PENDING"
  | "WEBSITE_QA_ROUTING_UNSTABLE"
  | "NO_MANAGED_HOST";

export type AdoptionHealthReason = {
  code: AdoptionHealthReasonCode;
  message: string;
  host?: BrokerHost;
};

export type AdoptionHealthResult = {
  status: AdoptionHealthStatus;
  managedHosts: BrokerHost[];
  reasons: AdoptionHealthReason[];
  nextAction?: string;
};

type AdoptionHealthHost = {
  name: BrokerHost;
  status: string;
  reason?: string;
  competingPeerSkills?: string[];
  integrityIssues?: Array<{
    code: string;
    message: string;
  }>;
  manualRecovery?: {
    markerId: string;
  };
};

type StrictIssueSource = {
  hasStrictIssues: boolean;
  issues: Array<{
    code: string;
    message: string;
  }>;
};

type ProofRailState = {
  acquisitionMemory?: DoctorProofRailState;
  verifiedDownstreamManifests?: DoctorProofRailState;
};

export type ResolveAdoptionHealthInput = {
  sharedHomeState?: "installed" | "updated" | "planned" | "failed";
  sharedHomeReason?: string;
  sharedHomeExists?: boolean;
  hosts: AdoptionHealthHost[];
  brokerFirstGate?: StrictIssueSource;
  statusBoard?: StrictIssueSource;
  proofRails?: ProofRailState;
  websiteQaSignal?: DoctorWebsiteQaAdoptionSignal;
};

const MANAGED_HOST_STATUSES = new Set([
  "detected",
  "installed",
  "updated",
  "up_to_date",
  "cleared_manual_recovery"
]);

function isDefaultMissingRootReason(reason: string | undefined): boolean {
  return (
    reason?.startsWith("default ") === true &&
    reason.includes(" root not detected at ")
  );
}

function resolveHostStatusReason(
  host: AdoptionHealthHost
): AdoptionHealthReason | undefined {
  switch (host.status) {
    case "conflict":
    case "skipped_conflict":
      return {
        code: "HOST_CONFLICT",
        host: host.name,
        message: `${host.name}: ${host.reason ?? "host shell is in conflict"}`
      };
    case "not_writable":
      return {
        code: "HOST_NOT_WRITABLE",
        host: host.name,
        message: `${host.name}: ${host.reason ?? "host shell is not writable"}`
      };
    case "failed":
      return {
        code: "HOST_FAILED",
        host: host.name,
        message: `${host.name}: ${host.reason ?? "host lifecycle failed"}`
      };
    case "not_detected":
      if (isDefaultMissingRootReason(host.reason)) {
        return undefined;
      }

      return {
        code: "HOST_NOT_DETECTED",
        host: host.name,
        message: `${host.name}: ${host.reason ?? "host shell is not detected"}`
      };
    default:
      return undefined;
  }
}

function collectHostReasons(host: AdoptionHealthHost): AdoptionHealthReason[] {
  const reasons: AdoptionHealthReason[] = [];
  const hostStatusReason = resolveHostStatusReason(host);

  if (hostStatusReason !== undefined) {
    reasons.push(hostStatusReason);
  }

  if ((host.competingPeerSkills?.length ?? 0) > 0) {
    reasons.push({
      code: "HOST_COMPETING_PEERS",
      host: host.name,
      message: `${host.name}: competing peer skills detected (${host.competingPeerSkills?.join(", ")})`
    });
  }

  for (const issue of host.integrityIssues ?? []) {
    reasons.push({
      code: "HOST_INTEGRITY_ISSUE",
      host: host.name,
      message: `${host.name}: ${issue.code}: ${issue.message}`
    });
  }

  if (host.manualRecovery !== undefined) {
    reasons.push({
      code: "HOST_MANUAL_RECOVERY",
      host: host.name,
      message: `${host.name}: manual recovery required (${host.manualRecovery.markerId})`
    });
  }

  return reasons;
}

function collectStrictIssueReasons(
  scope: "broker-first gate" | "status board",
  code: "BROKER_FIRST_STRICT_ISSUE" | "STATUS_STRICT_ISSUE",
  source: StrictIssueSource | undefined
): AdoptionHealthReason[] {
  if (source?.hasStrictIssues !== true) {
    return [];
  }

  if (source.issues.length === 0) {
    return [
      {
        code,
        message: `${scope} has strict issues`
      }
    ];
  }

  return source.issues.map((issue) => ({
    code,
    message: `${scope} ${issue.code}: ${issue.message}`
  }));
}

function collectWebsiteQaSignalReasons(
  signal: DoctorWebsiteQaAdoptionSignal | undefined
): AdoptionHealthReason[] {
  if (signal === undefined) {
    return [];
  }

  if (signal.status === "missing") {
    return [
      {
        code: "WEBSITE_QA_SIGNAL_MISSING",
        message: `website QA adoption signal is missing: ${signal.nextAction}`
      }
    ];
  }

  if (signal.status === "stale") {
    return [
      {
        code: "WEBSITE_QA_SIGNAL_STALE",
        message: `website QA adoption signal is stale: ${signal.nextAction}`
      }
    ];
  }

  const reasons: AdoptionHealthReason[] = [];

  if (signal.proofs.verifyState !== "confirmed") {
    reasons.push({
      code: "WEBSITE_QA_VERIFY_PENDING",
      message: `website QA verify proof is not current yet: ${signal.nextAction}`
    });
  }

  if (signal.proofs.repeatUsageState !== "confirmed") {
    reasons.push({
      code: "WEBSITE_QA_REPEAT_USAGE_PENDING",
      message: `website QA repeat-usage proof is not current yet: ${signal.nextAction}`
    });
  }

  if (signal.proofs.crossHostReuseState !== "confirmed") {
    reasons.push({
      code: "WEBSITE_QA_CROSS_HOST_REUSE_PENDING",
      message: `website QA cross-host reuse proof is not current yet: ${signal.nextAction}`
    });
  }

  if (
    signal.recent.hostSkips > 0 ||
    signal.recent.misroutes > 0 ||
    (signal.recent.observed > 0 && signal.recent.hits === 0)
  ) {
    reasons.push({
      code: "WEBSITE_QA_ROUTING_UNSTABLE",
      message: `website QA routing still contradicts a healthy default-entry posture: ${signal.nextAction}`
    });
  }

  return reasons;
}

export function resolveAdoptionHealth(
  input: ResolveAdoptionHealthInput
): AdoptionHealthResult {
  const managedHosts = input.hosts
    .filter((host) => MANAGED_HOST_STATUSES.has(host.status))
    .map((host) => host.name);

  const reasons: AdoptionHealthReason[] = [];

  if (input.sharedHomeState === "failed") {
    reasons.push({
      code: "SHARED_HOME_FAILED",
      message: `shared-home: ${input.sharedHomeReason ?? "shared broker home installation failed"}`
    });
  }

  if (input.sharedHomeExists === false && managedHosts.length > 0) {
    reasons.push({
      code: "SHARED_HOME_MISSING",
      message: `shared-home: managed host shells exist but the shared broker home is missing${
        input.sharedHomeReason ? ` (${input.sharedHomeReason})` : ""
      }`
    });
  }

  for (const host of input.hosts) {
    reasons.push(...collectHostReasons(host));
  }

  reasons.push(
    ...collectStrictIssueReasons(
      "broker-first gate",
      "BROKER_FIRST_STRICT_ISSUE",
      input.brokerFirstGate
    )
  );
  reasons.push(
    ...collectStrictIssueReasons(
      "status board",
      "STATUS_STRICT_ISSUE",
      input.statusBoard
    )
  );

  if (
    managedHosts.length > 0 &&
    input.proofRails?.acquisitionMemory === "unreadable"
  ) {
    reasons.push({
      code: "ACQUISITION_MEMORY_UNREADABLE",
      message:
        "website QA verify proof is unreadable: acquisition memory cannot prove the install_required -> verify path"
    });
  }

  if (
    managedHosts.length > 0 &&
    input.proofRails?.verifiedDownstreamManifests === "unreadable"
  ) {
    reasons.push({
      code: "VERIFIED_DOWNSTREAM_MANIFESTS_UNREADABLE",
      message:
        "website QA replay/reuse proof is unreadable: verified downstream manifests cannot prove replay or cross-host reuse readiness"
    });
  }

  const websiteQaSignalReasons =
    managedHosts.length > 0 && reasons.length === 0
      ? collectWebsiteQaSignalReasons(input.websiteQaSignal)
      : [];

  reasons.push(...websiteQaSignalReasons);

  if (reasons.length > 0) {
    return {
      status: "blocked",
      managedHosts,
      reasons,
      ...(websiteQaSignalReasons.length === 0 || input.websiteQaSignal?.nextAction === undefined
        ? {}
        : { nextAction: input.websiteQaSignal.nextAction })
    };
  }

  if (managedHosts.length > 0) {
    return {
      status: "green",
      managedHosts,
      reasons: []
    };
  }

  return {
    status: "inactive",
    managedHosts,
    reasons: [
      {
        code: "NO_MANAGED_HOST",
        message: "no managed host is installed yet"
      }
    ]
  };
}
