import type { BrokerRequest } from "./types";

export type NormalizeRequestInput = {
  task: string;
  url: string;
};

export function normalizeRequest(
  _input: NormalizeRequestInput
): BrokerRequest {
  return {
    intent: "webpage_to_markdown",
    outputMode: "markdown_only"
  };
}
