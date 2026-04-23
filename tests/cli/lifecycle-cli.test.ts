import { describe, expect, it } from "vitest";
import {
  runLifecycleCli,
  shouldFailStrictDoctorGate
} from "../../src/bin/skills-broker";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { access, chmod, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { installSharedBrokerHome } from "../../src/shared-home/install";
import { writeManagedShellManifest } from "../../src/shared-home/ownership";
import {
  appendPeerSurfaceLedgerEvent,
  createPeerSurfaceLedgerEvent,
  peerSurfaceManualRecoveryMarkerPath,
  writePeerSurfaceManualRecoveryMarker
} from "../../src/shared-home/peer-surface-audit";
import { commitAll, initGitRepo } from "../helpers/git";
import { execNpm } from "../helpers/npm";

const execFileAsync = promisify(execFile);
const tsNodeLoaderPath = resolve("node_modules/ts-node/esm.mjs");

function renderStatusBoard(status: string): string {
  return `# STATUS

<!-- skills-broker-status:start -->
\`\`\`json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "status-board-proof-rails",
      "title": "Status board proof rails",
      "status": "${status}",
      "proofs": [
        {
          "type": "file",
          "path": "README.md"
        }
      ]
    }
  ]
}
\`\`\`
<!-- skills-broker-status:end -->
`;
}

describe("lifecycle cli", () => {
  it("dispatches update --dry-run --json", async () => {
    const result = await runLifecycleCli([
      "update",
      "--dry-run",
      "--json",
      "--broker-home",
      "/tmp/test-home"
    ]);

    expect(result.command).toBe("update");
    expect(result.dryRun).toBe(true);
    expect(result.outputMode).toBe("json");
  });

  it("understands doctor regardless of flag order", async () => {
    const result = await runLifecycleCli(["--dry-run", "doctor", "--broker-home", "/tmp/test-home"]);

    expect(result.command).toBe("doctor");
    expect(result.dryRun).toBe(true);
    expect(result.outputMode).toBe("text");
  });

  it("supports remove command", async () => {
    const result = await runLifecycleCli(["remove"]);

    expect(result.command).toBe("remove");
    expect(result.dryRun).toBe(false);
    expect(result.purgeSharedHome).toBe(false);
    expect(result.resetAcquisitionMemory).toBe(false);
    expect(result.outputMode).toBe("text");
  });

  it("treats --all as remove purge", async () => {
    const result = await runLifecycleCli(["remove", "--all"]);

    expect(result.command).toBe("remove");
    expect(result.purgeSharedHome).toBe(true);
  });

  it("supports scoped acquisition-memory reset on remove", async () => {
    const result = await runLifecycleCli(["remove", "--reset-acquisition-memory"]);

    expect(result.command).toBe("remove");
    expect(result.resetAcquisitionMemory).toBe(true);
    expect(result.purgeSharedHome).toBe(false);
  });

  it("recognizes --repair-host-surface for update", async () => {
    const result = await runLifecycleCli(["update", "--repair-host-surface"]);

    expect(result.command).toBe("update");
    expect(result.repairHostSurface).toBe(true);
  });

  it("parses --clear-manual-recovery with host, marker id, and evidence flags", async () => {
    const result = await runLifecycleCli([
      "update",
      "--clear-manual-recovery",
      "--host",
      "codex",
      "--marker-id",
      "marker-123",
      "--operator-note",
      "checked host",
      "--verification-note",
      "host surface clean",
      "--evidence-ref",
      "manual-check-pass",
      "--evidence-ref",
      "doctor-green"
    ]);

    expect(result.command).toBe("update");
    expect(result.clearManualRecovery).toBe(true);
    expect(result.hostOverride).toBe("codex");
    expect(result.markerIdOverride).toBe("marker-123");
    expect(result.operatorNote).toBe("checked host");
    expect(result.verificationNote).toBe("host surface clean");
    expect(result.evidenceRefs).toEqual(["manual-check-pass", "doctor-green"]);
  });

  it("recognizes --json doctor", async () => {
    const result = await runLifecycleCli(["--json", "doctor"]);

    expect(result.command).toBe("doctor");
    expect(result.outputMode).toBe("json");
  });

  it("recognizes strict status flags for doctor", async () => {
    const result = await runLifecycleCli([
      "doctor",
      "--strict",
      "--refresh-remote",
      "--repo-root",
      "/tmp/repo",
      "--ship-ref",
      "origin/main"
    ]);

    expect(result.command).toBe("doctor");
    expect(result.strict).toBe(true);
    expect(result.refreshRemote).toBe(true);
    expect(result.repoRootOverride).toBe("/tmp/repo");
    expect(result.shipRefOverride).toBe("origin/main");
  });

  it("prints doctor result as JSON when --json is passed", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-json-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const missingCodexDirectory = resolve(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "doctor",
        "--json",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        missingCodexDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("doctor");
      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.websiteQaLoop).toEqual(
        expect.objectContaining({
          verdict: "in_progress",
          phase: "install_required_pending",
          proofs: {
            installRequiredObserved: false,
            verifyConfirmed: false,
            crossHostReuseConfirmed: false,
            replayReady: false
          }
        })
      );
      expect(result.websiteQaLoop).toEqual(result.familyProofs.website_qa);
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false,
        missingPaths: expect.arrayContaining([
          resolve(brokerHomeDirectory, "package.json")
        ])
      });
      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("missing")
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 90_000);

  it("treats a blocked website QA verdict as a strict failure", () => {
    expect(
      shouldFailStrictDoctorGate({
        status: { hasStrictIssues: false },
        brokerFirstGate: { hasStrictIssues: false },
        hosts: [],
        adoptionHealth: { status: "green" },
        websiteQaLoop: { verdict: "blocked" }
      })
    ).toBe(true);

    expect(
      shouldFailStrictDoctorGate({
        status: { hasStrictIssues: false },
        brokerFirstGate: { hasStrictIssues: false },
        hosts: [],
        adoptionHealth: { status: "green" },
        websiteQaLoop: { verdict: "in_progress" }
      })
    ).toBe(false);
  });

  it("exits non-zero when doctor --strict sees a strict status issue", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-strict-"));
    const repoDirectory = resolve(runtimeDirectory, "repo");

    try {
      await initGitRepo(repoDirectory);
      await writeFile(resolve(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(resolve(repoDirectory, "STATUS.md"), renderStatusBoard("shipped_remote"), "utf8");
      await commitAll(repoDirectory, "add mismatched status board");

      await expect(
        execFileAsync(
          "node",
          [
            "--loader",
            tsNodeLoaderPath,
            scriptPath,
            "doctor",
            "--strict",
            "--repo-root",
            repoDirectory
          ],
          {
            env: {
              ...process.env,
              HOME: runtimeDirectory
            },
            encoding: "utf8"
          }
        )
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("Status issue STATUS_SHIP_REF_UNRESOLVED")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30000);

  it("exits non-zero when doctor --strict sees an explicit missing host shell", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-host-missing-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const missingCodexDirectory = resolve(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await expect(
        execFileAsync(
          "node",
          [
            "--loader",
            tsNodeLoaderPath,
            scriptPath,
            "doctor",
            "--strict",
            "--broker-home",
            brokerHomeDirectory,
            "--codex-dir",
            missingCodexDirectory
          ],
          {
            env: {
              ...process.env,
              HOME: runtimeDirectory
            },
            encoding: "utf8"
          }
        )
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("Host codex: not_detected")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30000);

  it("keeps doctor --strict green when no status item needs remote truth", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-local-only-"));
    const repoDirectory = resolve(runtimeDirectory, "repo");

    try {
      await initGitRepo(repoDirectory);
      await writeFile(resolve(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(resolve(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add local-only status board");

      const { stdout } = await execFileAsync(
        "node",
        [
          "--loader",
          tsNodeLoaderPath,
          scriptPath,
          "doctor",
          "--strict",
          "--json",
          "--repo-root",
          repoDirectory
        ],
        {
          env: {
            ...process.env,
            HOME: runtimeDirectory
          },
          encoding: "utf8"
        }
      );

      const result = JSON.parse(stdout.trim()) as {
        status: {
          issues: Array<{ code: string }>;
          hasStrictIssues: boolean;
        };
      };

      expect(result.status.hasStrictIssues).toBe(false);
      expect(result.status.issues).toEqual([]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("exits non-zero when doctor --strict sees a broker-first gate issue", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-gate-strict-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const repoDirectory = resolve(runtimeDirectory, "repo");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await initGitRepo(repoDirectory);
      await writeFile(resolve(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(resolve(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add local-only status board");

      await expect(
        execFileAsync(
          "node",
          [
            "--loader",
            tsNodeLoaderPath,
            scriptPath,
            "doctor",
            "--strict",
            "--broker-home",
            brokerHomeDirectory,
            "--repo-root",
            repoDirectory
          ],
          {
            env: {
              ...process.env,
              HOME: runtimeDirectory
            },
            encoding: "utf8"
          }
        )
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("Broker-first gate issue BROKER_FIRST_GATE_MISSING")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("keeps doctor --strict green after update materializes the broker-first gate", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(
      resolve(tmpdir(), "skills-broker-cli-gate-after-update-")
    );
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const repoDirectory = resolve(runtimeDirectory, "repo");

    try {
      await initGitRepo(repoDirectory);
      await writeFile(resolve(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(resolve(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add local-only status board");

      await execFileAsync(
        "node",
        [
          "--loader",
          tsNodeLoaderPath,
          scriptPath,
          "update",
          "--broker-home",
          brokerHomeDirectory
        ],
        {
          env: {
            ...process.env,
            HOME: runtimeDirectory
          },
          encoding: "utf8"
        }
      );

      const { stdout } = await execFileAsync(
        "node",
        [
          "--loader",
          tsNodeLoaderPath,
          scriptPath,
          "doctor",
          "--strict",
          "--json",
          "--broker-home",
          brokerHomeDirectory,
          "--repo-root",
          repoDirectory
        ],
        {
          env: {
            ...process.env,
            HOME: runtimeDirectory
          },
          encoding: "utf8"
        }
      );

      const result = JSON.parse(stdout.trim()) as {
        brokerFirstGate: {
          hasStrictIssues: boolean;
          freshness: { state: string };
        };
      };

      expect(result.brokerFirstGate.hasStrictIssues).toBe(false);
      expect(result.brokerFirstGate.freshness.state).toBe("fresh");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("exits non-zero when doctor --strict sees competing peer skills", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-peer-strict-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const repoDirectory = resolve(runtimeDirectory, "repo");
    const codexInstallDirectory = resolve(
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
      await initGitRepo(repoDirectory);
      await writeFile(resolve(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(
        resolve(repoDirectory, "STATUS.md"),
        renderStatusBoard("in_progress"),
        "utf8"
      );
      await commitAll(repoDirectory, "add local-only status board");
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await mkdir(resolve(runtimeDirectory, ".agents", "skills", "baoyu-danger-x-to-markdown"), {
        recursive: true
      });

      await expect(
        execFileAsync(
          "node",
          [
            "--loader",
            tsNodeLoaderPath,
            scriptPath,
            "doctor",
            "--strict",
            "--refresh-remote",
            "--broker-home",
            brokerHomeDirectory,
            "--codex-dir",
            codexInstallDirectory,
            "--repo-root",
            repoDirectory
          ],
          {
            env: {
              ...process.env,
              HOME: runtimeDirectory
            },
            encoding: "utf8"
          }
        )
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("Host codex competing peers")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("prints remove result as JSON when --json is passed", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-remove-json-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(
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
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeFile(
        resolve(codexInstallDirectory, ".skills-broker.json"),
        `${JSON.stringify({
          managedBy: "skills-broker",
          host: "codex",
          version: "test-version",
          brokerHome: brokerHomeDirectory
        }, null, 2)}\n`,
        "utf8"
      );

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "remove",
        "--json",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        codexInstallDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("remove");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved",
        acquisitionMemory: "preserved"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "removed"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("purges shared home when remove is executed with --purge", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-remove-purge-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "remove",
        "--json",
        "--purge",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("remove");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "purged",
        acquisitionMemory: "already_absent"
      });
      await expect(access(brokerHomeDirectory)).rejects.toThrow();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("clears acquisition memory without purging shared home when requested", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-remove-memory-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const memoryPath = resolve(brokerHomeDirectory, "state", "acquisition-memory.json");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFile(
        memoryPath,
        JSON.stringify({
          version: "2026-04-16",
          entries: []
        }),
        "utf8"
      );

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "remove",
        "--json",
        "--reset-acquisition-memory",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved",
        acquisitionMemory: "cleared"
      });
      await expect(access(memoryPath)).rejects.toThrow();
      await expect(access(brokerHomeDirectory)).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("uses official default host directories for doctor when no overrides are passed", async () => {
    const scriptPath = resolve("dist/bin/skills-broker.js");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-defaults-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await execNpm(["run", "build"], {
        cwd: process.cwd(),
        encoding: "utf8"
      });
      await mkdir(resolve(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const { stdout } = await execFileAsync("node", [scriptPath, "doctor", "--json"], {
        cwd: runtimeDirectory,
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("doctor");
      expect(result.adoptionHealth).toEqual({
        status: "blocked",
        managedHosts: ["codex"],
        reasons: [
          {
            code: "SHARED_HOME_MISSING",
            message: expect.stringContaining(
              "shared-home: managed host shells exist but the shared broker home is missing"
            )
          }
        ]
      });
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false,
        missingPaths: expect.arrayContaining([
          resolve(brokerHomeDirectory, "package.json")
        ])
      });
      expect(result.status).toMatchObject({
        skipped: true,
        issues: []
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "detected",
        reason: "managed by skills-broker"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("rejects unknown commands", async () => {
    await expect(runLifecycleCli(["bogus"])).rejects.toThrow("Unknown command");
  });

  it("rejects flags that are missing a value", async () => {
    await expect(runLifecycleCli(["update", "--codex-dir", "--json"])).rejects.toThrow(
      "Missing value for --codex-dir"
    );
  });

  it("rejects unknown flags instead of ignoring them", async () => {
    await expect(runLifecycleCli(["doctor", "--bogus-flag"])).rejects.toThrow(
      "Unknown flag: --bogus-flag"
    );
  });

  it("rejects doctor-only flags on update and remove", async () => {
    await expect(runLifecycleCli(["update", "--strict"])).rejects.toThrow(
      "Flag --strict is not valid for update"
    );
    await expect(runLifecycleCli(["remove", "--repo-root", "/tmp/repo"])).rejects.toThrow(
      "Flag --repo-root is not valid for remove"
    );
  });

  it("rejects combining acquisition-memory reset with purge", async () => {
    await expect(
      runLifecycleCli(["remove", "--reset-acquisition-memory", "--purge"])
    ).rejects.toThrow(
      "Cannot combine --reset-acquisition-memory with --purge or --all"
    );
  });

  it("prints lifecycle result as JSON when --json is passed", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-json-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const repoDirectory = resolve(runtimeDirectory, "repo");
    const codexInstallDirectory = resolve(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "--json",
        "update",
        "--dry-run",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        codexInstallDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("update");
      expect(result.dryRun).toBe(true);
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "planned_install"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("prints text result when executed without --json", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-text-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");

    try {
      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--dry-run",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const output = stdout.trim();
      expect(output).toContain("skills-broker updated");
      expect(output).toContain("Adoption health: inactive");
      expect(output).toContain(`Shared home: ${brokerHomeDirectory}`);
      expect(output).toContain("Host claude-code: skipped_not_detected");
      expect(output).toContain("Host codex: skipped_not_detected");
      expect(output).not.toMatch(/^\s*\{/);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("repairs competing peer skills through the lifecycle CLI", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-repair-peers-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const claudeInstallDirectory = resolve(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const peerSkillDirectory = resolve(
      runtimeDirectory,
      ".claude",
      "skills",
      "baoyu-url-to-markdown"
    );
    const migratedSkillPath = resolve(
      brokerHomeDirectory,
      "downstream",
      "claude-code",
      "skills",
      "baoyu-url-to-markdown",
      "SKILL.md"
    );

    try {
      await mkdir(peerSkillDirectory, { recursive: true });
      await writeFile(resolve(peerSkillDirectory, "SKILL.md"), "# peer skill\n", "utf8");

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--repair-host-surface",
        "--broker-home",
        brokerHomeDirectory,
        "--claude-dir",
        claudeInstallDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      expect(stdout).toContain("Host claude-code migrated peers: baoyu-url-to-markdown");
      await expect(access(resolve(peerSkillDirectory, "SKILL.md"))).rejects.toThrow();
      await expect(access(migratedSkillPath)).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("clears manual recovery through the lifecycle CLI", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-clear-manual-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const repoDirectory = resolve(runtimeDirectory, "repo");
    const codexInstallDirectory = resolve(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const markerPath = peerSurfaceManualRecoveryMarkerPath(
      brokerHomeDirectory,
      "codex"
    );

    try {
      await initGitRepo(repoDirectory);
      await writeFile(resolve(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(resolve(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add local-only status board");

      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await writePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, {
        schemaVersion: 1,
        markerId: "marker-123",
        host: "codex",
        attemptId: "attempt-123",
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
          attemptId: "attempt-123",
          markerId: "marker-123",
          details: {
            failedPeers: ["baoyu-danger-x-to-markdown"],
            failurePhase: "rollback",
            rollbackStatus: "failed",
            reason: "rollback failed during repair"
          }
        })
      );

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--clear-manual-recovery",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        codexInstallDirectory,
        "--host",
        "codex",
        "--marker-id",
        "marker-123",
        "--operator-note",
        "checked host",
        "--verification-note",
        "host surface clean",
        "--evidence-ref",
        "ticket-123"
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      expect(stdout).toContain("Host codex: cleared_manual_recovery");
      expect(stdout).toContain("Host codex cleared manual recovery: marker-123");
      await expect(access(markerPath)).rejects.toThrow();

      const { stdout: doctorStdout } = await execFileAsync(
        "node",
        [
          "--loader",
          tsNodeLoaderPath,
          scriptPath,
          "doctor",
          "--strict",
          "--json",
          "--broker-home",
          brokerHomeDirectory,
          "--repo-root",
          repoDirectory,
          "--codex-dir",
          codexInstallDirectory
        ],
        {
          env: {
            ...process.env,
            HOME: runtimeDirectory
          },
          encoding: "utf8"
        }
      );
      const doctorResult = JSON.parse(doctorStdout.trim()) as {
        brokerFirstGate: {
          hasStrictIssues: boolean;
          freshness: { state: string };
        };
      };

      expect(doctorResult.brokerFirstGate.hasStrictIssues).toBe(false);
      expect(doctorResult.brokerFirstGate.freshness.state).toBe("fresh");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("prints rollback manual recovery blockers in lifecycle update output", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(
      resolve(tmpdir(), "skills-broker-cli-manual-recovery-output-")
    );
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(
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
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await writePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, {
        schemaVersion: 1,
        markerId: "marker-rollback-1",
        host: "codex",
        attemptId: "attempt-rollback-1",
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
          attemptId: "attempt-rollback-1",
          markerId: "marker-rollback-1",
          details: {
            failedPeers: ["baoyu-danger-x-to-markdown"],
            failurePhase: "rollback",
            rollbackStatus: "failed",
            reason: "rollback failed during repair"
          }
        })
      );

      const { stdout } = await execFileAsync(
        "node",
        [
          "--loader",
          tsNodeLoaderPath,
          scriptPath,
          "update",
          "--broker-home",
          brokerHomeDirectory,
          "--codex-dir",
          codexInstallDirectory
        ],
        {
          env: {
            ...process.env,
            HOME: runtimeDirectory
          },
          encoding: "utf8"
        }
      );

      expect(stdout).toContain("Host codex: failed");
      expect(stdout).toContain(
        "Host codex manual recovery: markerId=marker-rollback-1, failurePhase=rollback, rollbackStatus=failed"
      );
      expect(stdout).toContain("Host codex clear command:");
      expect(stdout).toContain("--clear-manual-recovery");
      expect(stdout).toContain("--marker-id marker-rollback-1");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("exits non-zero when clear-manual-recovery is rejected", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-clear-reject-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(
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
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await writePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, {
        schemaVersion: 1,
        markerId: "marker-123",
        host: "codex",
        attemptId: "attempt-123",
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
          attemptId: "attempt-123",
          markerId: "marker-123",
          details: {
            failedPeers: ["baoyu-danger-x-to-markdown"],
            failurePhase: "rollback",
            rollbackStatus: "failed",
            reason: "rollback failed during repair"
          }
        })
      );

      await expect(
        execFileAsync("node", [
          "--loader",
          tsNodeLoaderPath,
          scriptPath,
          "update",
          "--clear-manual-recovery",
          "--broker-home",
          brokerHomeDirectory,
          "--codex-dir",
          codexInstallDirectory,
          "--host",
          "codex",
          "--marker-id",
          "wrong-marker",
          "--operator-note",
          "checked host",
          "--verification-note",
          "marker mismatch confirmed",
          "--evidence-ref",
          "ticket-124"
        ], {
          env: {
            ...process.env,
            HOME: runtimeDirectory
          },
          encoding: "utf8"
        })
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("marker mismatch")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 15000);

  it("prints competing peer remediation in doctor text output", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-peers-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await mkdir(resolve(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await mkdir(resolve(runtimeDirectory, ".agents", "skills", "baoyu-danger-x-to-markdown"), {
        recursive: true
      });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "doctor"
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const output = stdout.trim();
      expect(output).toContain("HOST_COMPETING_PEERS");
      expect(output).toContain("Host codex competing peers: baoyu-danger-x-to-markdown");
      expect(output).toContain("Host codex remediation: Hide competing peer skills behind skills-broker");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("auto-detects official Claude Code and Codex roots for zero-arg update", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-update-defaults-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");

    try {
      await mkdir(resolve(runtimeDirectory, ".claude"), { recursive: true });
      await mkdir(resolve(runtimeDirectory, ".codex"), { recursive: true });

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--dry-run",
        "--json",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("update");
      expect(result.adoptionHealth.status).toBe("inactive");
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "planned_install"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "planned_install"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("finds shared-home resources when executed from a non-repo cwd", async () => {
    await execNpm(["run", "build"], {
      env: process.env,
      encoding: "utf8"
    });

    const scriptPath = resolve("dist/bin/skills-broker.js");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-nonrepo-"));
    const externalWorkingDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-cwd-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const { stdout } = await execFileAsync("node", [
        scriptPath,
        "update",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        codexInstallDirectory
      ], {
        cwd: externalWorkingDirectory,
        env: process.env,
        encoding: "utf8"
      });

      expect(stdout).toContain("skills-broker updated");
      await expect(access(resolve(brokerHomeDirectory, "package.json"))).resolves.toBeUndefined();
      await expect(access(resolve(codexInstallDirectory, "SKILL.md"))).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
      await rm(externalWorkingDirectory, { recursive: true, force: true });
    }
  });

  it("prints degraded JSON when one host conflicts and the other installs", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-degraded-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = resolve(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const codexInstallDirectory = resolve(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeFile(
        resolve(codexInstallDirectory, ".skills-broker.json"),
        `${JSON.stringify({ managedBy: "other-tool", host: "codex" }, null, 2)}\n`,
        "utf8"
      );

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--json",
        "--broker-home",
        brokerHomeDirectory,
        "--claude-dir",
        claudeCodeInstallDirectory,
        "--codex-dir",
        codexInstallDirectory
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.status).toBe("degraded_success");
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "skipped_conflict",
        reason: "foreign ownership manifest"
      });
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "installed"
      });
      await expect(access(resolve(claudeCodeInstallDirectory, "SKILL.md"))).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("prints structured JSON when shared home installation fails", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-shared-fail-"));
    const blockedPath = resolve(runtimeDirectory, "blocked");
    const brokerHomeDirectory = resolve(blockedPath, "home");

    try {
      await writeFile(blockedPath, "not a directory\n", "utf8");

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--json",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.status).toBe("failed");
      expect(result.sharedHome.status).toBe("failed");
      expect(result.sharedHome.reason).toContain("ENOTDIR");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("prints structured text when shared home installation fails", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-shared-fail-text-"));
    const blockedPath = resolve(runtimeDirectory, "blocked");
    const brokerHomeDirectory = resolve(blockedPath, "home");

    try {
      await writeFile(blockedPath, "not a directory\n", "utf8");

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "update",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: process.env,
        encoding: "utf8"
      });

      expect(stdout).toContain("skills-broker updated");
      expect(stdout).toContain("Shared home status: failed");
      expect(stdout).toContain("ENOTDIR");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("runs when the published bin is executed via symlink", async () => {
    await execNpm(["run", "build"], {
      env: process.env,
      encoding: "utf8"
    });

    const distBin = resolve("dist/bin/skills-broker.js");
    const binDir = await mkdtemp(resolve(tmpdir(), "skills-broker-bin-"));
    const symlinkPath = resolve(binDir, "skills-broker");

    await chmod(distBin, 0o755);
    await symlink(distBin, symlinkPath);
    await chmod(symlinkPath, 0o755);
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-bin-runtime-"));

    try {
      const { stdout } = await execFileAsync(process.execPath, [
        symlinkPath,
        "update",
        "--broker-home",
        resolve(runtimeDirectory, ".skills-broker"),
        "--codex-dir",
        resolve(runtimeDirectory, ".agents", "skills", "skills-broker")
      ], {
        cwd: runtimeDirectory,
        env: process.env,
        encoding: "utf8"
      });

      const output = stdout.trim();
      expect(output).toContain("skills-broker updated");
      expect(output).not.toMatch(/^\s*\{/);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
      await rm(binDir, { recursive: true, force: true });
    }
  });
});
