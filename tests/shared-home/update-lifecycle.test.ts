import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import {
  brokerFirstGateArtifactPath,
  evaluateBrokerFirstGate
} from "../../src/shared-home/broker-first-gate";
import { detectWritableDirectory } from "../../src/shared-home/detect";
import { installSharedBrokerHome } from "../../src/shared-home/install";
import {
  detectLifecycleHostTargets,
  resolveLifecyclePaths
} from "../../src/shared-home/paths";
import { readManagedShellManifest } from "../../src/shared-home/ownership";
import {
  appendPeerSurfaceLedgerEvent,
  createPeerSurfaceLedgerEvent,
  readPeerSurfaceLedger,
  readPeerSurfaceManualRecoveryMarker,
  writePeerSurfaceManualRecoveryMarker
} from "../../src/shared-home/peer-surface-audit";
import * as peerSurfaceAudit from "../../src/shared-home/peer-surface-audit";
import * as hostSurface from "../../src/shared-home/host-surface";
import { updateSharedBrokerHome } from "../../src/shared-home/update";

async function seedManualRecovery(
  brokerHomeDirectory: string,
  host: "claude-code" | "codex",
  markerId: string,
  failedPeers: string[]
): Promise<void> {
  const attemptId = `${host}-attempt-1`;
  await writePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, {
    schemaVersion: 1,
    markerId,
    host,
    attemptId,
    createdAt: "2026-04-03T01:00:00.000Z",
    failurePhase: "rollback",
    failedPeers,
    rollbackStatus: "failed",
    evidenceRefs: [],
    reason: "rollback failed during repair"
  });
  await appendPeerSurfaceLedgerEvent(
    brokerHomeDirectory,
    createPeerSurfaceLedgerEvent({
      eventType: "manual_recovery_required",
      host,
      actor: "skills-broker",
      result: "failed",
      evidenceRefs: [],
      attemptId,
      markerId,
      details: {
        failedPeers,
        failurePhase: "rollback",
        rollbackStatus: "failed",
        reason: "rollback failed during repair"
      }
    })
  );
}

const BROKEN_BAOYU_FETCH_CLI = `#!/usr/bin/env bun
var __require = import.meta.require;
var syncWorkerFile = __require.resolve ? __require.resolve("/Users/jimliu/GitHub/baoyu-skills/node_modules/jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js") : null;
`;

const FIXED_BAOYU_FETCH_CLI_FRAGMENT =
  'fileURLToPath(new URL("../../jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js", import.meta.url))';

async function writeBrokenBaoyuFetchCli(skillDirectory: string): Promise<string> {
  const cliPath = join(
    skillDirectory,
    "scripts",
    "node_modules",
    "baoyu-fetch",
    "dist",
    "cli.js"
  );

  await mkdir(join(skillDirectory, "scripts", "node_modules", "baoyu-fetch", "dist"), {
    recursive: true
  });
  await writeFile(cliPath, BROKEN_BAOYU_FETCH_CLI, "utf8");

  return cliPath;
}

describe("shared-home lifecycle paths", () => {
  it("prefers overrides but falls back to ~/.skills-broker and default host dirs", () => {
    const paths = resolveLifecyclePaths({
      brokerHomeOverride: undefined,
      claudeDirOverride: undefined,
      codexDirOverride: undefined,
      opencodeDirOverride: undefined,
      homeDirectory: "/tmp/home"
    });

    expect(paths.brokerHomeDirectory).toBe("/tmp/home/.skills-broker");
    expect(paths.claudeCodeInstallDirectory).toBe("/tmp/home/.claude/skills/skills-broker");
    expect(paths.codexInstallDirectory).toBe("/tmp/home/.agents/skills/skills-broker");
    expect(paths.opencodeInstallDirectory).toBe(
      "/tmp/home/.config/opencode/skills/skills-broker"
    );
  });

  it("resolves an explicit OpenCode install directory override", () => {
    const paths = resolveLifecyclePaths({
      homeDirectory: "/tmp/home",
      opencodeDirOverride: "/tmp/custom/opencode-shell"
    });

    expect(paths.opencodeInstallDirectory).toBe("/tmp/custom/opencode-shell");
  });

  it("detects OpenCode roots in both ~/.config/opencode and ~/.opencode", async () => {
    const xdgRuntimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-opencode-xdg-")
    );
    const legacyRuntimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-opencode-legacy-")
    );

    try {
      await mkdir(join(xdgRuntimeDirectory, ".config", "opencode"), {
        recursive: true
      });
      await mkdir(join(legacyRuntimeDirectory, ".opencode"), {
        recursive: true
      });

      const xdgTargets = await detectLifecycleHostTargets({
        homeDirectory: xdgRuntimeDirectory
      });
      const legacyTargets = await detectLifecycleHostTargets({
        homeDirectory: legacyRuntimeDirectory
      });

      expect(xdgTargets.opencode).toEqual({
        installDirectory: join(
          xdgRuntimeDirectory,
          ".config",
          "opencode",
          "skills",
          "skills-broker"
        )
      });
      expect(legacyTargets.opencode).toEqual({
        installDirectory: join(
          legacyRuntimeDirectory,
          ".opencode",
          "skills",
          "skills-broker"
        )
      });
    } finally {
      await rm(xdgRuntimeDirectory, { recursive: true, force: true });
      await rm(legacyRuntimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports an OpenCode missing-root hint that points to --opencode-dir", async () => {
    const targets = await detectLifecycleHostTargets({
      homeDirectory: "/tmp/missing-opencode-home"
    });

    expect(targets.opencode).toEqual({
      reason: expect.stringContaining("--opencode-dir")
    });
  });

  it("treats a missing target directory with a writable parent as creatable", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-detect-writable-")
    );
    const targetDirectory = join(runtimeDirectory, "nested", "target");
    const parentDirectory = join(runtimeDirectory, "nested");

    try {
      await mkdir(parentDirectory, { recursive: true });

      const state = await detectWritableDirectory(targetDirectory);

      expect(state.status).toBe("writable");
      expect(state.nearestExistingDirectory).toBe(parentDirectory);
      expect(state.checkedDirectory).toBe(parentDirectory);
      expect(state.targetExists).toBe(false);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("returns not-writable when an ancestor component is a file", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-detect-blocked-")
    );
    const blockedDirectory = join(runtimeDirectory, "blocked");
    const targetDirectory = join(blockedDirectory, "child");

    try {
      await writeFile(blockedDirectory, "blocked", "utf8");

      const state = await detectWritableDirectory(targetDirectory);

      expect(state.status).toBe("not-writable");
      expect(state.reason).toBe("not-a-directory");
      expect(state.blockingPath).toBe(blockedDirectory);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("writes an ownership manifest for managed host shells", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-owned-shell-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory
      });

      const manifest = JSON.parse(
        await readFile(join(result.installDirectory, ".skills-broker.json"), "utf8")
      ) as { managedBy?: string };

      expect(manifest.managedBy).toBe("skills-broker");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reads a managed shell manifest from the shell directory", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-detect-shell-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory
      });

      const manifest = await readManagedShellManifest(codexShellDirectory);

      expect(manifest.status).toBe("managed");
      expect(manifest.manifest).toMatchObject({
        managedBy: "skills-broker",
        host: "codex",
        brokerHome: brokerHomeDirectory
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes a foreign ownership manifest", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-foreign-manifest-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexShellDirectory, { recursive: true });

      await writeFile(
        join(codexShellDirectory, ".skills-broker.json"),
        `${JSON.stringify({ managedBy: "other-tool", host: "codex" }, null, 2)}\n`,
        "utf8"
      );

      const manifest = await readManagedShellManifest(codexShellDirectory);

      expect(manifest.status).toBe("foreign");
      expect(manifest.manifest.managedBy).toBe("other-tool");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes a damaged ownership manifest", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-invalid-manifest-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexShellDirectory, { recursive: true });

      await writeFile(join(codexShellDirectory, ".skills-broker.json"), "{", "utf8");

      const manifest = await readManagedShellManifest(codexShellDirectory);

      expect(manifest.status).toBe("invalid-json");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("dry-run reports planned installs without writing files", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-dry-run-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory,
        dryRun: true
      });

      expect(result.command).toBe("update");
      expect(result.dryRun).toBe(true);
      expect(result.status).toBe("success");
      expect(result.adoptionHealth.status).toBe("inactive");
      expect(result.sharedHome).toMatchObject({
        path: brokerHomeDirectory,
        status: "planned"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "planned_install"
      });
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "skipped_not_detected",
        reason: expect.stringContaining("--claude-dir")
      });
      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "skipped_not_detected",
        reason: expect.stringContaining("--opencode-dir")
      });
      await expect(access(join(codexInstallDirectory, "SKILL.md"))).rejects.toThrow();
      await expect(access(join(brokerHomeDirectory, "package.json"))).rejects.toThrow();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("auto-detects official Claude Code and Codex roots for zero-arg updates", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-auto-detect-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await mkdir(join(runtimeDirectory, ".claude"), { recursive: true });
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        dryRun: true
      });

      expect(result.status).toBe("success");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "planned_install"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "planned_install"
      });
      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "skipped_not_detected",
        reason: expect.stringContaining("--opencode-dir")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("installs an OpenCode shell through the shared update path", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-opencode-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const opencodeInstallDirectory = join(
      runtimeDirectory,
      "custom-opencode",
      "skills-broker"
    );

    try {
      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        opencodeInstallDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.status).toBe("success");
      expect(result.adoptionHealth).toMatchObject({
        status: "green",
        managedHosts: ["opencode"]
      });
      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "installed"
      });

      const manifest = await readManagedShellManifest(opencodeInstallDirectory);

      expect(manifest.status).toBe("managed");
      if (manifest.status === "managed") {
        expect(manifest.manifest).toMatchObject({
          host: "opencode",
          brokerHome: brokerHomeDirectory
        });
      }

      await expect(access(join(opencodeInstallDirectory, "SKILL.md"))).resolves.toBeUndefined();
      await expect(
        access(join(opencodeInstallDirectory, "bin", "run-broker"))
      ).resolves.toBeUndefined();
      await expect(
        readFile(join(opencodeInstallDirectory, "SKILL.md"), "utf8")
      ).resolves.toContain('"host":"opencode"');
      await expect(
        readFile(join(opencodeInstallDirectory, "SKILL.md"), "utf8")
      ).resolves.toContain('"invocationMode":"explicit"');
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("continues when one host conflicts and the other installs", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-partial-success-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeFile(
        join(codexInstallDirectory, ".skills-broker.json"),
        `${JSON.stringify({ managedBy: "other-tool", host: "codex" }, null, 2)}\n`,
        "utf8"
      );

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory
      });

      expect(result.status).toBe("degraded_success");
      expect(result.sharedHome).toMatchObject({
        path: brokerHomeDirectory,
        status: "installed"
      });
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "installed"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "skipped_conflict",
        reason: "foreign ownership manifest"
      });
      await expect(access(join(claudeCodeInstallDirectory, "SKILL.md"))).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("materializes a fresh broker-first gate artifact on successful update", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-gate-artifact-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const artifactPath = brokerFirstGateArtifactPath(brokerHomeDirectory);

    try {
      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory
      });
      const gate = await evaluateBrokerFirstGate({
        brokerHomeDirectory
      });

      expect(result.status).toBe("success");
      await expect(readFile(artifactPath, "utf8")).resolves.toContain(
        "\"phase2Boundary\": \"pass\""
      );
      expect(gate.hasStrictIssues).toBe(false);
      expect(gate.freshness.state).toBe("fresh");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("warns when a managed broker shell still has competing peer skills beside it", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-warning-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(join(runtimeDirectory, ".claude", "skills", "baoyu-url-to-markdown"), {
        recursive: true
      });

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.status).toBe("degraded_success");
      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "installed",
        competingPeerSkills: ["baoyu-url-to-markdown"],
        remediation: {
          action: "hide_competing_peer_skills",
          targetDirectory: join(
            brokerHomeDirectory,
            "downstream",
            "claude-code",
            "skills"
          ),
          peerSkills: ["baoyu-url-to-markdown"],
          message: expect.stringContaining("Hide competing peer skills behind skills-broker")
        }
      });
      expect(result.warnings).toContain(
        "claude-code: competing peer skills detected (baoyu-url-to-markdown); broker-first hit rate may be reduced until these peer skills are hidden behind skills-broker"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("repairs the host surface by migrating competing peer skills behind broker home", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-repair-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );
    const migratedSkillPath = join(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-url-to-markdown",
      "SKILL.md"
    );

    try {
      await mkdir(peerSkillDirectory, { recursive: true });
      await writeFile(join(peerSkillDirectory, "SKILL.md"), "# peer skill\n", "utf8");

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory,
        repairHostSurface: true
      });

      expect(result.status).toBe("success");
      expect(result.adoptionHealth).toEqual({
        status: "green",
        managedHosts: ["claude-code"],
        reasons: []
      });
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "installed",
        migratedPeerSkills: ["baoyu-url-to-markdown"]
      });
      await expect(access(join(peerSkillDirectory, "SKILL.md"))).rejects.toThrow();
      await expect(access(migratedSkillPath)).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("repairs baoyu-fetch after migrating baoyu-url-to-markdown behind broker home", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-runtime-repair-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );

    try {
      await mkdir(peerSkillDirectory, { recursive: true });
      await writeFile(join(peerSkillDirectory, "SKILL.md"), "# peer skill\n", "utf8");

      const originalCliPath = await writeBrokenBaoyuFetchCli(peerSkillDirectory);

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory,
        repairHostSurface: true
      });

      const repairedCliPath = join(
        brokerHomeDirectory,
        "downstream",
        "claude-code",
        "skills",
        "baoyu-url-to-markdown",
        "scripts",
        "node_modules",
        "baoyu-fetch",
        "dist",
        "cli.js"
      );

      expect(result.status).toBe("success");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "installed",
        migratedPeerSkills: ["baoyu-url-to-markdown"]
      });
      await expect(access(originalCliPath)).rejects.toThrow();
      await expect(readFile(repairedCliPath, "utf8")).resolves.toContain(
        FIXED_BAOYU_FETCH_CLI_FRAGMENT
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("records a repair audit event and leaves no manual recovery marker on the happy path", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-repair-audit-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );

    try {
      await mkdir(peerSkillDirectory, { recursive: true });
      await writeFile(join(peerSkillDirectory, "SKILL.md"), "# peer skill\n", "utf8");

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory,
        repairHostSurface: true
      });
      const ledger = await readPeerSurfaceLedger(brokerHomeDirectory);
      const marker = await readPeerSurfaceManualRecoveryMarker(
        brokerHomeDirectory,
        "claude-code"
      );

      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "claude-code",
          status: "installed",
          migratedPeerSkills: ["baoyu-url-to-markdown"]
        })
      );
      expect(result.hosts[0]?.manualRecovery).toBeUndefined();
      expect(result.warnings.join("\n")).not.toContain("manual recovery");
      expect(marker).toBeNull();
      expect(ledger).toContainEqual(
        expect.objectContaining({
          eventType: "repair_succeeded",
          host: "claude-code",
          result: "success",
          details: {
            migratedPeerSkills: ["baoyu-url-to-markdown"]
          }
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("repairs existing broker-managed baoyu-url-to-markdown runtimes during update", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-existing-runtime-repair-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const downstreamSkillDirectory = join(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-url-to-markdown"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await mkdir(downstreamSkillDirectory, { recursive: true });
      await writeFile(join(downstreamSkillDirectory, "SKILL.md"), "# downstream skill\n", "utf8");

      const brokenCliPath = await writeBrokenBaoyuFetchCli(downstreamSkillDirectory);

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.status).toBe("success");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "installed"
      });
      await expect(readFile(brokenCliPath, "utf8")).resolves.toContain(
        FIXED_BAOYU_FETCH_CLI_FRAGMENT
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("keeps an adopted downstream peer hidden when repair ledger append fails", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-repair-adopt-append-fail-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );
    const downstreamSkillDirectory = join(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-url-to-markdown"
    );
    const peerSkillPath = join(peerSkillDirectory, "SKILL.md");
    const downstreamSkillPath = join(downstreamSkillDirectory, "SKILL.md");
    const appendSpy = vi
      .spyOn(peerSurfaceAudit, "appendPeerSurfaceLedgerEvent")
      .mockRejectedValueOnce(new Error("ledger offline"));

    try {
      await mkdir(peerSkillDirectory, { recursive: true });
      await mkdir(downstreamSkillDirectory, { recursive: true });
      await writeFile(peerSkillPath, "# peer skill\n", "utf8");
      await writeFile(downstreamSkillPath, "# peer skill\n", "utf8");

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory,
        repairHostSurface: true
      });
      const marker = await readPeerSurfaceManualRecoveryMarker(
        brokerHomeDirectory,
        "claude-code"
      );

      expect(result.status).toBe("degraded_success");
      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "claude-code",
          status: "failed",
          reason: expect.stringContaining(
            "BROKER_FIRST_PEER_SURFACE_REPAIR_APPEND_FAILED: ledger offline"
          )
        })
      );
      expect(result.warnings.join("\n")).not.toContain("manual recovery");
      expect(marker).toBeNull();
      await expect(access(peerSkillPath)).rejects.toThrow();
      await expect(readFile(downstreamSkillPath, "utf8")).resolves.toBe("# peer skill\n");
    } finally {
      appendSpy.mockRestore();
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed when repair cannot append the ledger and rollback cannot restore the host surface", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-repair-rollback-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );
    const peerSkillPath = join(peerSkillDirectory, "SKILL.md");
    const downstreamSkillPath = join(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-url-to-markdown",
      "SKILL.md"
    );
    const appendSpy = vi
      .spyOn(peerSurfaceAudit, "appendPeerSurfaceLedgerEvent")
      .mockRejectedValueOnce(new Error("ledger offline"));
    const rollbackSpy = vi
      .spyOn(hostSurface, "rollbackPeerSkillMoves")
      .mockResolvedValueOnce({
        restoredPeerSkills: [],
        failedPeerSkills: ["baoyu-url-to-markdown"],
        warnings: ["failed to rollback baoyu-url-to-markdown: rename blocked"]
      });

    try {
      await mkdir(peerSkillDirectory, { recursive: true });
      await writeFile(peerSkillPath, "# peer skill\n", "utf8");

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        homeDirectory: runtimeDirectory,
        repairHostSurface: true
      });
      const marker = await readPeerSurfaceManualRecoveryMarker(
        brokerHomeDirectory,
        "claude-code"
      );
      const ledger = await readPeerSurfaceLedger(brokerHomeDirectory);

      expect(result.status).toBe("failed");
      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "claude-code",
          status: "failed",
          reason: expect.stringContaining(
            "BROKER_FIRST_PEER_SURFACE_MANUAL_RECOVERY_REQUIRED"
          ),
          manualRecovery: expect.objectContaining({
            failurePhase: "rollback",
            rollbackStatus: "failed",
            failedPeers: ["baoyu-url-to-markdown"]
          })
        })
      );
      expect(marker).toMatchObject({
        host: "claude-code",
        failurePhase: "rollback",
        rollbackStatus: "failed",
        failedPeers: ["baoyu-url-to-markdown"],
        reason: expect.stringContaining("rollback failed during repair")
      });
      expect(ledger.at(-1)).toEqual(
        expect.objectContaining({
          eventType: "manual_recovery_required",
          host: "claude-code",
          markerId: marker?.markerId,
          details: expect.objectContaining({
            failurePhase: "rollback",
            rollbackStatus: "failed",
            failedPeers: ["baoyu-url-to-markdown"]
          })
        })
      );
      await expect(access(peerSkillPath)).rejects.toThrow();
      await expect(readFile(downstreamSkillPath, "utf8")).resolves.toBe("# peer skill\n");
      expect(result.warnings.join("\n")).toContain("rollback failed during repair");
      expect(result.warnings.join("\n")).toContain("manual recovery");
    } finally {
      rollbackSpy.mockRestore();
      appendSpy.mockRestore();
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("rejects clear-manual-recovery when the marker id does not match or the host surface is dirty", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-clear-reject-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "baoyu-danger-x-to-markdown"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });
      await seedManualRecovery(
        brokerHomeDirectory,
        "codex",
        "marker-codex-1",
        ["baoyu-danger-x-to-markdown"]
      );

      const mismatch = await updateSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory,
        clearManualRecovery: true,
        clearManualRecoveryHost: "codex",
        clearManualRecoveryMarkerId: "wrong-marker",
        clearManualRecoveryOperatorNote: "checked host",
        clearManualRecoveryVerificationNote: "marker mismatch confirmed",
        clearManualRecoveryEvidenceRefs: ["ticket-1"]
      });

      expect(mismatch.status).toBe("failed");
      expect(mismatch.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "failed",
          reason: expect.stringContaining("marker mismatch"),
          manualRecovery: expect.objectContaining({
            markerId: "marker-codex-1"
          })
        })
      );

      await mkdir(peerSkillDirectory, { recursive: true });
      await writeFile(join(peerSkillDirectory, "SKILL.md"), "# peer skill\n", "utf8");

      const dirty = await updateSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory,
        clearManualRecovery: true,
        clearManualRecoveryHost: "codex",
        clearManualRecoveryMarkerId: "marker-codex-1",
        clearManualRecoveryOperatorNote: "checked host",
        clearManualRecoveryVerificationNote: "dirty host surface",
        clearManualRecoveryEvidenceRefs: ["ticket-2"]
      });
      const ledger = await readPeerSurfaceLedger(brokerHomeDirectory);

      expect(dirty.status).toBe("failed");
      expect(dirty.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "failed",
          reason: expect.stringContaining("competing peers still visible"),
          manualRecovery: expect.objectContaining({
            markerId: "marker-codex-1"
          }),
          competingPeerSkills: ["baoyu-danger-x-to-markdown"]
        })
      );
      expect(ledger.slice(-2)).toEqual([
        expect.objectContaining({
          eventType: "clear_rejected",
          markerId: "marker-codex-1",
          details: expect.objectContaining({
            rejectionCode: "BROKER_FIRST_PEER_SURFACE_CLEAR_MARKER_MISMATCH"
          })
        }),
        expect.objectContaining({
          eventType: "clear_rejected",
          markerId: "marker-codex-1",
          details: expect.objectContaining({
            rejectionCode: "BROKER_FIRST_PEER_SURFACE_CLEAR_INVALID_HOST_STATE"
          })
        })
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("clears manual recovery when the marker matches and the host surface is healthy", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-peer-clear-success-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const artifactPath = brokerFirstGateArtifactPath(brokerHomeDirectory);
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });
      await seedManualRecovery(
        brokerHomeDirectory,
        "codex",
        "marker-codex-2",
        ["baoyu-danger-x-to-markdown"]
      );

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory,
        clearManualRecovery: true,
        clearManualRecoveryHost: "codex",
        clearManualRecoveryMarkerId: "marker-codex-2",
        clearManualRecoveryOperatorNote: "checked host",
        clearManualRecoveryVerificationNote: "host surface clean",
        clearManualRecoveryEvidenceRefs: ["ticket-3", "doctor-green"]
      });
      const marker = await readPeerSurfaceManualRecoveryMarker(
        brokerHomeDirectory,
        "codex"
      );
      const ledger = await readPeerSurfaceLedger(brokerHomeDirectory);
      const gate = await evaluateBrokerFirstGate({
        brokerHomeDirectory
      });

      expect(result.status).toBe("success");
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "cleared_manual_recovery",
        clearedManualRecovery: {
          markerId: "marker-codex-2",
          path: expect.stringContaining("/peer-surface-manual-recovery/codex.json")
        }
      });
      expect(marker).toBeNull();
      await expect(readFile(artifactPath, "utf8")).resolves.toContain(
        "\"phase2Boundary\": \"pass\""
      );
      expect(gate.hasStrictIssues).toBe(false);
      expect(gate.freshness.state).toBe("fresh");
      expect(ledger.at(-1)).toEqual(
        expect.objectContaining({
          eventType: "clear_succeeded",
          markerId: "marker-codex-2",
          result: "success",
          details: {
            operatorNote: "checked host",
            verificationNote: "host surface clean",
            evidenceRefs: ["ticket-3", "doctor-green"]
          }
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("does not overwrite an existing unmanaged host directory", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-unmanaged-conflict-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const existingSkillPath = join(codexInstallDirectory, "SKILL.md");

    try {
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeFile(existingSkillPath, "user managed content\n", "utf8");

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory
      });

      expect(result.status).toBe("degraded_success");
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "skipped_conflict",
        reason: "existing unmanaged host directory"
      });
      await expect(readFile(existingSkillPath, "utf8")).resolves.toBe("user managed content\n");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("treats shared home success plus host conflicts as degraded success", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-all-hosts-conflict-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(claudeCodeInstallDirectory, { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeFile(
        join(claudeCodeInstallDirectory, ".skills-broker.json"),
        `${JSON.stringify({ managedBy: "other-tool", host: "claude-code" }, null, 2)}\n`,
        "utf8"
      );
      await writeFile(
        join(codexInstallDirectory, ".skills-broker.json"),
        `${JSON.stringify({ managedBy: "other-tool", host: "codex" }, null, 2)}\n`,
        "utf8"
      );

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory
      });

      expect(result.sharedHome.status).toBe("installed");
      expect(result.status).toBe("degraded_success");
      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "skipped_conflict",
        reason: "foreign ownership manifest"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "skipped_conflict",
        reason: "foreign ownership manifest"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("returns a structured failure when shared home installation fails", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-update-shared-home-failure-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, "blocked", "home");

    try {
      await writeFile(join(runtimeDirectory, "blocked"), "no directory here", "utf8");

      const result = await updateSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd(),
        homeDirectory: runtimeDirectory
      });

      expect(result.status).toBe("failed");
      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.sharedHome.status).toBe("failed");
      expect(result.sharedHome.reason).toContain("ENOTDIR");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "skipped_not_detected",
        reason: expect.stringContaining("--claude-dir")
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "skipped_not_detected",
        reason: expect.stringContaining("--codex-dir")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
