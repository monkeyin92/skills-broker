import type { CapabilityCard } from "../core/capability-card.js";
import type { NormalizeRequestInput } from "../core/request.js";
import type {
  BrokerHostAction,
  BrokerOutcomeCode,
  CapabilityPackageInstallState
} from "../core/types.js";

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
export type BrokerTraceRequestContract =
  | "query_native"
  | "query_native_via_legacy_compat"
  | "raw_envelope_fallback";
export type BrokerTraceSelectionMode = "explicit";

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
  requestContract: BrokerTraceRequestContract | null;
  selectionMode: BrokerTraceSelectionMode | null;
  hostAction: BrokerHostAction | null;
  candidateCount: number | null;
  winnerId: string | null;
  winnerPackageId: string | null;
  selectedCapabilityId: string | null;
  selectedLeafCapabilityId: string | null;
  selectedImplementationId: string | null;
  selectedPackageInstallState: CapabilityPackageInstallState | null;
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

export type BrokerRoutingContractSummary = {
  requestContract: BrokerTraceRequestContract;
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
  acquisition: {
    trueNoCandidate: number;
    installRequired: number;
  };
  surfaces: BrokerRoutingSurfaceSummary[];
  contracts: BrokerRoutingContractSummary[];
};

type RuntimeTraceOptions = {
  input: NormalizeRequestInput;
  currentHost: string;
  resultCode: BrokerOutcomeCode;
  now: Date;
  hostAction: BrokerHostAction | null;
  candidateCount: number;
  winner?: Pick<CapabilityCard, "id" | "package" | "leaf" | "implementation">;
  selected?: Pick<CapabilityCard, "package" | "leaf" | "implementation">;
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
  requestContract: BrokerTraceRequestContract;
} {
  if ("task" in input) {
    return {
      normalizedBy: "legacy_intent",
      requestSurface: "legacy_task",
      requestContract: "query_native_via_legacy_compat"
    };
  }

  if (input.capabilityQuery !== undefined) {
    return {
      normalizedBy: "structured_query",
      requestSurface: "structured_query",
      requestContract: "query_native"
    };
  }

  return {
    normalizedBy: "raw_request_fallback",
    requestSurface: "raw_envelope",
    requestContract: "raw_envelope_fallback"
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
    case "INSTALL_REQUIRED":
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
    case "INSTALL_REQUIRED":
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
const REQUEST_CONTRACT_ORDER: BrokerTraceRequestContract[] = [
  "query_native",
  "query_native_via_legacy_compat",
  "raw_envelope_fallback"
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
  const perContract = new Map<
    BrokerTraceRequestContract,
    Omit<BrokerRoutingContractSummary, "hitRate" | "misrouteRate" | "fallbackRate">
  >();
  let syntheticHostSkips = 0;
  let trueNoCandidate = 0;
  let installRequired = 0;

  for (let index = 0; index < filtered.length; index += 1) {
    const trace = filtered[index];

    if (trace.resultCode === "NO_CANDIDATE") {
      trueNoCandidate += 1;
    }

    if (trace.resultCode === "INSTALL_REQUIRED") {
      installRequired += 1;
    }

    if (trace.routingOutcome === "host_skipped") {
      syntheticHostSkips += 1;
      continue;
    }

    if (
      trace.requestSurface === null ||
      trace.normalizedBy === null ||
      trace.requestContract === null
    ) {
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
    const contractSummary = perContract.get(trace.requestContract) ?? {
      requestContract: trace.requestContract,
      observed: 0,
      hits: 0,
      misroutes: 0,
      fallbacks: 0
    };

    surfaceSummary.observed += 1;
    contractSummary.observed += 1;

    switch (trace.routingOutcome) {
      case "hit":
        surfaceSummary.hits += 1;
        contractSummary.hits += 1;
        break;
      case "misroute":
        surfaceSummary.misroutes += 1;
        contractSummary.misroutes += 1;
        break;
      case "fallback":
        surfaceSummary.fallbacks += 1;
        contractSummary.fallbacks += 1;
        break;
    }

    perSurface.set(trace.requestSurface, surfaceSummary);
    perContract.set(trace.requestContract, contractSummary);
  }

  return {
    observed: filtered.length,
    syntheticHostSkips,
    acquisition: {
      trueNoCandidate,
      installRequired
    },
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
    }).filter((surface) => surface.observed > 0),
    contracts: REQUEST_CONTRACT_ORDER.map((requestContract) => {
      const summary = perContract.get(requestContract) ?? {
        requestContract,
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
    }).filter((contract) => contract.observed > 0)
  };
}

export function createBrokerRoutingTrace(
  options: RuntimeTraceOptions
): BrokerRoutingTrace {
  const normalization = normalizationFromInput(options.input);
  const selected = options.selected ?? options.winner;

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
    requestContract: normalization.requestContract,
    selectionMode: selected === undefined ? null : "explicit",
    hostAction: options.hostAction,
    candidateCount: options.candidateCount,
    winnerId: options.winner?.id ?? null,
    winnerPackageId: options.winner?.package.packageId ?? null,
    selectedCapabilityId: selected?.leaf.capabilityId ?? null,
    selectedLeafCapabilityId: selected?.leaf.subskillId ?? null,
    selectedImplementationId: selected?.implementation.id ?? null,
    selectedPackageInstallState: selected?.package.installState ?? null,
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
    requestContract: null,
    selectionMode: null,
    hostAction: options.hostAction ?? "continue_normally",
    candidateCount: null,
    winnerId: null,
    winnerPackageId: null,
    selectedCapabilityId: null,
    selectedLeafCapabilityId: null,
    selectedImplementationId: null,
    selectedPackageInstallState: null,
    workflowId: null,
    runId: null,
    stageId: null,
    reasonCode: null,
    timestamp: options.now.toISOString()
  };
}
