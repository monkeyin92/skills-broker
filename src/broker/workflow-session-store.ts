import { randomUUID } from "node:crypto";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { BrokerRequest } from "../core/types.js";
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
const SESSION_LOCK_HEARTBEAT_MS = 1_000;

type WorkflowSessionStoreOptions = {
  lockRetryMs?: number;
  lockStaleMs?: number;
  lockHeartbeatMs?: number;
  onBeforePersist?: (session: WorkflowSession) => Promise<void> | void;
};

function normalizeSessionRequest(request: BrokerRequest): BrokerRequest {
  return {
    outputMode: request.outputMode,
    url: request.url,
    capabilityQuery: request.capabilityQuery
  };
}

function normalizeSession(session: WorkflowSession): WorkflowSession {
  return {
    ...session,
    request: normalizeSessionRequest(session.request),
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

async function lockIsStale(
  lockPath: string,
  staleWindowMs: number
): Promise<boolean> {
  try {
    const file = await stat(lockPath);
    return Date.now() - file.mtimeMs > staleWindowMs;
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
  constructor(
    private readonly filePath: string,
    private readonly options: WorkflowSessionStoreOptions = {}
  ) {}

  async read(runId: string): Promise<WorkflowSession | null> {
    const session = await readJsonFile<WorkflowSession>(
      this.sessionFilePath(runId)
    );

    if (session !== null) {
      return normalizeSession(session);
    }

    const legacyFile = normalizeSessionFile(
      await readJsonFile<WorkflowSessionFile>(this.filePath)
    );
    return legacyFile.sessions[runId] ?? null;
  }

  async write(
    session: WorkflowSession,
    options: { expectedRevision?: number | null } = {}
  ): Promise<WorkflowSession> {
    return this.withFileLock(session.runId, async () => {
      const currentSession = await this.read(session.runId);
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

      await this.options.onBeforePersist?.(storedSession);
      await writeJsonFile(this.sessionFilePath(session.runId), storedSession);
      return storedSession;
    });
  }

  static createRunId(now: Date): string {
    return `${now.getTime().toString(36)}-${randomUUID().slice(0, 8)}`;
  }

  private sessionFilePath(runId: string): string {
    return join(this.sessionDirectoryPath(), `${encodeURIComponent(runId)}.json`);
  }

  private sessionDirectoryPath(): string {
    return `${this.filePath}.d`;
  }

  private async withFileLock<T>(
    runId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockPath = `${this.sessionFilePath(runId)}.lock`;
    const retryMs = this.options.lockRetryMs ?? SESSION_LOCK_RETRY_MS;
    const staleMs = this.options.lockStaleMs ?? SESSION_LOCK_STALE_MS;
    const heartbeatMs =
      this.options.lockHeartbeatMs ?? SESSION_LOCK_HEARTBEAT_MS;

    await mkdir(this.sessionDirectoryPath(), { recursive: true });

    while (true) {
      try {
        const handle = await open(lockPath, "wx");
        const heartbeat = setInterval(() => {
          void handle.utimes(new Date(), new Date()).catch(() => undefined);
        }, heartbeatMs);
        heartbeat.unref?.();

        try {
          return await operation();
        } finally {
          clearInterval(heartbeat);
          await handle.close();
          await rm(lockPath, { force: true });
        }
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;

        if (nodeError.code !== "EEXIST") {
          throw error;
        }

        if (await lockIsStale(lockPath, staleMs)) {
          await rm(lockPath, { force: true });
          continue;
        }

        await delay(retryMs);
      }
    }
  }
}
