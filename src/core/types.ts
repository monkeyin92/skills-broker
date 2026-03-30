export const BROKER_HOSTS = [
  "claude-code",
  "codex",
  "opencode"
] as const;

export type BrokerHost = (typeof BROKER_HOSTS)[number];

export type BrokerIntent =
  | "web_content_to_markdown"
  | "social_post_to_markdown"
  | "capability_discovery_or_install";

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

export type BrokerOutcomeCode =
  | "NO_CANDIDATE"
  | "HANDOFF_READY"
  | "UNSUPPORTED_REQUEST"
  | "AMBIGUOUS_REQUEST"
  | "PREPARE_FAILED";

export type BrokerHostAction =
  | "continue_normally"
  | "ask_clarifying_question"
  | "offer_capability_discovery"
  | "show_graceful_failure";

export type CapabilityOwnershipSurface =
  | "host_visible"
  | "broker_owned_downstream";

export type CapabilityImplementationType =
  | "local_skill"
  | "mcp_server"
  | "broker_workflow";

export type BrokerRequest = {
  intent: BrokerIntent;
  outputMode: BrokerOutputMode;
  url?: string;
  capabilityQuery?: CapabilityQuery;
};
