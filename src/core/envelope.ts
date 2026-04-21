import { parseCapabilityQuery } from "./capability-query.js";
import {
  WORKFLOW_DECISIONS,
  type WorkflowDecision,
  type WorkflowResume
} from "./workflow.js";
import {
  BROKER_HOSTS,
  DOWNSTREAM_EXECUTION_FAILURE_REASON_CODES,
  isBrokerHost,
  type BrokerHost,
  type CapabilityQuery,
  type DownstreamExecutionFailure
} from "./types.js";

export type BrokerInvocationMode = "auto" | "explicit";

export type BrokerEnvelope = {
  requestText: string;
  host: BrokerHost;
  invocationMode?: BrokerInvocationMode;
  cwd?: string;
  urls?: string[];
  attachments?: string[];
  metadata?: Record<string, string>;
  capabilityQuery?: CapabilityQuery;
  executionFailures?: DownstreamExecutionFailure[];
  workflowResume?: WorkflowResume;
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

function parseWorkflowResume(value: unknown): WorkflowResume {
  if (!isRecord(value)) {
    throw new Error("Expected broker envelope.workflowResume to be an object.");
  }

  if (typeof value.runId !== "string" || value.runId.trim() === "") {
    throw new Error(
      "Expected broker envelope.workflowResume.runId to be a non-empty string."
    );
  }

  if (typeof value.stageId !== "string" || value.stageId.trim() === "") {
    throw new Error(
      "Expected broker envelope.workflowResume.stageId to be a non-empty string."
    );
  }

  if (
    typeof value.decision !== "string" ||
    !WORKFLOW_DECISIONS.includes(value.decision as WorkflowDecision)
  ) {
    throw new Error(
      `Expected broker envelope.workflowResume.decision to be one of ${WORKFLOW_DECISIONS.join(", ")}.`
    );
  }

  if (value.artifacts !== undefined && !isStringArray(value.artifacts)) {
    throw new Error(
      "Expected broker envelope.workflowResume.artifacts to be an array of strings."
    );
  }

  return {
    runId: value.runId,
    stageId: value.stageId,
    decision: value.decision as WorkflowDecision,
    artifacts: value.artifacts
  };
}

function parseDownstreamExecutionFailure(
  value: unknown,
  index: number
): DownstreamExecutionFailure {
  if (!isRecord(value)) {
    throw new Error(
      `Expected broker envelope.executionFailures[${index}] to be an object.`
    );
  }

  const candidateId =
    typeof value.candidateId === "string" && value.candidateId.trim() !== ""
      ? value.candidateId
      : undefined;
  const packageId =
    typeof value.packageId === "string" && value.packageId.trim() !== ""
      ? value.packageId
      : undefined;
  const leafCapabilityId =
    typeof value.leafCapabilityId === "string" &&
    value.leafCapabilityId.trim() !== ""
      ? value.leafCapabilityId
      : undefined;
  const implementationId =
    typeof value.implementationId === "string" &&
    value.implementationId.trim() !== ""
      ? value.implementationId
      : undefined;

  if (
    candidateId === undefined &&
    packageId === undefined &&
    leafCapabilityId === undefined &&
    implementationId === undefined
  ) {
    throw new Error(
      `Expected broker envelope.executionFailures[${index}] to include at least one identifier field.`
    );
  }

  if (
    typeof value.reasonCode !== "string" ||
    !DOWNSTREAM_EXECUTION_FAILURE_REASON_CODES.includes(
      value.reasonCode as DownstreamExecutionFailure["reasonCode"]
    )
  ) {
    throw new Error(
      `Expected broker envelope.executionFailures[${index}].reasonCode to be one of ${DOWNSTREAM_EXECUTION_FAILURE_REASON_CODES.join(", ")}.`
    );
  }

  if (
    value.evidence !== undefined &&
    (typeof value.evidence !== "string" || value.evidence.trim() === "")
  ) {
    throw new Error(
      `Expected broker envelope.executionFailures[${index}].evidence to be a non-empty string.`
    );
  }

  return {
    candidateId,
    packageId,
    leafCapabilityId,
    implementationId,
    reasonCode: value.reasonCode as DownstreamExecutionFailure["reasonCode"],
    evidence: value.evidence
  };
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

  if (typeof value.host !== "string" || !isBrokerHost(value.host)) {
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

  if (
    value.executionFailures !== undefined &&
    !Array.isArray(value.executionFailures)
  ) {
    throw new Error(
      "Expected broker envelope.executionFailures to be an array."
    );
  }

  const capabilityQuery =
    value.capabilityQuery !== undefined
      ? parseCapabilityQuery(value.capabilityQuery)
      : undefined;
  const executionFailures =
    value.executionFailures?.map((failure, index) =>
      parseDownstreamExecutionFailure(failure, index)
    ) ?? undefined;
  const workflowResume =
    value.workflowResume !== undefined
      ? parseWorkflowResume(value.workflowResume)
      : undefined;

  if (capabilityQuery !== undefined && workflowResume !== undefined) {
    throw new Error(
      "Expected broker envelope.capabilityQuery and broker envelope.workflowResume to be mutually exclusive."
    );
  }

  if (
    capabilityQuery !== undefined &&
    capabilityQuery.requestText !== value.requestText
  ) {
    throw new Error(
      "Expected broker envelope.capabilityQuery.requestText to match broker envelope.requestText."
    );
  }

  if (capabilityQuery !== undefined && capabilityQuery.host !== value.host) {
    throw new Error(
      "Expected broker envelope.capabilityQuery.host to match broker envelope.host."
    );
  }

  return {
    requestText: value.requestText,
    host: value.host,
    invocationMode: value.invocationMode,
    cwd: value.cwd,
    urls: value.urls,
    attachments: value.attachments,
    metadata: value.metadata,
    capabilityQuery,
    executionFailures,
    workflowResume
  };
}
