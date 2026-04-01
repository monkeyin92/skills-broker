import type { CapabilityCard } from "../core/capability-card.js";
import type { WorkflowFailureReasonCode, WorkflowStage } from "../core/workflow.js";
import type {
  BrokerHostAction,
  BrokerOutcomeCode,
  PackageAcquisitionHint
} from "../core/types.js";
import type { HandoffEnvelope } from "./handoff.js";
import type { BrokerRoutingTrace } from "./trace.js";

export type BrokerDebug = {
  cacheHit: boolean;
  cachedCandidateId?: string;
  candidateCount: number;
  decision?: string;
};

export type WorkflowRunView = {
  workflowId: string;
  runId: string;
  status: "active" | "completed";
  activeStageId: string | null;
  completedStageIds: string[];
  artifacts: string[];
};

export type WorkflowStageView = Pick<
  WorkflowStage,
  | "id"
  | "label"
  | "kind"
  | "instructions"
  | "producesArtifacts"
  | "requiresArtifacts"
  | "requiredCompletedStageIds"
> & {
  requiresConfirmation: boolean;
  requiresExplicitArtifacts: boolean;
  handoff?: HandoffEnvelope;
};

export type WorkflowBlock = {
  kind: "install_required" | "gate";
  reasonCode: WorkflowFailureReasonCode;
  message: string;
  retryable: boolean;
  install?: PackageAcquisitionHint;
};

export type BrokerSuccessResult = {
  ok: true;
  winner: CapabilityCard;
  outcome: {
    code: "HANDOFF_READY";
    message: string;
  };
  handoff: HandoffEnvelope;
  acquisition?: undefined;
  debug: BrokerDebug;
  trace: BrokerRoutingTrace;
};

export type WorkflowStageReadyResult = {
  ok: true;
  winner: CapabilityCard;
  outcome: {
    code: "WORKFLOW_STAGE_READY";
    message: string;
  };
  workflow: WorkflowRunView;
  stage: WorkflowStageView;
  debug: BrokerDebug;
  trace: BrokerRoutingTrace;
};

export type WorkflowBlockedResult = {
  ok: true;
  winner: CapabilityCard;
  outcome: {
    code: "WORKFLOW_BLOCKED";
    message: string;
  };
  workflow: WorkflowRunView;
  block: WorkflowBlock;
  debug: BrokerDebug;
  trace: BrokerRoutingTrace;
};

export type WorkflowCompletedResult = {
  ok: true;
  winner: CapabilityCard;
  outcome: {
    code: "WORKFLOW_COMPLETED";
    message: string;
  };
  workflow: WorkflowRunView;
  completed: {
    stageId: string;
  };
  debug: BrokerDebug;
  trace: BrokerRoutingTrace;
};

export type BrokerFailureResult = {
  ok: false;
  outcome: {
    code: Exclude<
      BrokerOutcomeCode,
      "HANDOFF_READY" | "WORKFLOW_STAGE_READY" | "WORKFLOW_BLOCKED" | "WORKFLOW_COMPLETED"
    >;
    message: string;
    hostAction: BrokerHostAction;
  };
  error: {
    code: Exclude<
      BrokerOutcomeCode,
      "HANDOFF_READY" | "WORKFLOW_STAGE_READY" | "WORKFLOW_BLOCKED" | "WORKFLOW_COMPLETED"
    >;
    message: string;
  };
  acquisition?: PackageAcquisitionHint;
  failure?: {
    reasonCode: WorkflowFailureReasonCode;
    retryable: boolean;
    runId?: string;
    stageId?: string;
  };
  debug: BrokerDebug;
  trace: BrokerRoutingTrace;
};

export type RunBrokerResult =
  | BrokerSuccessResult
  | WorkflowStageReadyResult
  | WorkflowBlockedResult
  | WorkflowCompletedResult
  | BrokerFailureResult;
