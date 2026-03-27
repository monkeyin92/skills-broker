import type { BrokerRequest } from "./types";

export type NormalizeRequestInput = {
  task: string;
  url: string;
};

export function normalizeRequest(
  input: NormalizeRequestInput
): BrokerRequest {
  if (input.task !== "turn this webpage into markdown") {
    throw new Error(`Unsupported broker task: ${input.task}`);
  }

  return {
    intent: "webpage_to_markdown",
    outputMode: "markdown_only",
    url: input.url
  };
}
