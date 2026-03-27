export type BrokerIntent = "webpage_to_markdown";

export type BrokerOutputMode = "markdown_only";

export type BrokerOutcomeCode =
  | "NO_SKILL_NEEDED"
  | "NO_CANDIDATE"
  | "HANDOFF_READY"
  | "PREPARE_FAILED";

export type BrokerRequest = {
  intent: BrokerIntent;
  outputMode: BrokerOutputMode;
  url: string;
};
