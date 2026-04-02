import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import {
  WorkflowSessionConflictError,
  WorkflowSessionStore
} from "../../src/broker/workflow-session-store";
import { normalizeRequest } from "../../src/core/request";
import type { WorkflowSession } from "../../src/core/workflow";

function createSession(runId: string): WorkflowSession {
  return {
    runId,
    workflowId: "idea-to-ship",
    requestText: "我有一个想法：做一个自动串起评审和发版的工具",
    request: normalizeRequest({
      requestText: "我有一个想法：做一个自动串起评审和发版的工具",
      host: "codex"
    }),
    host: "codex",
    revision: 0,
    status: "active",
    activeStageId: "office-hours",
    completedStageIds: [],
    artifacts: [],
    stageArtifacts: {},
    createdAt: "2026-03-31T08:00:00.000Z",
    updatedAt: "2026-03-31T08:00:00.000Z"
  };
}

describe("workflow session store", () => {
  it("preserves concurrent writes for different runs even if one writer is slow", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-broker-session-store-"));
    const filePath = join(directory, "workflow-sessions.json");
    let delayed = false;
    const store = new WorkflowSessionStore(filePath, {
      lockRetryMs: 1,
      lockStaleMs: 100,
      lockHeartbeatMs: 10,
      onBeforePersist: async (session) => {
        if (session.runId === "run-a" && !delayed) {
          delayed = true;
          await delay(20);
        }
      }
    });

    try {
      await Promise.all([
        store.write(createSession("run-a")),
        store.write(createSession("run-b"))
      ]);

      await expect(store.read("run-a")).resolves.toMatchObject({
        runId: "run-a",
        revision: 0
      });
      await expect(store.read("run-b")).resolves.toMatchObject({
        runId: "run-b",
        revision: 0
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a stale concurrent write for the same run", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-broker-session-store-"));
    const filePath = join(directory, "workflow-sessions.json");
    let delayed = false;
    const store = new WorkflowSessionStore(filePath, {
      lockRetryMs: 1,
      lockStaleMs: 100,
      lockHeartbeatMs: 10,
      onBeforePersist: async (session) => {
        if (session.runId === "run-a" && session.revision === 1 && !delayed) {
          delayed = true;
          await delay(20);
        }
      }
    });

    try {
      const start = await store.write(createSession("run-a"));
      const next = {
        ...start,
        activeStageId: "plan-ceo-review",
        updatedAt: "2026-03-31T08:05:00.000Z"
      };
      const results = await Promise.allSettled([
        store.write(next, { expectedRevision: start.revision }),
        store.write(next, { expectedRevision: start.revision })
      ]);

      const successes = results.filter((result) => result.status === "fulfilled");
      const failures = results.filter((result) => result.status === "rejected");

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatchObject({
        reason: expect.any(WorkflowSessionConflictError)
      });
      await expect(store.read("run-a")).resolves.toMatchObject({
        runId: "run-a",
        revision: 1,
        activeStageId: "plan-ceo-review"
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reads legacy session files and migrates updated runs into per-run storage", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-broker-session-store-"));
    const filePath = join(directory, "workflow-sessions.json");
    const legacy = createSession("legacy-run");
    const store = new WorkflowSessionStore(filePath);

    try {
      await writeFile(
        filePath,
        `${JSON.stringify({ sessions: { [legacy.runId]: legacy } }, null, 2)}\n`,
        "utf8"
      );

      await expect(store.read(legacy.runId)).resolves.toEqual(legacy);

      const updated = await store.write(
        {
          ...legacy,
          activeStageId: "plan-ceo-review",
          updatedAt: "2026-03-31T08:05:00.000Z"
        },
        {
          expectedRevision: legacy.revision
        }
      );

      expect(updated).toMatchObject({
        runId: legacy.runId,
        revision: 1,
        activeStageId: "plan-ceo-review"
      });
      await expect(store.read(legacy.runId)).resolves.toMatchObject({
        runId: legacy.runId,
        revision: 1,
        activeStageId: "plan-ceo-review"
      });

      const legacyFile = JSON.parse(await readFile(filePath, "utf8")) as {
        sessions: Record<string, WorkflowSession>;
      };
      expect(legacyFile.sessions[legacy.runId]).toMatchObject({
        runId: legacy.runId,
        revision: 0,
        activeStageId: "office-hours"
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
