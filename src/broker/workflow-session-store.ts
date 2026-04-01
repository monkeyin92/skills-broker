import { randomUUID } from "node:crypto";
import { open, rm, stat } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import type { WorkflowSession } from "../core/workflow.js";
import { readJsonFile, writeJsonFile } from "../shared-home/json-file.js";

type WorkflowSessionFile = {
  sessions: Record<string, WorkflowSession>;
};

function emptySessionFile(): WorkflowSessionFile {
  return {
    sessions: {}
  };
}

const SESSION_LOCK_RETRY_MS = 10;
const SESSION_LOCK_STALE_MS = 5_000;

function normalizeSession(session: WorkflowSession): WorkflowSession {
  return {
    ...session,
    revision: typeof session.revision === "number" ? session.revision : 0
  };
}

function normalizeSessionFile(
  file: WorkflowSessionFile | null
): WorkflowSessionFile {
  if (file === null) {
    return emptySessionFile();
  }

  return {
    sessions: Object.fromEntries(
      Object.entries(file.sessions ?? {}).map(([runId, session]) => [
        runId,
        normalizeSession(session)
      ])
    )
  };
}

async function lockIsStale(lockPath: string): Promise<boolean> {
  try {
    const file = await stat(lockPath);
    return Date.now() - file.mtimeMs > SESSION_LOCK_STALE_MS;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export class WorkflowSessionConflictError extends Error {
  constructor(
    readonly runId: string,
    readonly expectedRevision: number | null,
    readonly currentSession: WorkflowSession | null
  ) {
    super(
      expectedRevision === null
        ? `Workflow run "${runId}" already exists.`
        : `Workflow run "${runId}" changed while writing revision ${expectedRevision}.`
    );
    this.name = "WorkflowSessionConflictError";
  }
}

export class WorkflowSessionStore {
  constructor(private readonly filePath: string) {}

  async read(runId: string): Promise<WorkflowSession | null> {
    const file = normalizeSessionFile(
      await readJsonFile<WorkflowSessionFile>(this.filePath)
    );
    return file.sessions[runId] ?? null;
  }

  async write(
    session: WorkflowSession,
    options: { expectedRevision?: number | null } = {}
  ): Promise<WorkflowSession> {
    return this.withFileLock(async () => {
      const file = normalizeSessionFile(
        await readJsonFile<WorkflowSessionFile>(this.filePath)
      );
      const currentSession = file.sessions[session.runId] ?? null;
      const expectedRevision = options.expectedRevision;

      if (expectedRevision === null && currentSession !== null) {
        throw new WorkflowSessionConflictError(
          session.runId,
          expectedRevision,
          currentSession
        );
      }

      if (
        typeof expectedRevision === "number" &&
        currentSession?.revision !== expectedRevision
      ) {
        throw new WorkflowSessionConflictError(
          session.runId,
          expectedRevision,
          currentSession
        );
      }

      const storedSession = normalizeSession({
        ...session,
        revision:
          currentSession === null ? 0 : currentSession.revision + 1
      });

      file.sessions[session.runId] = storedSession;
      await writeJsonFile(this.filePath, file);
      return storedSession;
    });
  }

  static createRunId(now: Date): string {
    return `${now.getTime().toString(36)}-${randomUUID().slice(0, 8)}`;
  }

  private async withFileLock<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const lockPath = `${this.filePath}.lock`;

    while (true) {
      try {
        const handle = await open(lockPath, "wx");

        try {
          return await operation();
        } finally {
          await handle.close();
          await rm(lockPath, { force: true });
        }
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;

        if (nodeError.code !== "EEXIST") {
          throw error;
        }

        if (await lockIsStale(lockPath)) {
          await rm(lockPath, { force: true });
          continue;
        }

        await delay(SESSION_LOCK_RETRY_MS);
      }
    }
  }
}
