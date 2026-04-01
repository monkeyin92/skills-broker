import type { CapabilityCard } from "../core/capability-card.js";
import type { NormalizeRequestInput } from "../core/request.js";
import type { BrokerHostAction, BrokerOutcomeCode } from "../core/types.js";

export const BROKER_TRACE_VERSION = "2026-03-31" as const;

export type BrokerTraceResultCode = BrokerOutcomeCode | "HOST_SKIPPED_BROKER";
export type BrokerTraceRoutingOutcome =
  | "hit"
  | "misroute"
  | "fallback"
  | "host_skipped";
export type BrokerTraceHostDecision =
  | "broker_first"
  | "handle_normally"
  | "clarify_before_broker";
export type BrokerTraceMissLayer =
  | "host_selection"
  | "broker_normalization"
  | "retrieval"
  | "prepare"
  | "workflow_execution"
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
  routingOutcome: BrokerTraceRoutingOutcome;
  missLayer: BrokerTraceMissLayer | null;
  normalizedBy: BrokerTraceNormalizedBy | null;
  requestSurface: BrokerTraceRequestSurface | null;
  hostAction: BrokerHostAction | null;
  candidateCount: number | null;
  winnerId: string | null;
  winnerPackageId: string | null;
  workflowId: string | null;
  runId: string | null;
  stageId: string | null;
  reasonCode: string | null;
  timestamp: string;
};

export type BrokerRoutingSurfaceSummary = {
  requestSurface: BrokerTraceRequestSurface;
  normalizedBy: BrokerTraceNormalizedBy;
  observed: number;
  hits: number;
  misroutes: number;
  fallbacks: number;
  hitRate: number;
  misrouteRate: number;
  fallbackRate: number;
};

export type BrokerRoutingTraceSummary = {
  observed: number;
  syntheticHostSkips: number;
  surfaces: BrokerRoutingSurfaceSummary[];
};

type RuntimeTraceOptions = {
  input: NormalizeRequestInput;
  currentHost: string;
  resultCode: BrokerOutcomeCode;
  now: Date;
  hostAction: BrokerHostAction | null;
  candidateCount: number;
  winner?: Pick<CapabilityCard, "id" | "package">;
  workflowId?: string;
  runId?: string;
  stageId?: string | null;
  reasonCode?: string | null;
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
    case "WORKFLOW_FAILED":
    case "WORKFLOW_BLOCKED":
      return "workflow_execution";
    case "WORKFLOW_STAGE_READY":
    case "WORKFLOW_COMPLETED":
      return null;
    case "HANDOFF_READY":
      return null;
  }
}

function routingOutcomeForResultCode(
  resultCode: BrokerTraceResultCode
): BrokerTraceRoutingOutcome {
  switch (resultCode) {
    case "HANDOFF_READY":
    case "WORKFLOW_STAGE_READY":
    case "WORKFLOW_BLOCKED":
    case "WORKFLOW_COMPLETED":
      return "hit";
    case "UNSUPPORTED_REQUEST":
    case "AMBIGUOUS_REQUEST":
      return "misroute";
    case "NO_CANDIDATE":
    case "PREPARE_FAILED":
    case "WORKFLOW_FAILED":
      return "fallback";
    case "HOST_SKIPPED_BROKER":
      return "host_skipped";
  }
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

const REQUEST_SURFACE_ORDER: BrokerTraceRequestSurface[] = [
  "structured_query",
  "raw_envelope",
  "legacy_task"
];

const REQUEST_SURFACE_NORMALIZATION: Record<
  BrokerTraceRequestSurface,
  BrokerTraceNormalizedBy
> = {
  structured_query: "structured_query",
  raw_envelope: "raw_request_fallback",
  legacy_task: "legacy_intent"
};

export function summarizeBrokerRoutingTraces(
  traces: BrokerRoutingTrace[],
  options?: {
    since?: Date;
  }
): BrokerRoutingTraceSummary {
  const filtered = traces.filter((trace) => {
    if (options?.since === undefined) {
      return true;
    }

    return new Date(trace.timestamp) >= options.since;
  });
  const perSurface = new Map<
    BrokerTraceRequestSurface,
    Omit<BrokerRoutingSurfaceSummary, "hitRate" | "misrouteRate" | "fallbackRate">
  >();
  let syntheticHostSkips = 0;

  for (let index = 0; index < filtered.length; index += 1) {
    const trace = filtered[index];

    if (trace.routingOutcome === "host_skipped") {
      syntheticHostSkips += 1;
      continue;
    }

    if (trace.requestSurface === null || trace.normalizedBy === null) {
      continue;
    }

    const surfaceSummary = perSurface.get(trace.requestSurface) ?? {
      requestSurface: trace.requestSurface,
      normalizedBy: trace.normalizedBy,
      observed: 0,
      hits: 0,
      misroutes: 0,
      fallbacks: 0
    };

    surfaceSummary.observed += 1;

    switch (trace.routingOutcome) {
      case "hit":
        surfaceSummary.hits += 1;
        break;
      case "misroute":
        surfaceSummary.misroutes += 1;
        break;
      case "fallback":
        surfaceSummary.fallbacks += 1;
        break;
    }

    perSurface.set(trace.requestSurface, surfaceSummary);
  }

  return {
    observed: filtered.length,
    syntheticHostSkips,
    surfaces: REQUEST_SURFACE_ORDER.map((requestSurface) => {
      const summary = perSurface.get(requestSurface) ?? {
        requestSurface,
        normalizedBy: REQUEST_SURFACE_NORMALIZATION[requestSurface],
        observed: 0,
        hits: 0,
        misroutes: 0,
        fallbacks: 0
      };

      return {
        ...summary,
        hitRate: rate(summary.hits, summary.observed),
        misrouteRate: rate(summary.misroutes, summary.observed),
        fallbackRate: rate(summary.fallbacks, summary.observed)
      };
    }).filter((surface) => surface.observed > 0)
  };
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
    routingOutcome: routingOutcomeForResultCode(options.resultCode),
    missLayer: missLayerForResultCode(options.resultCode),
    normalizedBy: normalization.normalizedBy,
    requestSurface: normalization.requestSurface,
    hostAction: options.hostAction,
    candidateCount: options.candidateCount,
    winnerId: options.winner?.id ?? null,
    winnerPackageId: options.winner?.package.packageId ?? null,
    workflowId: options.workflowId ?? null,
    runId: options.runId ?? null,
    stageId: options.stageId ?? null,
    reasonCode: options.reasonCode ?? null,
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
    routingOutcome: "host_skipped",
    missLayer: "host_selection",
    normalizedBy: null,
    requestSurface: null,
    hostAction: options.hostAction ?? "continue_normally",
    candidateCount: null,
    winnerId: null,
    winnerPackageId: null,
    workflowId: null,
    runId: null,
    stageId: null,
    reasonCode: null,
    timestamp: options.now.toISOString()
  };
}
