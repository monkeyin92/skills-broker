export const BROKER_HOSTS = [
  "claude-code",
  "codex"
] as const;

export type BrokerHost = (typeof BROKER_HOSTS)[number];

export function isBrokerHost(value: string): value is BrokerHost {
  return BROKER_HOSTS.includes(value as BrokerHost);
}

export const BROKER_HOST_SUPPORT = {
  "claude-code": {
    host: "claude-code",
    defaultRootDirectorySegments: [".claude"],
    defaultInstallDirectorySegments: [".claude", "skills", "skills-broker"],
    overrideFlag: "--claude-dir",
    knownShellEntries: ["SKILL.md", "package.json", ".claude-plugin", "skills", "bin"]
  },
  codex: {
    host: "codex",
    defaultRootDirectorySegments: [".codex"],
    defaultInstallDirectorySegments: [".agents", "skills", "skills-broker"],
    overrideFlag: "--codex-dir",
    knownShellEntries: ["SKILL.md", "bin", ".skills-broker.json"]
  }
} as const satisfies Record<
  BrokerHost,
  {
    host: BrokerHost;
    defaultRootDirectorySegments: readonly [string, ...string[]];
    defaultInstallDirectorySegments: readonly [string, ...string[]];
    overrideFlag: `--${string}`;
    knownShellEntries: readonly string[];
  }
>;

export type BrokerHostSupportSpec = (typeof BROKER_HOST_SUPPORT)[BrokerHost];

export type BrokerHostOverrideFlag = BrokerHostSupportSpec["overrideFlag"];

export function brokerHostSupportSpec(host: BrokerHost): BrokerHostSupportSpec {
  return BROKER_HOST_SUPPORT[host];
}

export function brokerHostKnownShellEntries(
  host: BrokerHost
): readonly string[] {
  return brokerHostSupportSpec(host).knownShellEntries;
}

export type CompatibilityIntent =
  | "web_content_to_markdown"
  | "social_post_to_markdown"
  | "capability_discovery_or_install";

export type BrokerIntent = CompatibilityIntent;

export type BrokerOutputMode = "markdown_only";

export const CAPABILITY_QUERY_KINDS = ["capability_request"] as const;

export type CapabilityQueryKind = (typeof CAPABILITY_QUERY_KINDS)[number];

export const CAPABILITY_QUERY_TARGET_TYPES = [
  "url",
  "website",
  "repo",
  "file",
  "text",
  "codebase",
  "problem_statement"
] as const;

export type CapabilityQueryTargetType =
  (typeof CAPABILITY_QUERY_TARGET_TYPES)[number];

export type CapabilityQueryTarget = {
  type: CapabilityQueryTargetType;
  value: string;
};

export const SEMANTIC_CONFIDENCE_HINTS = [
  "url",
  "website",
  "repo",
  "text",
  "problem_statement",
  "codebase",
  "markdown",
  "analysis",
  "design_doc",
  "qa_report",
  "recommendation",
  "installation_plan"
] as const;

export type SemanticConfidenceHint = (typeof SEMANTIC_CONFIDENCE_HINTS)[number];

export const CAPABILITY_PROOF_FAMILIES = [
  "web_content_to_markdown",
  "social_post_to_markdown",
  "capability_discovery_or_install"
] as const;

export type CapabilityProofFamily = (typeof CAPABILITY_PROOF_FAMILIES)[number];

export type CapabilityQuery = {
  kind: CapabilityQueryKind;
  goal: string;
  host: BrokerHost;
  requestText: string;
  jobFamilies?: string[];
  targets?: CapabilityQueryTarget[];
  artifacts?: string[];
  constraints?: string[];
  preferredCapability?: string | null;
  metadata?: Record<string, string>;
};

export const DOWNSTREAM_EXECUTION_FAILURE_REASON_CODES = [
  "skill_broken",
  "dependency_broken"
] as const;

export type DownstreamExecutionFailureReasonCode =
  (typeof DOWNSTREAM_EXECUTION_FAILURE_REASON_CODES)[number];

export type DownstreamExecutionFailure = {
  candidateId?: string;
  packageId?: string;
  leafCapabilityId?: string;
  implementationId?: string;
  reasonCode: DownstreamExecutionFailureReasonCode;
  evidence?: string;
};

export type BrokerOutcomeCode =
  | "NO_CANDIDATE"
  | "INSTALL_REQUIRED"
  | "HANDOFF_READY"
  | "WORKFLOW_STAGE_READY"
  | "WORKFLOW_BLOCKED"
  | "WORKFLOW_COMPLETED"
  | "WORKFLOW_FAILED"
  | "UNSUPPORTED_REQUEST"
  | "AMBIGUOUS_REQUEST"
  | "PREPARE_FAILED";

export type BrokerHostAction =
  | "continue_normally"
  | "ask_clarifying_question"
  | "offer_capability_discovery"
  | "offer_package_install"
  | "show_graceful_failure";

export type CapabilityOwnershipSurface =
  | "host_visible"
  | "broker_owned_downstream";

export type CapabilityImplementationType =
  | "local_skill"
  | "mcp_server"
  | "broker_workflow";

export type CapabilityPackageInstallState = "installed" | "available";

export type CapabilityPackageAcquisition =
  | "local_skill_bundle"
  | "published_package"
  | "broker_native"
  | "mcp_bundle";

export const CAPABILITY_PACKAGE_LAYOUTS = [
  "single_skill_directory",
  "bundle_root_children",
  "nested_agent_skills"
] as const;

export type CapabilityPackageLayout =
  (typeof CAPABILITY_PACKAGE_LAYOUTS)[number];

export type CapabilityPackageProbe = {
  layouts: CapabilityPackageLayout[];
  manifestFiles?: string[];
  manifestNames?: string[];
  aliases?: string[];
};

export type LeafCapabilityProbe = {
  manifestFiles?: string[];
  manifestNames?: string[];
  aliases?: string[];
};

export type CapabilityPackageRef = {
  packageId: string;
  label: string;
  installState: CapabilityPackageInstallState;
  acquisition: CapabilityPackageAcquisition;
  probe?: CapabilityPackageProbe;
};

export type LeafCapabilityRef = {
  capabilityId: string;
  packageId: string;
  subskillId: string;
  probe?: LeafCapabilityProbe;
};

export type PackageInstallMethod =
  | "package_manager"
  | "mcp_registry"
  | "local_bundle"
  | "manual_followup";

export type PackageInstallRetryMode =
  | "rerun_request"
  | "resume_workflow_stage";

export type PackageInstallPlanStep = {
  id: "install" | "verify" | "retry";
  title: string;
  instructions: string;
};

export type PackageInstallPlan = {
  method: PackageInstallMethod;
  summary: string;
  steps: PackageInstallPlanStep[];
  verification: {
    checks: string[];
    packageProbe?: CapabilityPackageProbe;
    leafProbe?: LeafCapabilityProbe;
  };
  retry: {
    mode: PackageInstallRetryMode;
    runId?: string;
    stageId?: string;
  };
};

export type PackageAcquisitionHint = {
  reason: "package_not_installed";
  package: CapabilityPackageRef;
  leafCapability: LeafCapabilityRef;
  installPlan: PackageInstallPlan;
};

export type QueryBackedBrokerRequest = {
  intent?: BrokerIntent;
  outputMode: BrokerOutputMode;
  url?: string;
  capabilityQuery: CapabilityQuery;
};

export type BrokerRequest = QueryBackedBrokerRequest;
