import { describe, expect, it } from "vitest";
import { runLifecycleCli } from "../../src/bin/skills-broker";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { access, chmod, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { installSharedBrokerHome } from "../../src/shared-home/install";
import { writeManagedShellManifest } from "../../src/shared-home/ownership";

const execFileAsync = promisify(execFile);
const tsNodeLoaderPath = resolve("node_modules/ts-node/esm.mjs");

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
    expect(result.outputMode).toBe("text");
  });

  it("treats --all as remove purge", async () => {
    const result = await runLifecycleCli(["remove", "--all"]);

    expect(result.command).toBe("remove");
    expect(result.purgeSharedHome).toBe(true);
  });

  it("recognizes --repair-host-surface for update", async () => {
    const result = await runLifecycleCli(["update", "--repair-host-surface"]);

    expect(result.command).toBe("update");
    expect(result.repairHostSurface).toBe(true);
  });

  it("recognizes --json doctor", async () => {
    const result = await runLifecycleCli(["--json", "doctor"]);

    expect(result.command).toBe("doctor");
    expect(result.outputMode).toBe("json");
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
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false
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
  });

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
          version: "0.1.4",
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
        status: "preserved"
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
        status: "purged"
      });
      await expect(access(brokerHomeDirectory)).rejects.toThrow();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("uses official default host directories for doctor when no overrides are passed", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-defaults-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await mkdir(resolve(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "0.1.4",
        brokerHome: brokerHomeDirectory
      });

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "doctor",
        "--json"
      ], {
        env: {
          ...process.env,
          HOME: runtimeDirectory
        },
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("doctor");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false
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

  it("prints lifecycle result as JSON when --json is passed", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-json-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
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

  it("prints competing peer remediation in doctor text output", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-doctor-peers-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await mkdir(resolve(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await mkdir(resolve(runtimeDirectory, ".agents", "skills", "baoyu-danger-x-to-markdown"), {
        recursive: true
      });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "0.1.4",
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
      expect(output).toContain("Host codex competing peers: baoyu-danger-x-to-markdown");
      expect(output).toContain("Host codex remediation: Hide competing peer skills behind skills-broker");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

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
    await execFileAsync("npm", ["run", "build"], {
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
    await execFileAsync("npm", ["run", "build"], {
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
      const { stdout } = await execFileAsync(symlinkPath, [
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
