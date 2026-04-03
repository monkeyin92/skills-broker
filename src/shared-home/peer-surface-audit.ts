import { randomUUID } from "node:crypto";
import { appendFile, mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { readJsonFile, writeJsonFile } from "./json-file.js";

export type PeerSurfaceHostName = "claude-code" | "codex";

export type PeerSurfaceIntegrityIssue = {
  code:
    | "BROKER_FIRST_PEER_SURFACE_LEDGER_CORRUPT"
    | "BROKER_FIRST_PEER_SURFACE_MARKER_CORRUPT"
    | "BROKER_FIRST_PEER_SURFACE_MARKER_MISSING"
    | "BROKER_FIRST_PEER_SURFACE_MARKER_UNRECORDED";
  message: string;
};

export type PeerSurfaceFailurePhase =
  | "move"
  | "append"
  | "rollback"
  | "clear_preflight"
  | "clear_delete";

export type PeerSurfaceManualRecoveryMarker = {
  schemaVersion: 1;
  markerId: string;
  host: PeerSurfaceHostName;
  attemptId: string;
  createdAt: string;
  failurePhase: PeerSurfaceFailurePhase;
  failedPeers: string[];
  rollbackStatus: "failed";
  evidenceRefs: string[];
  reason: string;
};

type PeerSurfaceRepairSucceededDetails = {
  migratedPeerSkills: string[];
};

type PeerSurfaceRepairFailedDetails = {
  competingPeerSkills: string[];
  migratedPeerSkills: string[];
  failurePhase: PeerSurfaceFailurePhase;
  rollbackStatus: "not_needed" | "succeeded" | "failed";
  reason: string;
};

type PeerSurfaceManualRecoveryRequiredDetails = {
  failedPeers: string[];
  failurePhase: PeerSurfaceFailurePhase;
  rollbackStatus: "failed";
  reason: string;
};

type PeerSurfaceClearEvidenceDetails = {
  operatorNote: string;
  verificationNote: string;
  evidenceRefs: string[];
};

type PeerSurfaceClearRejectedDetails = PeerSurfaceClearEvidenceDetails & {
  rejectionCode:
    | "BROKER_FIRST_PEER_SURFACE_CLEAR_MARKER_MISMATCH"
    | "BROKER_FIRST_PEER_SURFACE_CLEAR_INVALID_HOST_STATE"
    | "BROKER_FIRST_PEER_SURFACE_CLEAR_MARKER_MISSING";
  rejectionReason: string;
};

type PeerSurfaceClearSucceededDetails = PeerSurfaceClearEvidenceDetails;

export type PeerSurfaceLedgerEvent =
  | {
      schemaVersion: 1;
      eventId: string;
      eventType: "repair_succeeded";
      host: PeerSurfaceHostName;
      occurredAt: string;
      actor: "skills-broker";
      result: "success";
      evidenceRefs: string[];
      attemptId: string;
      details: PeerSurfaceRepairSucceededDetails;
    }
  | {
      schemaVersion: 1;
      eventId: string;
      eventType: "repair_failed";
      host: PeerSurfaceHostName;
      occurredAt: string;
      actor: "skills-broker";
      result: "failed";
      evidenceRefs: string[];
      attemptId: string;
      details: PeerSurfaceRepairFailedDetails;
    }
  | {
      schemaVersion: 1;
      eventId: string;
      eventType: "manual_recovery_required";
      host: PeerSurfaceHostName;
      occurredAt: string;
      actor: "skills-broker";
      result: "failed";
      evidenceRefs: string[];
      attemptId: string;
      markerId: string;
      details: PeerSurfaceManualRecoveryRequiredDetails;
    }
  | {
      schemaVersion: 1;
      eventId: string;
      eventType: "clear_rejected";
      host: PeerSurfaceHostName;
      occurredAt: string;
      actor: "skills-broker";
      result: "failed";
      evidenceRefs: string[];
      markerId: string;
      details: PeerSurfaceClearRejectedDetails;
    }
  | {
      schemaVersion: 1;
      eventId: string;
      eventType: "clear_succeeded";
      host: PeerSurfaceHostName;
      occurredAt: string;
      actor: "skills-broker";
      result: "success";
      evidenceRefs: string[];
      markerId: string;
      details: PeerSurfaceClearSucceededDetails;
    };

type PeerSurfaceLedgerEventType = PeerSurfaceLedgerEvent["eventType"];

type PeerSurfaceLedgerEventOf<T extends PeerSurfaceLedgerEventType> = Extract<
  PeerSurfaceLedgerEvent,
  { eventType: T }
>;

type PeerSurfaceLedgerEventInput<T extends PeerSurfaceLedgerEventType> = Omit<
  PeerSurfaceLedgerEventOf<T>,
  "schemaVersion" | "eventId" | "occurredAt"
>;

export type PeerSurfaceAuditInspection = {
  host: PeerSurfaceHostName;
  ledgerPath: string;
  markerPath: string;
  marker: PeerSurfaceManualRecoveryMarker | null;
  events: PeerSurfaceLedgerEvent[];
  integrityIssues: PeerSurfaceIntegrityIssue[];
};

const PEER_SURFACE_LOCK_RETRY_MS = 10;
const PEER_SURFACE_LOCK_STALE_MS = 5_000;
const PEER_SURFACE_LOCK_HEARTBEAT_MS = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expectString(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`missing or invalid ${field}`);
  }

  return value;
}

function expectStringArray(
  value: unknown,
  field: string
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`missing or invalid ${field}`);
  }

  return value;
}

function expectHost(value: unknown, field: string): PeerSurfaceHostName {
  if (value === "claude-code" || value === "codex") {
    return value;
  }

  throw new Error(`missing or invalid ${field}`);
}

function expectFailurePhase(
  value: unknown,
  field: string
): PeerSurfaceFailurePhase {
  switch (value) {
    case "move":
    case "append":
    case "rollback":
    case "clear_preflight":
    case "clear_delete":
      return value;
    default:
      throw new Error(`missing or invalid ${field}`);
  }
}

function expectRollbackStatus(
  value: unknown,
  field: string
): "not_needed" | "succeeded" | "failed" {
  switch (value) {
    case "not_needed":
    case "succeeded":
    case "failed":
      return value;
    default:
      throw new Error(`missing or invalid ${field}`);
  }
}

function validateManualRecoveryMarker(
  value: unknown
): PeerSurfaceManualRecoveryMarker {
  if (!isRecord(value)) {
    throw new Error("manual recovery marker must be an object");
  }

  if (value.schemaVersion !== 1) {
    throw new Error("manual recovery marker schemaVersion must be 1");
  }

  if (value.rollbackStatus !== "failed") {
    throw new Error("manual recovery marker rollbackStatus must be failed");
  }

  return {
    schemaVersion: 1,
    markerId: expectString(value.markerId, "markerId"),
    host: expectHost(value.host, "host"),
    attemptId: expectString(value.attemptId, "attemptId"),
    createdAt: expectString(value.createdAt, "createdAt"),
    failurePhase: expectFailurePhase(value.failurePhase, "failurePhase"),
    failedPeers: expectStringArray(value.failedPeers, "failedPeers"),
    rollbackStatus: "failed",
    evidenceRefs: expectStringArray(value.evidenceRefs, "evidenceRefs"),
    reason: expectString(value.reason, "reason")
  };
}

function validateLedgerEvent(
  value: unknown
): PeerSurfaceLedgerEvent {
  if (!isRecord(value)) {
    throw new Error("ledger event must be an object");
  }

  if (value.schemaVersion !== 1) {
    throw new Error("ledger event schemaVersion must be 1");
  }

  const eventType = expectString(value.eventType, "eventType");
  const base = {
    schemaVersion: 1 as const,
    eventId: expectString(value.eventId, "eventId"),
    host: expectHost(value.host, "host"),
    occurredAt: expectString(value.occurredAt, "occurredAt"),
    actor: "skills-broker" as const,
    result: expectString(value.result, "result"),
    evidenceRefs: expectStringArray(value.evidenceRefs, "evidenceRefs")
  };

  if (expectString(value.actor, "actor") !== "skills-broker") {
    throw new Error("ledger event actor must be skills-broker");
  }

  if (!isRecord(value.details)) {
    throw new Error("ledger event details must be an object");
  }

  switch (eventType) {
    case "repair_succeeded":
      if (base.result !== "success") {
        throw new Error("repair_succeeded result must be success");
      }
      return {
        ...base,
        eventType,
        result: "success",
        attemptId: expectString(value.attemptId, "attemptId"),
        details: {
          migratedPeerSkills: expectStringArray(
            value.details.migratedPeerSkills,
            "details.migratedPeerSkills"
          )
        }
      };
    case "repair_failed":
      if (base.result !== "failed") {
        throw new Error("repair_failed result must be failed");
      }
      return {
        ...base,
        eventType,
        result: "failed",
        attemptId: expectString(value.attemptId, "attemptId"),
        details: {
          competingPeerSkills: expectStringArray(
            value.details.competingPeerSkills,
            "details.competingPeerSkills"
          ),
          migratedPeerSkills: expectStringArray(
            value.details.migratedPeerSkills,
            "details.migratedPeerSkills"
          ),
          failurePhase: expectFailurePhase(
            value.details.failurePhase,
            "details.failurePhase"
          ),
          rollbackStatus: expectRollbackStatus(
            value.details.rollbackStatus,
            "details.rollbackStatus"
          ),
          reason: expectString(value.details.reason, "details.reason")
        }
      };
    case "manual_recovery_required":
      if (base.result !== "failed") {
        throw new Error("manual_recovery_required result must be failed");
      }
      if (value.details.rollbackStatus !== "failed") {
        throw new Error("manual_recovery_required rollbackStatus must be failed");
      }
      return {
        ...base,
        eventType,
        result: "failed",
        attemptId: expectString(value.attemptId, "attemptId"),
        markerId: expectString(value.markerId, "markerId"),
        details: {
          failedPeers: expectStringArray(
            value.details.failedPeers,
            "details.failedPeers"
          ),
          failurePhase: expectFailurePhase(
            value.details.failurePhase,
            "details.failurePhase"
          ),
          rollbackStatus: "failed",
          reason: expectString(value.details.reason, "details.reason")
        }
      };
    case "clear_rejected":
      if (base.result !== "failed") {
        throw new Error("clear_rejected result must be failed");
      }
      return {
        ...base,
        eventType,
        result: "failed",
        markerId: expectString(value.markerId, "markerId"),
        details: {
          operatorNote: expectString(
            value.details.operatorNote,
            "details.operatorNote"
          ),
          verificationNote: expectString(
            value.details.verificationNote,
            "details.verificationNote"
          ),
          evidenceRefs: expectStringArray(
            value.details.evidenceRefs,
            "details.evidenceRefs"
          ),
          rejectionCode: expectString(
            value.details.rejectionCode,
            "details.rejectionCode"
          ) as PeerSurfaceClearRejectedDetails["rejectionCode"],
          rejectionReason: expectString(
            value.details.rejectionReason,
            "details.rejectionReason"
          )
        }
      };
    case "clear_succeeded":
      if (base.result !== "success") {
        throw new Error("clear_succeeded result must be success");
      }
      return {
        ...base,
        eventType,
        result: "success",
        markerId: expectString(value.markerId, "markerId"),
        details: {
          operatorNote: expectString(
            value.details.operatorNote,
            "details.operatorNote"
          ),
          verificationNote: expectString(
            value.details.verificationNote,
            "details.verificationNote"
          ),
          evidenceRefs: expectStringArray(
            value.details.evidenceRefs,
            "details.evidenceRefs"
          )
        }
      };
    default:
      throw new Error(`unknown eventType ${eventType}`);
  }
}

async function lockIsStale(
  lockPath: string,
  staleWindowMs: number
): Promise<boolean> {
  try {
    const lockFile = await stat(lockPath);
    return Date.now() - lockFile.mtimeMs > staleWindowMs;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function latestHostManualRecoveryEvent(
  events: PeerSurfaceLedgerEvent[],
  host: PeerSurfaceHostName
): Extract<
  PeerSurfaceLedgerEvent,
  { eventType: "manual_recovery_required" }
> | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.host !== host) {
      continue;
    }

    if (event.eventType === "clear_succeeded") {
      return null;
    }

    if (event.eventType === "manual_recovery_required") {
      return event;
    }
  }

  return null;
}

export function peerSurfaceLedgerPath(
  brokerHomeDirectory: string
): string {
  return join(brokerHomeDirectory, "state", "peer-surface-repairs.jsonl");
}

export function peerSurfaceManualRecoveryMarkerPath(
  brokerHomeDirectory: string,
  host: PeerSurfaceHostName
): string {
  return join(
    brokerHomeDirectory,
    "state",
    "peer-surface-manual-recovery",
    `${host}.json`
  );
}

function peerSurfaceHostLockPath(
  brokerHomeDirectory: string,
  host: PeerSurfaceHostName
): string {
  return join(
    brokerHomeDirectory,
    "state",
    "peer-surface-locks",
    `${host}.lock`
  );
}

export function recommendedManualRecoveryClearCommand(
  host: PeerSurfaceHostName,
  markerId: string,
  brokerHomeDirectory?: string
): string {
  const brokerHomeFlag =
    brokerHomeDirectory === undefined
      ? ""
      : ` --broker-home ${JSON.stringify(brokerHomeDirectory)}`;

  return `npx skills-broker update --clear-manual-recovery${brokerHomeFlag} --host ${host} --marker-id ${markerId} --operator-note <note> --verification-note <note> --evidence-ref <ref>`;
}

export async function readPeerSurfaceLedger(
  brokerHomeDirectory: string
): Promise<PeerSurfaceLedgerEvent[]> {
  const filePath = peerSurfaceLedgerPath(brokerHomeDirectory);

  try {
    const raw = await readFile(filePath, "utf8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((line, index) => {
      try {
        return validateLedgerEvent(JSON.parse(line));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `BROKER_FIRST_PEER_SURFACE_LEDGER_CORRUPT: invalid ledger line ${index + 1}: ${message}`
        );
      }
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function readPeerSurfaceManualRecoveryMarker(
  brokerHomeDirectory: string,
  host: PeerSurfaceHostName
): Promise<PeerSurfaceManualRecoveryMarker | null> {
  const marker = await readJsonFile<PeerSurfaceManualRecoveryMarker>(
    peerSurfaceManualRecoveryMarkerPath(brokerHomeDirectory, host)
  );

  if (marker === null) {
    return null;
  }

  try {
    return validateManualRecoveryMarker(marker);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`BROKER_FIRST_PEER_SURFACE_MARKER_CORRUPT: ${message}`);
  }
}

export async function inspectPeerSurfaceAuditState(
  brokerHomeDirectory: string,
  host: PeerSurfaceHostName
): Promise<PeerSurfaceAuditInspection> {
  const integrityIssues: PeerSurfaceIntegrityIssue[] = [];
  let events: PeerSurfaceLedgerEvent[] = [];
  let marker: PeerSurfaceManualRecoveryMarker | null = null;

  try {
    events = await readPeerSurfaceLedger(brokerHomeDirectory);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    integrityIssues.push({
      code: "BROKER_FIRST_PEER_SURFACE_LEDGER_CORRUPT",
      message
    });
  }

  try {
    marker = await readPeerSurfaceManualRecoveryMarker(brokerHomeDirectory, host);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    integrityIssues.push({
      code: "BROKER_FIRST_PEER_SURFACE_MARKER_CORRUPT",
      message
    });
  }

  if (integrityIssues.length === 0) {
    const latestManualRecoveryEvent = latestHostManualRecoveryEvent(events, host);

    if (marker !== null && latestManualRecoveryEvent === null) {
      integrityIssues.push({
        code: "BROKER_FIRST_PEER_SURFACE_MARKER_UNRECORDED",
        message: `${host}: manual recovery marker ${marker.markerId} exists without a matching ledger transition`
      });
    }

    if (
      marker !== null &&
      latestManualRecoveryEvent !== null &&
      latestManualRecoveryEvent.markerId !== marker.markerId
    ) {
      integrityIssues.push({
        code: "BROKER_FIRST_PEER_SURFACE_MARKER_UNRECORDED",
        message: `${host}: manual recovery marker ${marker.markerId} does not match latest ledger marker ${latestManualRecoveryEvent.markerId}`
      });
    }

    if (marker === null && latestManualRecoveryEvent !== null) {
      integrityIssues.push({
        code: "BROKER_FIRST_PEER_SURFACE_MARKER_MISSING",
        message: `${host}: ledger still records active manual recovery marker ${latestManualRecoveryEvent.markerId}, but the marker file is missing`
      });
    }
  }

  return {
    host,
    ledgerPath: peerSurfaceLedgerPath(brokerHomeDirectory),
    markerPath: peerSurfaceManualRecoveryMarkerPath(brokerHomeDirectory, host),
    marker,
    events,
    integrityIssues
  };
}

export async function appendPeerSurfaceLedgerEvent(
  brokerHomeDirectory: string,
  event: PeerSurfaceLedgerEvent
): Promise<PeerSurfaceLedgerEvent> {
  const validatedEvent = validateLedgerEvent(event);
  const filePath = peerSurfaceLedgerPath(brokerHomeDirectory);

  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(validatedEvent)}\n`, "utf8");
  return validatedEvent;
}

export async function writePeerSurfaceManualRecoveryMarker(
  brokerHomeDirectory: string,
  marker: PeerSurfaceManualRecoveryMarker
): Promise<PeerSurfaceManualRecoveryMarker> {
  const validatedMarker = validateManualRecoveryMarker(marker);
  await writeJsonFile(
    peerSurfaceManualRecoveryMarkerPath(
      brokerHomeDirectory,
      validatedMarker.host
    ),
    validatedMarker
  );
  return validatedMarker;
}

export async function deletePeerSurfaceManualRecoveryMarker(
  brokerHomeDirectory: string,
  host: PeerSurfaceHostName
): Promise<void> {
  await rm(
    peerSurfaceManualRecoveryMarkerPath(brokerHomeDirectory, host),
    { force: true }
  );
}

export function createPeerSurfaceLedgerEvent(
  event: PeerSurfaceLedgerEventInput<"repair_succeeded">
): PeerSurfaceLedgerEventOf<"repair_succeeded">;
export function createPeerSurfaceLedgerEvent(
  event: PeerSurfaceLedgerEventInput<"repair_failed">
): PeerSurfaceLedgerEventOf<"repair_failed">;
export function createPeerSurfaceLedgerEvent(
  event: PeerSurfaceLedgerEventInput<"manual_recovery_required">
): PeerSurfaceLedgerEventOf<"manual_recovery_required">;
export function createPeerSurfaceLedgerEvent(
  event: PeerSurfaceLedgerEventInput<"clear_rejected">
): PeerSurfaceLedgerEventOf<"clear_rejected">;
export function createPeerSurfaceLedgerEvent(
  event: PeerSurfaceLedgerEventInput<"clear_succeeded">
): PeerSurfaceLedgerEventOf<"clear_succeeded">;
export function createPeerSurfaceLedgerEvent(
  event: Omit<PeerSurfaceLedgerEvent, "schemaVersion" | "eventId" | "occurredAt">
): PeerSurfaceLedgerEvent {
  return {
    ...event,
    schemaVersion: 1,
    eventId: randomUUID(),
    occurredAt: new Date().toISOString()
  } as PeerSurfaceLedgerEvent;
}

export async function withPeerSurfaceHostLock<T>(
  brokerHomeDirectory: string,
  host: PeerSurfaceHostName,
  operation: () => Promise<T>
): Promise<T> {
  const lockPath = peerSurfaceHostLockPath(brokerHomeDirectory, host);

  await mkdir(join(brokerHomeDirectory, "state", "peer-surface-locks"), {
    recursive: true
  });

  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      const heartbeat = setInterval(() => {
        void handle.utimes(new Date(), new Date()).catch(() => undefined);
      }, PEER_SURFACE_LOCK_HEARTBEAT_MS);
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

      if (await lockIsStale(lockPath, PEER_SURFACE_LOCK_STALE_MS)) {
        await rm(lockPath, { force: true });
        continue;
      }

      await delay(PEER_SURFACE_LOCK_RETRY_MS);
    }
  }
}
