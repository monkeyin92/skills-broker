import type { CapabilityCard } from "../core/capability-card.js";
import type { NormalizeRequestInput } from "../core/request.js";
import type { BrokerHostAction, BrokerOutcomeCode } from "../core/types.js";

export const BROKER_TRACE_VERSION = "2026-03-31" as const;

export type BrokerTraceResultCode = BrokerOutcomeCode | "HOST_SKIPPED_BROKER";
export type BrokerTraceHostDecision =
  | "broker_first"
  | "handle_normally"
  | "clarify_before_broker";
export type BrokerTraceMissLayer =
  | "host_selection"
  | "broker_normalization"
  | "retrieval"
  | "prepare"
  | "unknown";
export type BrokerTraceNormalizedBy =
  | "structured_query"
  | "raw_request_fallback"
  | "legacy_intent";
export type BrokerTraceRequestSurface =
  | "structured_query"
  | "raw_envelope"
  | "legacy_task";

export type BrokerRoutingTrace = {
  traceVersion: typeof BROKER_TRACE_VERSION;
  requestText: string;
  host: string;
  hostDecision: BrokerTraceHostDecision;
  resultCode: BrokerTraceResultCode;
  missLayer: BrokerTraceMissLayer | null;
  normalizedBy: BrokerTraceNormalizedBy | null;
  requestSurface: BrokerTraceRequestSurface | null;
  hostAction: BrokerHostAction | null;
  candidateCount: number | null;
  winnerId: string | null;
  winnerPackageId: string | null;
  timestamp: string;
};

type RuntimeTraceOptions = {
  input: NormalizeRequestInput;
  currentHost: string;
  resultCode: BrokerOutcomeCode;
  now: Date;
  hostAction: BrokerHostAction | null;
  candidateCount: number;
  winner?: Pick<CapabilityCard, "id" | "package">;
};

type SyntheticHostSkippedTraceOptions = {
  requestText: string;
  host: string;
  now: Date;
  hostDecision?: Exclude<BrokerTraceHostDecision, "broker_first">;
  hostAction?: BrokerHostAction | null;
};

function requestTextFromInput(input: NormalizeRequestInput): string {
  return "task" in input ? input.task : input.requestText;
}

function normalizationFromInput(input: NormalizeRequestInput): {
  normalizedBy: BrokerTraceNormalizedBy;
  requestSurface: BrokerTraceRequestSurface;
} {
  if ("task" in input) {
    return {
      normalizedBy: "legacy_intent",
      requestSurface: "legacy_task"
    };
  }

  if (input.capabilityQuery !== undefined) {
    return {
      normalizedBy: "structured_query",
      requestSurface: "structured_query"
    };
  }

  return {
    normalizedBy: "raw_request_fallback",
    requestSurface: "raw_envelope"
  };
}

function missLayerForResultCode(
  resultCode: BrokerTraceResultCode
): BrokerTraceMissLayer | null {
  switch (resultCode) {
    case "HOST_SKIPPED_BROKER":
      return "host_selection";
    case "UNSUPPORTED_REQUEST":
    case "AMBIGUOUS_REQUEST":
      return "broker_normalization";
    case "NO_CANDIDATE":
      return "retrieval";
    case "PREPARE_FAILED":
      return "prepare";
    case "HANDOFF_READY":
      return null;
  }
}

export function createBrokerRoutingTrace(
  options: RuntimeTraceOptions
): BrokerRoutingTrace {
  const normalization = normalizationFromInput(options.input);

  return {
    traceVersion: BROKER_TRACE_VERSION,
    requestText: requestTextFromInput(options.input),
    host: options.currentHost,
    hostDecision: "broker_first",
    resultCode: options.resultCode,
    missLayer: missLayerForResultCode(options.resultCode),
    normalizedBy: normalization.normalizedBy,
    requestSurface: normalization.requestSurface,
    hostAction: options.hostAction,
    candidateCount: options.candidateCount,
    winnerId: options.winner?.id ?? null,
    winnerPackageId: options.winner?.package.packageId ?? null,
    timestamp: options.now.toISOString()
  };
}

export function createSyntheticHostSkippedBrokerTrace(
  options: SyntheticHostSkippedTraceOptions
): BrokerRoutingTrace {
  return {
    traceVersion: BROKER_TRACE_VERSION,
    requestText: options.requestText,
    host: options.host,
    hostDecision: options.hostDecision ?? "handle_normally",
    resultCode: "HOST_SKIPPED_BROKER",
    missLayer: "host_selection",
    normalizedBy: null,
    requestSurface: null,
    hostAction: options.hostAction ?? "continue_normally",
    candidateCount: null,
    winnerId: null,
    winnerPackageId: null,
    timestamp: options.now.toISOString()
  };
}
