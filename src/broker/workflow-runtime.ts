import { buildHandoffEnvelope } from "./handoff.js";
import {
  type BrokerDebug,
  type BrokerFailureResult,
  type RunBrokerResult,
  type WorkflowBlock,
  type WorkflowCompletedResult,
  type WorkflowRunView,
  type WorkflowStageReadyResult,
  type WorkflowStageView
} from "./result.js";
import { prepareCandidate } from "./prepare.js";
import { hydratePackageAvailability } from "./package-availability.js";
import { createBrokerRoutingTrace } from "./trace.js";
import { toCapabilityCard } from "../core/capability-card.js";
import type { NormalizeRequestInput } from "../core/request.js";
import type {
  WorkflowFailureReasonCode,
  WorkflowRecipe,
  WorkflowResume,
  WorkflowSession,
  WorkflowStage
} from "../core/workflow.js";
import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerRequest, PackageAcquisitionHint } from "../core/types.js";
import {
  WorkflowSessionConflictError,
  WorkflowSessionStore
} from "./workflow-session-store.js";

type WorkflowRuntimeContext = {
  input: NormalizeRequestInput;
  currentHost: string;
  now: Date;
  request: BrokerRequest;
  winner: CapabilityCard;
  recipe: WorkflowRecipe;
  sessionStore: WorkflowSessionStore;
  packageSearchRoots?: string[];
  brokerHomeDirectory?: string;
  debug: BrokerDebug;
};

type WorkflowResumeContext = WorkflowRuntimeContext & {
  resume: WorkflowResume;
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function sessionView(session: WorkflowSession): WorkflowRunView {
  return {
    workflowId: session.workflowId,
    runId: session.runId,
    status: session.status,
    activeStageId: session.activeStageId,
    completedStageIds: session.completedStageIds.slice(),
    artifacts: session.artifacts.slice()
  };
}

function stageById(recipe: WorkflowRecipe, stageId: string): WorkflowStage {
  const stage = recipe.stages.find((candidate) => candidate.id === stageId);

  if (stage === undefined) {
    throw new Error(
      `Workflow "${recipe.id}" is missing stage "${stageId}" in runtime.`
    );
  }

  return stage;
}

function stageView(
  stage: WorkflowStage,
  handoff?: ReturnType<typeof buildHandoffEnvelope>
): WorkflowStageView {
  return {
    id: stage.id,
    label: stage.label,
    kind: stage.kind,
    instructions: stage.instructions,
    producesArtifacts: stage.producesArtifacts?.slice(),
    requiresArtifacts: stage.requiresArtifacts?.slice(),
    requiredCompletedStageIds: stage.requiredCompletedStageIds?.slice(),
    requiresConfirmation: stage.requiresConfirmation !== false,
    requiresExplicitArtifacts: (stage.producesArtifacts?.length ?? 0) > 0,
    handoff
  };
}

function resolveCompletedArtifacts(
  stage: WorkflowStage,
  resume: WorkflowResume
):
  | {
      artifacts: string[];
    }
  | {
      reasonCode: WorkflowFailureReasonCode;
      message: string;
      retryable: boolean;
    } {
  const declaredArtifacts = stage.producesArtifacts ?? [];
  const submittedArtifacts = unique(resume.artifacts ?? []);

  if (declaredArtifacts.length === 0) {
    if (submittedArtifacts.length === 0) {
      return { artifacts: [] };
    }

    return {
      reasonCode: "INVALID_ARTIFACTS",
      message: `Workflow stage "${stage.id}" does not declare output artifacts, but resume submitted ${submittedArtifacts.join(", ")}.`,
      retryable: true
    };
  }

  if (submittedArtifacts.length === 0) {
    return {
      reasonCode: "MISSING_ARTIFACTS",
      message: `Workflow stage "${stage.id}" must explicitly report produced artifacts before it can advance. Allowed artifacts: ${declaredArtifacts.join(", ")}.`,
      retryable: true
    };
  }

  const undeclaredArtifacts = submittedArtifacts.filter(
    (artifact) => !declaredArtifacts.includes(artifact)
  );

  if (undeclaredArtifacts.length > 0) {
    return {
      reasonCode: "INVALID_ARTIFACTS",
      message: `Workflow stage "${stage.id}" reported undeclared artifacts: ${undeclaredArtifacts.join(", ")}. Allowed artifacts: ${declaredArtifacts.join(", ")}.`,
      retryable: true
    };
  }

  return {
    artifacts: submittedArtifacts
  };
}

async function resolveResumeConflict(
  context: WorkflowResumeContext,
  error: WorkflowSessionConflictError
): Promise<RunBrokerResult> {
  const latestSession =
    error.currentSession ?? (await context.sessionStore.read(context.resume.runId));

  if (latestSession === null) {
    return createWorkflowFailureResult(
      context,
      null,
      "UNKNOWN_RUN",
      `Workflow run "${context.resume.runId}" was not found.`,
      false
    );
  }

  if (latestSession.status !== "active" || latestSession.activeStageId === null) {
    return createWorkflowFailureResult(
      context,
      latestSession,
      "TERMINAL_RUN",
      `Workflow run "${context.resume.runId}" is already terminal.`,
      false
    );
  }

  if (latestSession.activeStageId !== context.resume.stageId) {
    return createWorkflowFailureResult(
      context,
      latestSession,
      "STALE_STAGE",
      `Workflow run "${context.resume.runId}" is no longer at stage "${context.resume.stageId}".`,
      true
    );
  }

  return presentCurrentStage(context, latestSession);
}

function createWorkflowFailureResult(
  context: WorkflowRuntimeContext,
  session: WorkflowSession | null,
  reasonCode: WorkflowFailureReasonCode,
  message: string,
  retryable: boolean
): BrokerFailureResult {
  return {
    ok: false,
    outcome: {
      code: "WORKFLOW_FAILED",
      message,
      hostAction: "show_graceful_failure"
    },
    error: {
      code: "WORKFLOW_FAILED",
      message
    },
    failure: {
      reasonCode,
      retryable,
      runId: session?.runId,
      stageId: session?.activeStageId ?? undefined
    },
    debug: context.debug,
    trace: createBrokerRoutingTrace({
      input: context.input,
      currentHost: context.currentHost,
      resultCode: "WORKFLOW_FAILED",
      now: context.now,
      hostAction: "show_graceful_failure",
      candidateCount: context.debug.candidateCount,
      winner: context.winner,
      workflowId: context.recipe.id,
      runId: session?.runId,
      stageId: session?.activeStageId,
      reasonCode
    })
  };
}

function createWorkflowBlockedResult(
  context: WorkflowRuntimeContext,
  session: WorkflowSession,
  block: WorkflowBlock
): RunBrokerResult {
  return {
    ok: true,
    winner: context.winner,
    outcome: {
      code: "WORKFLOW_BLOCKED",
      message: block.message
    },
    workflow: sessionView(session),
    block,
    debug: context.debug,
    trace: createBrokerRoutingTrace({
      input: context.input,
      currentHost: context.currentHost,
      resultCode: "WORKFLOW_BLOCKED",
      now: context.now,
      hostAction: null,
      candidateCount: context.debug.candidateCount,
      winner: context.winner,
      workflowId: context.recipe.id,
      runId: session.runId,
      stageId: session.activeStageId,
      reasonCode: block.reasonCode
    })
  };
}

function createWorkflowCompletedResult(
  context: WorkflowRuntimeContext,
  session: WorkflowSession,
  stageId: string
): WorkflowCompletedResult {
  return {
    ok: true,
    winner: context.winner,
    outcome: {
      code: "WORKFLOW_COMPLETED",
      message: `Workflow "${context.recipe.id}" completed at stage "${stageId}".`
    },
    workflow: sessionView(session),
    completed: {
      stageId
    },
    debug: context.debug,
    trace: createBrokerRoutingTrace({
      input: context.input,
      currentHost: context.currentHost,
      resultCode: "WORKFLOW_COMPLETED",
      now: context.now,
      hostAction: null,
      candidateCount: context.debug.candidateCount,
      winner: context.winner,
      workflowId: context.recipe.id,
      runId: session.runId,
      stageId
    })
  };
}

function installHintFromCard(card: CapabilityCard): PackageAcquisitionHint {
  return {
    reason: "package_not_installed",
    package: card.package,
    leafCapability: card.leaf
  };
}

function missingStagePrerequisite(
  session: WorkflowSession,
  stage: WorkflowStage
): {
  reasonCode: WorkflowFailureReasonCode;
  message: string;
  retryable: boolean;
  blockKind?: WorkflowBlock["kind"];
} | null {
  const missingArtifacts = (stage.requiresArtifacts ?? []).filter(
    (artifact) => !session.artifacts.includes(artifact)
  );
  const missingStages = (stage.requiredCompletedStageIds ?? []).filter(
    (stageId) => !session.completedStageIds.includes(stageId)
  );

  if (missingArtifacts.length === 0 && missingStages.length === 0) {
    return null;
  }

  if (stage.id === "ship") {
    return {
      reasonCode: "SHIP_GATE_BLOCKED",
      message:
        "Ship is blocked until required review and QA artifacts are present.",
      retryable: true,
      blockKind: "gate"
    };
  }

  return {
    reasonCode: "MISSING_ARTIFACTS",
    message: `Workflow stage "${stage.id}" is missing required artifacts or prior stage completion.`,
    retryable: true
  };
}

function stageCapabilityCard(
  recipe: WorkflowRecipe,
  stage: WorkflowStage
): CapabilityCard {
  if (stage.capability === undefined) {
    throw new Error(`Workflow stage "${stage.id}" has no capability metadata.`);
  }

  return toCapabilityCard({
    id: `${recipe.id}:${stage.id}`,
    kind: "skill",
    label: stage.label,
    intent: recipe.intent,
    package: {
      ...stage.capability.package,
      packageId: stage.capability.packageId
    },
    leaf: {
      capabilityId: stage.capability.capabilityId,
      packageId: stage.capability.packageId,
      subskillId: stage.capability.subskillId,
      probe: stage.capability.probe
    },
    query: recipe.query,
    implementation: {
      id: stage.capability.implementationId,
      type: "local_skill",
      ownerSurface: recipe.implementation.ownerSurface
    }
  });
}

async function presentCurrentStage(
  context: WorkflowRuntimeContext,
  session: WorkflowSession
): Promise<RunBrokerResult> {
  if (session.activeStageId === null) {
    return createWorkflowCompletedResult(
      context,
      {
        ...session,
        status: "completed"
      },
      context.recipe.stages[context.recipe.stages.length - 1]?.id ?? "unknown"
    );
  }

  const stage = stageById(context.recipe, session.activeStageId);
  const prerequisiteFailure = missingStagePrerequisite(session, stage);

  if (prerequisiteFailure !== null) {
    if (prerequisiteFailure.blockKind !== undefined) {
      const blockedSession: WorkflowSession = {
        ...session,
        pendingBlock: prerequisiteFailure.blockKind,
        updatedAt: context.now.toISOString()
      };
      const storedSession = await context.sessionStore.write(blockedSession);

      return createWorkflowBlockedResult(context, storedSession, {
        kind: prerequisiteFailure.blockKind,
        reasonCode: prerequisiteFailure.reasonCode,
        message: prerequisiteFailure.message,
        retryable: prerequisiteFailure.retryable
      });
    }

    return createWorkflowFailureResult(
      context,
      session,
      prerequisiteFailure.reasonCode,
      prerequisiteFailure.message,
      prerequisiteFailure.retryable
    );
  }

  if (stage.kind === "host_native") {
    const readySession: WorkflowSession = {
      ...session,
      pendingBlock: undefined,
      updatedAt: context.now.toISOString()
    };
    const storedSession = await context.sessionStore.write(readySession);

    return {
      ok: true,
      winner: context.winner,
      outcome: {
        code: "WORKFLOW_STAGE_READY",
        message: `Workflow "${context.recipe.id}" is ready at stage "${stage.id}".`
      },
      workflow: sessionView(storedSession),
      stage: stageView(stage),
      debug: context.debug,
      trace: createBrokerRoutingTrace({
        input: context.input,
        currentHost: context.currentHost,
        resultCode: "WORKFLOW_STAGE_READY",
        now: context.now,
        hostAction: null,
        candidateCount: context.debug.candidateCount,
        winner: context.winner,
        workflowId: context.recipe.id,
        runId: storedSession.runId,
        stageId: stage.id
      })
    };
  }

  const hydratedStageCards = await hydratePackageAvailability(
    [stageCapabilityCard(context.recipe, stage)],
    {
      currentHost: context.currentHost,
      brokerHomeDirectory: context.brokerHomeDirectory,
      packageSearchRoots: context.packageSearchRoots
    }
  );
  const stageCard = hydratedStageCards[0];

  if (stageCard.package.installState !== "installed") {
    const blockedSession: WorkflowSession = {
      ...session,
      pendingBlock: "install_required",
      updatedAt: context.now.toISOString()
    };
    const storedSession = await context.sessionStore.write(blockedSession);

    return createWorkflowBlockedResult(context, storedSession, {
      kind: "install_required",
      reasonCode: "INSTALL_REQUIRED",
      message: `Workflow stage "${stage.id}" needs package "${stageCard.package.packageId}" before it can run.`,
      retryable: true,
      install: installHintFromCard(stageCard)
    });
  }

  const prepared = await prepareCandidate(stageCard, {
    currentHost: context.currentHost
  });
  const handoff = buildHandoffEnvelope(
    prepared.candidate,
    {
      ...prepared.context,
      workflow: {
        workflowId: context.recipe.id,
        runId: session.runId,
        stageId: stage.id
      }
    },
    context.request
  );
  const readySession: WorkflowSession = {
    ...session,
    pendingBlock: undefined,
    updatedAt: context.now.toISOString()
  };

  const storedSession = await context.sessionStore.write(readySession);

  return {
    ok: true,
    winner: context.winner,
    outcome: {
      code: "WORKFLOW_STAGE_READY",
      message: `Workflow "${context.recipe.id}" is ready at stage "${stage.id}".`
    },
    workflow: sessionView(storedSession),
    stage: stageView(stage, handoff),
    debug: context.debug,
    trace: createBrokerRoutingTrace({
      input: context.input,
      currentHost: context.currentHost,
      resultCode: "WORKFLOW_STAGE_READY",
      now: context.now,
      hostAction: null,
      candidateCount: context.debug.candidateCount,
      winner: context.winner,
      workflowId: context.recipe.id,
      runId: storedSession.runId,
      stageId: stage.id
    })
  };
}

export async function startWorkflowRun(
  context: WorkflowRuntimeContext
): Promise<RunBrokerResult> {
  const session: WorkflowSession = {
    runId: WorkflowSessionStore.createRunId(context.now),
    workflowId: context.recipe.id,
    requestText: "task" in context.input ? context.input.task : context.input.requestText,
    request: context.request,
    host: context.currentHost,
    revision: 0,
    status: "active",
    activeStageId: context.recipe.startStageId,
    completedStageIds: [],
    artifacts: [],
    stageArtifacts: {},
    createdAt: context.now.toISOString(),
    updatedAt: context.now.toISOString()
  };

  const storedSession = await context.sessionStore.write(session, {
    expectedRevision: null
  });

  return presentCurrentStage(context, storedSession);
}

export async function resumeWorkflowRun(
  context: WorkflowResumeContext
): Promise<RunBrokerResult> {
  const session = await context.sessionStore.read(context.resume.runId);

  if (session === null) {
    return createWorkflowFailureResult(
      context,
      null,
      "UNKNOWN_RUN",
      `Workflow run "${context.resume.runId}" was not found.`,
      false
    );
  }

  if (session.workflowId !== context.recipe.id) {
    return createWorkflowFailureResult(
      context,
      session,
      "UNKNOWN_RUN",
      `Workflow run "${context.resume.runId}" does not match workflow "${context.recipe.id}".`,
      false
    );
  }

  if (session.status !== "active" || session.activeStageId === null) {
    return createWorkflowFailureResult(
      context,
      session,
      "TERMINAL_RUN",
      `Workflow run "${context.resume.runId}" is already terminal.`,
      false
    );
  }

  if (session.activeStageId !== context.resume.stageId) {
    return createWorkflowFailureResult(
      context,
      session,
      "STALE_STAGE",
      `Workflow run "${context.resume.runId}" is no longer at stage "${context.resume.stageId}".`,
      true
    );
  }

  if (session.pendingBlock !== undefined) {
    return presentCurrentStage(context, {
      ...session,
      pendingBlock: undefined,
      updatedAt: context.now.toISOString(),
      lastDecision: {
        stageId: context.resume.stageId,
        decision: context.resume.decision,
        submittedAt: context.now.toISOString()
      }
    });
  }

  const currentStage = stageById(context.recipe, session.activeStageId);
  const prerequisiteFailure = missingStagePrerequisite(session, currentStage);

  if (prerequisiteFailure !== null) {
    if (prerequisiteFailure.blockKind !== undefined) {
      return createWorkflowBlockedResult(
        context,
        {
          ...session,
          pendingBlock: prerequisiteFailure.blockKind,
          updatedAt: context.now.toISOString()
        },
        {
          kind: prerequisiteFailure.blockKind,
          reasonCode: prerequisiteFailure.reasonCode,
          message: prerequisiteFailure.message,
          retryable: prerequisiteFailure.retryable
        }
      );
    }

    return createWorkflowFailureResult(
      context,
      session,
      prerequisiteFailure.reasonCode,
      prerequisiteFailure.message,
      prerequisiteFailure.retryable
    );
  }

  const completedArtifacts = resolveCompletedArtifacts(currentStage, context.resume);

  if ("reasonCode" in completedArtifacts) {
    return createWorkflowFailureResult(
      context,
      session,
      completedArtifacts.reasonCode,
      completedArtifacts.message,
      completedArtifacts.retryable
    );
  }

  const producedArtifacts = unique([
    ...(session.artifacts ?? []),
    ...completedArtifacts.artifacts
  ]);
  const nextStageId = currentStage.nextStageId ?? null;
  const updatedSession: WorkflowSession = {
    ...session,
    activeStageId: nextStageId,
    status: nextStageId === null ? "completed" : "active",
    completedStageIds: unique([...session.completedStageIds, currentStage.id]),
    artifacts: producedArtifacts,
    stageArtifacts: {
      ...session.stageArtifacts,
      [currentStage.id]: completedArtifacts.artifacts.slice()
    },
    pendingBlock: undefined,
    updatedAt: context.now.toISOString(),
    lastDecision: {
      stageId: currentStage.id,
      decision: context.resume.decision,
      submittedAt: context.now.toISOString()
    }
  };

  let storedSession: WorkflowSession;

  try {
    storedSession = await context.sessionStore.write(updatedSession, {
      expectedRevision: session.revision
    });
  } catch (error) {
    if (error instanceof WorkflowSessionConflictError) {
      return resolveResumeConflict(context, error);
    }

    throw error;
  }

  if (storedSession.activeStageId === null) {
    return createWorkflowCompletedResult(context, storedSession, currentStage.id);
  }

  return presentCurrentStage(context, storedSession);
}
