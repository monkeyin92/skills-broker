import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runBroker } from "../../src/broker/run";
import { WorkflowSessionStore } from "../../src/broker/workflow-session-store";
import { normalizeRequest } from "../../src/core/request";
import type { WorkflowSession } from "../../src/core/workflow";

const ideaRequest = {
  requestText: "我有一个想法：做一个自动串起评审和发版的工具",
  host: "codex" as const
};

async function createRuntimePaths() {
  const directory = await mkdtemp(join(tmpdir(), "skills-broker-workflow-"));

  return {
    directory,
    cacheFilePath: join(directory, "broker-cache.json"),
    workflowSessionFilePath: join(directory, "workflow-sessions.json"),
    hostCatalogFilePath: join(directory, "host-skills.seed.json"),
    packageSearchRoots: [join(directory, "empty-skill-roots")]
  };
}

async function seedHostCatalog(
  filePath: string,
  mutate?: (catalog: Record<string, unknown>) => void
): Promise<void> {
  const catalog = JSON.parse(
    await readFile(join(process.cwd(), "config", "host-skills.seed.json"), "utf8")
  ) as Record<string, unknown>;

  mutate?.(catalog);
  await writeFile(filePath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

async function resumeWorkflow(
  runtime: Awaited<ReturnType<typeof createRuntimePaths>>,
  runId: string,
  stageId: string,
  now: string,
  artifacts?: string[]
) {
  return runBroker(
    {
      requestText: "继续这个 workflow",
      host: "codex",
      workflowResume: {
        runId,
        stageId,
        decision: "confirm",
        artifacts
      }
    },
    {
      ...runtime,
      now: new Date(now)
    }
  );
}

describe("workflow runtime", () => {
  it("starts the idea-to-ship workflow with a runId and active stage", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const result = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("WORKFLOW_STAGE_READY");
      expect(result.winner.id).toBe("idea-to-ship");
      expect(result.workflow).toMatchObject({
        workflowId: "idea-to-ship",
        activeStageId: "office-hours",
        completedStageIds: []
      });
      expect(result.workflow.runId).toMatch(/[a-z0-9-]+/);
      expect(result.stage).toMatchObject({
        id: "office-hours",
        kind: "capability",
        requiresExplicitArtifacts: true
      });
      expect(result.stage.handoff?.chosenImplementation.id).toBe(
        "gstack.office_hours"
      );
      expect(result.trace).toMatchObject({
        resultCode: "WORKFLOW_STAGE_READY",
        workflowId: "idea-to-ship",
        runId: result.workflow.runId,
        stageId: "office-hours"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("resumes the same run and advances to the next stage", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const firstResult = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });

      expect(firstResult.outcome.code).toBe("WORKFLOW_STAGE_READY");

      const secondResult = await resumeWorkflow(
        runtime,
        firstResult.workflow.runId,
        firstResult.stage.id,
        "2026-03-31T08:05:00.000Z",
        ["design_doc", "analysis"]
      );

      expect(secondResult.ok).toBe(true);
      expect(secondResult.outcome.code).toBe("WORKFLOW_STAGE_READY");
      expect(secondResult.workflow.runId).toBe(firstResult.workflow.runId);
      expect(secondResult.workflow.completedStageIds).toContain("office-hours");
      expect(secondResult.stage.id).toBe("plan-ceo-review");
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("returns a structured stale-stage failure on duplicate submission", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const firstResult = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });
      const secondResult = await resumeWorkflow(
        runtime,
        firstResult.workflow.runId,
        firstResult.stage.id,
        "2026-03-31T08:05:00.000Z",
        ["design_doc", "analysis"]
      );

      expect(secondResult.outcome.code).toBe("WORKFLOW_STAGE_READY");

      const staleResult = await resumeWorkflow(
        runtime,
        firstResult.workflow.runId,
        firstResult.stage.id,
        "2026-03-31T08:06:00.000Z",
        ["design_doc", "analysis"]
      );

      expect(staleResult.ok).toBe(false);
      expect(staleResult.outcome.code).toBe("WORKFLOW_FAILED");
      expect(staleResult.failure).toEqual({
        reasonCode: "STALE_STAGE",
        retryable: true,
        runId: firstResult.workflow.runId,
        stageId: "plan-ceo-review"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("requires explicit artifacts before a stage with outputs can advance", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const start = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });

      const failed = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        start.stage.id,
        "2026-03-31T08:05:00.000Z"
      );

      expect(failed.ok).toBe(false);
      expect(failed.outcome.code).toBe("WORKFLOW_FAILED");
      expect(failed.failure).toEqual({
        reasonCode: "MISSING_ARTIFACTS",
        retryable: true,
        runId: start.workflow.runId,
        stageId: "office-hours"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("rejects undeclared artifacts on workflow resume", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const start = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });

      const failed = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        start.stage.id,
        "2026-03-31T08:05:00.000Z",
        ["review_approved"]
      );

      expect(failed.ok).toBe(false);
      expect(failed.outcome.code).toBe("WORKFLOW_FAILED");
      expect(failed.failure).toEqual({
        reasonCode: "INVALID_ARTIFACTS",
        retryable: true,
        runId: start.workflow.runId,
        stageId: "office-hours"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("allows only one concurrent resume to advance the run", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const start = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });

      const [left, right] = await Promise.all([
        resumeWorkflow(
          runtime,
          start.workflow.runId,
          start.stage.id,
          "2026-03-31T08:05:00.000Z",
          ["design_doc", "analysis"]
        ),
        resumeWorkflow(
          runtime,
          start.workflow.runId,
          start.stage.id,
          "2026-03-31T08:05:00.000Z",
          ["design_doc", "analysis"]
        )
      ]);

      const outcomes = [left, right].map((result) => result.outcome.code).sort();

      expect(outcomes).toEqual(["WORKFLOW_FAILED", "WORKFLOW_STAGE_READY"]);
      expect([left, right]).toContainEqual(
        expect.objectContaining({
          failure: {
            reasonCode: "STALE_STAGE",
            retryable: true,
            runId: start.workflow.runId,
            stageId: "plan-ceo-review"
          }
        })
      );
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("treats coding as a host-native stage and rejects terminal resumes", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const start = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });
      const afterOfficeHours = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        start.stage.id,
        "2026-03-31T08:05:00.000Z",
        ["design_doc", "analysis"]
      );
      const afterCeo = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        afterOfficeHours.stage.id,
        "2026-03-31T08:10:00.000Z",
        ["ceo_review"]
      );
      const afterEng = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        afterCeo.stage.id,
        "2026-03-31T08:12:00.000Z",
        ["execution_plan"]
      );

      expect(afterEng.stage).toMatchObject({
        id: "coding",
        kind: "host_native",
        producesArtifacts: ["code_change"],
        requiresExplicitArtifacts: true
      });

      const afterCoding = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        afterEng.stage.id,
        "2026-03-31T08:15:00.000Z",
        ["code_change"]
      );
      const afterReview = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        afterCoding.stage.id,
        "2026-03-31T08:20:00.000Z",
        ["review_approved"]
      );
      const shipReady = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        afterReview.stage.id,
        "2026-03-31T08:25:00.000Z",
        ["qa_report"]
      );
      const completed = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        shipReady.stage.id,
        "2026-03-31T08:30:00.000Z"
      );

      expect(completed.ok).toBe(true);
      expect(completed.outcome.code).toBe("WORKFLOW_COMPLETED");
      expect(completed.workflow.status).toBe("completed");

      const terminalResume = await resumeWorkflow(
        runtime,
        start.workflow.runId,
        shipReady.stage.id,
        "2026-03-31T08:31:00.000Z"
      );

      expect(terminalResume.ok).toBe(false);
      expect(terminalResume.outcome.code).toBe("WORKFLOW_FAILED");
      expect(terminalResume.failure).toEqual({
        reasonCode: "TERMINAL_RUN",
        retryable: false,
        runId: start.workflow.runId,
        stageId: undefined
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("blocks on install_required and resumes the same run after install", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath, (catalog) => {
      const packages = catalog.packages as Array<Record<string, unknown>>;
      const gstackPackage = packages.find((pkg) => pkg.packageId === "gstack");

      if (gstackPackage !== undefined) {
        gstackPackage.installState = "available";
      }
    });

    try {
      const blocked = await runBroker(ideaRequest, {
        ...runtime,
        now: new Date("2026-03-31T08:00:00.000Z")
      });

      expect(blocked.ok).toBe(true);
      expect(blocked.outcome.code).toBe("WORKFLOW_BLOCKED");
      expect(blocked.block).toMatchObject({
        kind: "install_required",
        reasonCode: "INSTALL_REQUIRED",
        retryable: true
      });
      expect(blocked.workflow.activeStageId).toBe("office-hours");

      await seedHostCatalog(runtime.hostCatalogFilePath);

      const resumed = await resumeWorkflow(
        runtime,
        blocked.workflow.runId,
        blocked.workflow.activeStageId!,
        "2026-03-31T08:05:00.000Z"
      );

      expect(resumed.ok).toBe(true);
      expect(resumed.outcome.code).toBe("WORKFLOW_STAGE_READY");
      expect(resumed.workflow.runId).toBe(blocked.workflow.runId);
      expect(resumed.stage.id).toBe("office-hours");
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("blocks ship until review and QA are complete", async () => {
    const runtime = await createRuntimePaths();
    await seedHostCatalog(runtime.hostCatalogFilePath);

    try {
      const sessionStore = new WorkflowSessionStore(runtime.workflowSessionFilePath);
      const request = normalizeRequest(ideaRequest);
      const session: WorkflowSession = {
        runId: "manual-run",
        workflowId: "idea-to-ship",
        requestText: ideaRequest.requestText,
        request,
        host: "codex",
        revision: 0,
        status: "active",
        activeStageId: "ship",
        completedStageIds: [
          "office-hours",
          "plan-ceo-review",
          "plan-eng-review",
          "coding"
        ],
        artifacts: ["design_doc", "analysis", "execution_plan", "code_change"],
        stageArtifacts: {},
        createdAt: "2026-03-31T08:00:00.000Z",
        updatedAt: "2026-03-31T08:00:00.000Z"
      };
      await sessionStore.write(session);

      const blocked = await resumeWorkflow(
        runtime,
        session.runId,
        "ship",
        "2026-03-31T08:05:00.000Z"
      );

      expect(blocked.ok).toBe(true);
      expect(blocked.outcome.code).toBe("WORKFLOW_BLOCKED");
      expect(blocked.block).toMatchObject({
        kind: "gate",
        reasonCode: "SHIP_GATE_BLOCKED",
        retryable: true
      });
      expect(blocked.workflow.runId).toBe("manual-run");
      expect(blocked.workflow.activeStageId).toBe("ship");
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });
});
