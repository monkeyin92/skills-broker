import { mkdtemp, mkdir, rm, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import {
  appendPeerSurfaceLedgerEvent,
  createPeerSurfaceLedgerEvent,
  writePeerSurfaceManualRecoveryMarker
} from "../../src/shared-home/peer-surface-audit";
import {
  competingPeerSkillsWarning,
  detectCompetingPeerSkills,
  migrateCompetingPeerSkills
} from "../../src/shared-home/host-surface";
import { doctorSharedBrokerHome } from "../../src/shared-home/doctor";

describe("host surface management", () => {
  it("detects competing Claude peer skills next to the broker shell", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-host-surface-")
    );
    const installDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );

    try {
      await installClaudeCodeHostShell({
        installDirectory,
        brokerHomeDirectory: join(runtimeDirectory, ".skills-broker")
      });
      await mkdir(join(runtimeDirectory, ".claude", "skills", "baoyu-url-to-markdown"), {
        recursive: true
      });
      await writeFile(
        join(runtimeDirectory, ".claude", "skills", "baoyu-url-to-markdown", "SKILL.md"),
        "# direct peer skill\n",
        "utf8"
      );

      await expect(detectCompetingPeerSkills(installDirectory)).resolves.toEqual([
        "baoyu-url-to-markdown"
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("doctor warns when codex still has competing peer skills visible", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-host-surface-doctor-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });
      await mkdir(
        join(runtimeDirectory, ".agents", "skills", "baoyu-danger-x-to-markdown"),
        {
          recursive: true
        }
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });

      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "detected",
        reason: "managed by skills-broker",
        competingPeerSkills: ["baoyu-danger-x-to-markdown"],
        remediation: {
          action: "hide_competing_peer_skills",
          targetDirectory: join(
            brokerHomeDirectory,
            "downstream",
            "codex",
            "skills"
          ),
          peerSkills: ["baoyu-danger-x-to-markdown"],
          message: expect.stringContaining("Hide competing peer skills behind skills-broker")
        }
      });
      expect(result.warnings).toContain(
        competingPeerSkillsWarning("codex", ["baoyu-danger-x-to-markdown"])
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("surfaces manual recovery state in doctor output when a host-specific marker exists", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-host-surface-manual-recovery-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });
      await writePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, {
        schemaVersion: 1,
        markerId: "marker-codex-1",
        host: "codex",
        attemptId: "attempt-codex-1",
        createdAt: "2026-04-03T01:00:00.000Z",
        failurePhase: "rollback",
        failedPeers: ["baoyu-danger-x-to-markdown"],
        rollbackStatus: "failed",
        evidenceRefs: [],
        reason: "rollback failed during repair"
      });
      await appendPeerSurfaceLedgerEvent(
        brokerHomeDirectory,
        createPeerSurfaceLedgerEvent({
          eventType: "manual_recovery_required",
          host: "codex",
          actor: "skills-broker",
          result: "failed",
          evidenceRefs: [],
          attemptId: "attempt-codex-1",
          markerId: "marker-codex-1",
          details: {
            failedPeers: ["baoyu-danger-x-to-markdown"],
            failurePhase: "rollback",
            rollbackStatus: "failed",
            reason: "rollback failed during repair"
          }
        })
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      }) as {
        hosts: Array<{
          name: "codex" | "claude-code";
          status: string;
          reason?: string;
          manualRecovery?: {
            markerId: string;
            failurePhase: string;
            clearCommand: string;
          };
        }>;
        warnings: string[];
      };

      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "detected",
          reason: "managed by skills-broker",
          manualRecovery: expect.objectContaining({
            markerId: "marker-codex-1",
            failurePhase: "rollback",
            clearCommand: expect.stringContaining(
              `--broker-home ${JSON.stringify(brokerHomeDirectory)}`
            )
          })
        })
      );
      expect(result.warnings).toContainEqual(
        expect.stringContaining("manual recovery required (marker-codex-1)")
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("adopts an identical downstream peer directory without overwriting it", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-host-surface-adopt-identical-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const installDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const sourceDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );
    const targetDirectory = join(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-url-to-markdown"
    );
    const sourceSkillPath = join(sourceDirectory, "SKILL.md");
    const targetSkillPath = join(targetDirectory, "SKILL.md");

    try {
      await mkdir(sourceDirectory, { recursive: true });
      await mkdir(targetDirectory, { recursive: true });
      await writeFile(sourceSkillPath, "# peer skill\n", "utf8");
      await writeFile(targetSkillPath, "# peer skill\n", "utf8");

      const result = await migrateCompetingPeerSkills(
        "claude-code",
        installDirectory,
        brokerHomeDirectory,
        ["baoyu-url-to-markdown"]
      );

      expect(result).toEqual({
        migratedPeerSkills: ["baoyu-url-to-markdown"],
        remainingPeerSkills: [],
        warnings: []
      });
      await expect(readFile(targetSkillPath, "utf8")).resolves.toBe("# peer skill\n");
      await expect(access(sourceDirectory)).rejects.toThrow();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed when a downstream peer directory differs from the host-visible source", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-host-surface-adopt-divergent-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const installDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const sourceDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-danger-x-to-markdown"
    );
    const targetDirectory = join(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-danger-x-to-markdown"
    );
    const sourceSkillPath = join(sourceDirectory, "SKILL.md");
    const targetSkillPath = join(targetDirectory, "SKILL.md");

    try {
      await mkdir(sourceDirectory, { recursive: true });
      await mkdir(targetDirectory, { recursive: true });
      await writeFile(sourceSkillPath, "# source peer skill\n", "utf8");
      await writeFile(targetSkillPath, "# existing downstream skill\n", "utf8");

      const result = await migrateCompetingPeerSkills(
        "claude-code",
        installDirectory,
        brokerHomeDirectory,
        ["baoyu-danger-x-to-markdown"]
      );

      expect(result.migratedPeerSkills).toEqual([]);
      expect(result.remainingPeerSkills).toEqual(["baoyu-danger-x-to-markdown"]);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "failed to migrate competing peers: cannot migrate baoyu-danger-x-to-markdown because downstream target already exists"
          )
        ])
      );
      await expect(readFile(sourceSkillPath, "utf8")).resolves.toBe("# source peer skill\n");
      await expect(readFile(targetSkillPath, "utf8")).resolves.toBe(
        "# existing downstream skill\n"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
