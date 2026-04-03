import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendPeerSurfaceLedgerEvent,
  createPeerSurfaceLedgerEvent,
  inspectPeerSurfaceAuditState,
  peerSurfaceLedgerPath,
  peerSurfaceManualRecoveryMarkerPath,
  writePeerSurfaceManualRecoveryMarker
} from "../../src/shared-home/peer-surface-audit";

describe("peer-surface audit state", () => {
  it("fails closed when the ledger file contains a malformed line", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-peer-ledger-bad-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
      await writeFile(
        peerSurfaceLedgerPath(brokerHomeDirectory),
        '{"schemaVersion":1,"eventType":"repair_succeeded"}\nnot-json\n',
        "utf8"
      );

      const inspection = await inspectPeerSurfaceAuditState(
        brokerHomeDirectory,
        "claude-code"
      );

      expect(inspection.events).toEqual([]);
      expect(inspection.integrityIssues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_PEER_SURFACE_LEDGER_CORRUPT"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed when the manual recovery marker is malformed", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-peer-marker-bad-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await mkdir(join(brokerHomeDirectory, "state", "peer-surface-manual-recovery"), {
        recursive: true
      });
      await writeFile(
        peerSurfaceManualRecoveryMarkerPath(brokerHomeDirectory, "codex"),
        "{\n",
        "utf8"
      );

      const inspection = await inspectPeerSurfaceAuditState(
        brokerHomeDirectory,
        "codex"
      );

      expect(inspection.marker).toBeNull();
      expect(inspection.integrityIssues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_PEER_SURFACE_MARKER_CORRUPT"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("flags a missing marker when the ledger still records active manual recovery", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-peer-marker-missing-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await appendPeerSurfaceLedgerEvent(
        brokerHomeDirectory,
        createPeerSurfaceLedgerEvent({
          eventType: "manual_recovery_required",
          host: "codex",
          actor: "skills-broker",
          result: "failed",
          evidenceRefs: ["rollback-failed"],
          attemptId: "attempt-1",
          markerId: "marker-codex-1",
          details: {
            failedPeers: ["baoyu-danger-x-to-markdown"],
            failurePhase: "rollback",
            rollbackStatus: "failed",
            reason: "rollback failed during repair"
          }
        })
      );

      const inspection = await inspectPeerSurfaceAuditState(
        brokerHomeDirectory,
        "codex"
      );

      expect(inspection.marker).toBeNull();
      expect(inspection.integrityIssues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_PEER_SURFACE_MARKER_MISSING"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("flags an unrecorded marker when the marker exists without a ledger transition", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-peer-marker-unrecorded-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await writePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, {
        schemaVersion: 1,
        markerId: "marker-claude-1",
        host: "claude-code",
        attemptId: "attempt-1",
        createdAt: "2026-04-03T01:00:00.000Z",
        failurePhase: "rollback",
        failedPeers: ["baoyu-url-to-markdown"],
        rollbackStatus: "failed",
        evidenceRefs: ["rollback-failed"],
        reason: "rollback failed during repair"
      });

      const inspection = await inspectPeerSurfaceAuditState(
        brokerHomeDirectory,
        "claude-code"
      );

      expect(inspection.marker).toMatchObject({
        markerId: "marker-claude-1"
      });
      expect(inspection.integrityIssues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_PEER_SURFACE_MARKER_UNRECORDED"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
