import { BROKER_HOSTS, type BrokerHost } from "./types.js";

export type BrokerInvocationMode = "auto" | "explicit";

export type BrokerEnvelope = {
  requestText: string;
  host: BrokerHost;
  invocationMode?: BrokerInvocationMode;
  cwd?: string;
  urls?: string[];
  attachments?: string[];
  metadata?: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    if (
      !(index in value) ||
      typeof value[index] !== "string" ||
      value[index].trim() === ""
    ) {
      return false;
    }
  }

  return true;
}

function isStringRecord(
  value: unknown
): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

export function parseBrokerEnvelope(value: unknown): BrokerEnvelope {
  if (!isRecord(value)) {
    throw new Error("Expected broker envelope to be a JSON object.");
  }

  if (typeof value.requestText !== "string" || value.requestText.trim() === "") {
    throw new Error(
      "Expected broker envelope.requestText to be a non-empty string."
    );
  }

  if (
    typeof value.host !== "string" ||
    !BROKER_HOSTS.includes(value.host as BrokerHost)
  ) {
    throw new Error(
      `Expected broker envelope.host to be one of ${BROKER_HOSTS.join(", ")}.`
    );
  }

  if (value.invocationMode !== undefined) {
    if (value.invocationMode !== "auto" && value.invocationMode !== "explicit") {
      throw new Error(
        "Expected broker envelope.invocationMode to be auto or explicit."
      );
    }
  }

  if (value.cwd !== undefined && typeof value.cwd !== "string") {
    throw new Error("Expected broker envelope.cwd to be a string.");
  }

  if (value.urls !== undefined && !isStringArray(value.urls)) {
    throw new Error("Expected broker envelope.urls to be an array of strings.");
  }

  if (value.attachments !== undefined && !isStringArray(value.attachments)) {
    throw new Error(
      "Expected broker envelope.attachments to be an array of strings."
    );
  }

  if (value.metadata !== undefined && !isStringRecord(value.metadata)) {
    throw new Error(
      "Expected broker envelope.metadata to be a record of string values."
    );
  }

  return {
    requestText: value.requestText,
    host: value.host as BrokerHost,
    invocationMode: value.invocationMode,
    cwd: value.cwd,
    urls: value.urls,
    attachments: value.attachments,
    metadata: value.metadata
  };
}
