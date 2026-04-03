import {
  compileCapabilityQueryRequest,
  compileEnvelopeRequest,
  synthesizeWebContentCapabilityQuery
} from "../broker/query-compiler.js";
import type { BrokerEnvelope } from "./envelope.js";
import type {
  BrokerHost,
  BrokerRequest,
  QueryBackedBrokerRequest
} from "./types.js";

type LegacyNormalizeRequestInput = {
  task: string;
  url: string;
};

export type NormalizeRequestInput =
  | LegacyNormalizeRequestInput
  | BrokerEnvelope;

export class UnsupportedBrokerRequestError extends Error {
  readonly code = "UNSUPPORTED_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "UnsupportedBrokerRequestError";
  }
}

export class AmbiguousBrokerRequestError extends Error {
  readonly code = "AMBIGUOUS_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "AmbiguousBrokerRequestError";
  }
}

function isLegacyInput(
  input: NormalizeRequestInput
): input is LegacyNormalizeRequestInput {
  return "task" in input;
}

function normalizeCompiledCapabilityQuery(
  query: NonNullable<BrokerEnvelope["capabilityQuery"]>
): QueryBackedBrokerRequest {
  try {
    return compileCapabilityQueryRequest(query);
  } catch (error) {
    throw new UnsupportedBrokerRequestError(
      error instanceof Error
        ? error.message
        : `Unsupported broker capability query: ${query.requestText}`
    );
  }
}

function normalizeEnvelopeRequest(
  input: BrokerEnvelope
): QueryBackedBrokerRequest {
  if (input.capabilityQuery !== undefined) {
    return normalizeCompiledCapabilityQuery(input.capabilityQuery);
  }

  const compiled = compileEnvelopeRequest(input);

  if (compiled.kind === "compiled") {
    return normalizeCompiledCapabilityQuery(compiled.capabilityQuery);
  }

  if (compiled.kind === "ambiguous") {
    throw new AmbiguousBrokerRequestError(
      `Ambiguous broker request: ${input.requestText}`
    );
  }

  throw new UnsupportedBrokerRequestError(
    `Unsupported broker request: ${input.requestText}`
  );
}

export function normalizeRequest(
  input: BrokerEnvelope
): QueryBackedBrokerRequest;
export function normalizeRequest(
  input: LegacyNormalizeRequestInput,
  fallbackHost: BrokerHost
): QueryBackedBrokerRequest;
export function normalizeRequest(
  input: NormalizeRequestInput,
  fallbackHost?: BrokerHost
): BrokerRequest;
export function normalizeRequest(
  input: NormalizeRequestInput,
  fallbackHost?: BrokerHost
): BrokerRequest {
  if (isLegacyInput(input)) {
    const normalizedTask = input.task.trim();

    if (normalizedTask !== "turn this webpage into markdown") {
      throw new UnsupportedBrokerRequestError(
        `Unsupported broker task: ${input.task}`
      );
    }

    if (fallbackHost !== undefined) {
      return normalizeCompiledCapabilityQuery(
        synthesizeWebContentCapabilityQuery(
          {
            host: fallbackHost,
            requestText: normalizedTask
          },
          input.url
        )
      );
    }

    return {
      intent: "web_content_to_markdown",
      outputMode: "markdown_only",
      url: input.url
    };
  }

  return normalizeEnvelopeRequest(input);
}
