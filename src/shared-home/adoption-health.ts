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
  | "NO_MANAGED_HOST";

export type AdoptionHealthReason = {
  code: AdoptionHealthReasonCode;
  message: string;
  host?: "claude-code" | "codex";
};

export type AdoptionHealthResult = {
  status: AdoptionHealthStatus;
  managedHosts: Array<"claude-code" | "codex">;
  reasons: AdoptionHealthReason[];
};

type AdoptionHealthHost = {
  name: "claude-code" | "codex";
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

export type ResolveAdoptionHealthInput = {
  sharedHomeState?: "installed" | "updated" | "planned" | "failed";
  sharedHomeReason?: string;
  sharedHomeExists?: boolean;
  hosts: AdoptionHealthHost[];
  brokerFirstGate?: StrictIssueSource;
  statusBoard?: StrictIssueSource;
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
      message: "shared-home: managed host shells exist but the shared broker home is missing"
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

  if (reasons.length > 0) {
    return {
      status: "blocked",
      managedHosts,
      reasons
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
