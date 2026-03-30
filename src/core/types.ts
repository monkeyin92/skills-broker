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

export type BrokerRequest = {
  intent: BrokerIntent;
  outputMode: BrokerOutputMode;
  url?: string;
};
