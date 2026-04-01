import type { CapabilityQueryMetadata } from "./capability-card.js";
import type {
  BrokerIntent,
  BrokerRequest,
  CapabilityOwnershipSurface,
  CapabilityPackageRef,
  LeafCapabilityProbe,
  LeafCapabilityRef
} from "./types.js";

export const WORKFLOW_DECISIONS = ["confirm"] as const;

export type WorkflowDecision = (typeof WORKFLOW_DECISIONS)[number];

export type WorkflowResume = {
  runId: string;
  stageId: string;
  decision: WorkflowDecision;
  artifacts?: string[];
};

export type WorkflowStageCapability = {
  packageId: string;
  capabilityId: string;
  subskillId: string;
  implementationId: string;
  package?: Partial<CapabilityPackageRef>;
  probe?: LeafCapabilityProbe;
};

export type WorkflowStage = {
  id: string;
  label: string;
  kind: "capability" | "host_native";
  requiresConfirmation?: boolean;
  nextStageId?: string | null;
  producesArtifacts?: string[];
  requiresArtifacts?: string[];
  requiredCompletedStageIds?: string[];
  instructions?: string;
  capability?: WorkflowStageCapability;
};

export type WorkflowImplementation = {
  id: string;
  type: "broker_workflow";
  ownerSurface: CapabilityOwnershipSurface;
};

export type WorkflowRecipe = {
  id: string;
  label: string;
  compatibilityIntent: BrokerIntent;
  package: CapabilityPackageRef;
  leaf: LeafCapabilityRef;
  query: CapabilityQueryMetadata;
  implementation: WorkflowImplementation;
  startStageId: string;
  stages: WorkflowStage[];
  sourceMetadata?: Record<string, unknown>;
};

export type WorkflowRunStatus = "active" | "completed";

export type WorkflowSession = {
  runId: string;
  workflowId: string;
  requestText: string;
  request: BrokerRequest;
  host: string;
  revision: number;
  status: WorkflowRunStatus;
  activeStageId: string | null;
  completedStageIds: string[];
  artifacts: string[];
  stageArtifacts: Record<string, string[]>;
  pendingBlock?: "install_required" | "gate";
  createdAt: string;
  updatedAt: string;
  lastDecision?: {
    stageId: string;
    decision: WorkflowDecision;
    submittedAt: string;
  };
};

export const WORKFLOW_FAILURE_REASONS = [
  "UNKNOWN_RUN",
  "STALE_STAGE",
  "TERMINAL_RUN",
  "INSTALL_REQUIRED",
  "MISSING_ARTIFACTS",
  "INVALID_ARTIFACTS",
  "SHIP_GATE_BLOCKED"
] as const;

export type WorkflowFailureReasonCode =
  (typeof WORKFLOW_FAILURE_REASONS)[number];
