import type { BrokerRequest } from "./types.js";

export type NormalizeRequestInput = {
  task: string;
  url: string;
};

export function normalizeRequest(
  input: NormalizeRequestInput
): BrokerRequest {
  const { task, url } = input;
  const normalizedTask = task.trim();

  if (normalizedTask !== "turn this webpage into markdown") {
    throw new Error(`Unsupported broker task: ${task}`);
  }

  return {
    intent: "webpage_to_markdown",
    outputMode: "markdown_only",
    url
  };
}
