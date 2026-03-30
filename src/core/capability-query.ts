import {
  BROKER_HOSTS,
  CAPABILITY_QUERY_KINDS,
  CAPABILITY_QUERY_TARGET_TYPES,
  type BrokerHost,
  type CapabilityQuery,
  type CapabilityQueryTarget
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(isNonEmptyString);
}

function parseCapabilityQueryTarget(value: unknown): CapabilityQueryTarget {
  if (!isRecord(value)) {
    throw new Error(
      "Expected capability query target to be a JSON object."
    );
  }

  if (
    typeof value.type !== "string" ||
    !CAPABILITY_QUERY_TARGET_TYPES.includes(value.type as CapabilityQueryTarget["type"])
  ) {
    throw new Error(
      `Expected capability query target.type to be one of ${CAPABILITY_QUERY_TARGET_TYPES.join(", ")}.`
    );
  }

  if (!isNonEmptyString(value.value)) {
    throw new Error(
      "Expected capability query target.value to be a non-empty string."
    );
  }

  return {
    type: value.type as CapabilityQueryTarget["type"],
    value: value.value
  };
}

export function parseCapabilityQuery(value: unknown): CapabilityQuery {
  if (!isRecord(value)) {
    throw new Error("Expected capability query to be a JSON object.");
  }

  if (
    typeof value.kind !== "string" ||
    !CAPABILITY_QUERY_KINDS.includes(value.kind as CapabilityQuery["kind"])
  ) {
    throw new Error(
      `Expected capability query.kind to be one of ${CAPABILITY_QUERY_KINDS.join(", ")}.`
    );
  }

  if (!isNonEmptyString(value.goal)) {
    throw new Error("Expected capability query.goal to be a non-empty string.");
  }

  if (
    typeof value.host !== "string" ||
    !BROKER_HOSTS.includes(value.host as BrokerHost)
  ) {
    throw new Error(
      `Expected capability query.host to be one of ${BROKER_HOSTS.join(", ")}.`
    );
  }

  if (!isNonEmptyString(value.requestText)) {
    throw new Error(
      "Expected capability query.requestText to be a non-empty string."
    );
  }

  if (value.targets !== undefined && !Array.isArray(value.targets)) {
    throw new Error("Expected capability query.targets to be an array.");
  }

  if (value.jobFamilies !== undefined && !isStringArray(value.jobFamilies)) {
    throw new Error(
      "Expected capability query.jobFamilies to be an array of strings."
    );
  }

  if (value.artifacts !== undefined && !isStringArray(value.artifacts)) {
    throw new Error(
      "Expected capability query.artifacts to be an array of strings."
    );
  }

  if (value.constraints !== undefined && !isStringArray(value.constraints)) {
    throw new Error(
      "Expected capability query.constraints to be an array of strings."
    );
  }

  if (
    value.preferredCapability !== undefined &&
    value.preferredCapability !== null &&
    !isNonEmptyString(value.preferredCapability)
  ) {
    throw new Error(
      "Expected capability query.preferredCapability to be a non-empty string or null."
    );
  }

  if (
    value.metadata !== undefined &&
    (!isRecord(value.metadata) ||
      !Object.values(value.metadata).every((item) => typeof item === "string"))
  ) {
    throw new Error(
      "Expected capability query.metadata to be a record of string values."
    );
  }

  return {
    kind: value.kind as CapabilityQuery["kind"],
    goal: value.goal,
    host: value.host as BrokerHost,
    requestText: value.requestText,
    jobFamilies: value.jobFamilies,
    targets:
      value.targets?.map((target) => parseCapabilityQueryTarget(target)) ?? undefined,
    artifacts: value.artifacts,
    constraints: value.constraints,
    preferredCapability:
      value.preferredCapability === undefined ? undefined : value.preferredCapability,
    metadata: value.metadata as Record<string, string> | undefined
  };
}
