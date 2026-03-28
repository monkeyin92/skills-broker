import { describe, expect, it } from "vitest";
import { runLifecycleCli } from "../../src/bin/skills-broker";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { access, chmod, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

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
    expect(result.outputMode).toBe("text");
  });

  it("recognizes --json doctor", async () => {
    const result = await runLifecycleCli(["--json", "doctor"]);

    expect(result.command).toBe("doctor");
    expect(result.outputMode).toBe("json");
  });

  it("rejects unknown commands", async () => {
    await expect(runLifecycleCli(["bogus"])).rejects.toThrow("Unknown command");
  });

  it("prints lifecycle result as JSON when --json is passed", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-json-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = resolve(
      runtimeDirectory,
      ".codex",
      "skills",
      "webpage-to-markdown"
    );

    try {
      const { stdout } = await execFileAsync("node", [
        "--loader",
        "ts-node/esm",
        scriptPath,
        "--json",
        "update",
        "--dry-run",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        codexInstallDirectory
      ], {
        env: process.env,
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
        "ts-node/esm",
        scriptPath,
        "update",
        "--dry-run",
        "--broker-home",
        brokerHomeDirectory
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const output = stdout.trim();
      expect(output).toContain("skills-broker updated");
      expect(output).toContain(`Shared home: ${brokerHomeDirectory}`);
      expect(output).not.toMatch(/^\s*\{/);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("prints degraded JSON when one host conflicts and the other installs", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const runtimeDirectory = await mkdtemp(resolve(tmpdir(), "skills-broker-cli-degraded-"));
    const brokerHomeDirectory = resolve(runtimeDirectory, ".skills-broker");
    const claudeCodeInstallDirectory = resolve(runtimeDirectory, ".claude-code-plugin");
    const codexInstallDirectory = resolve(
      runtimeDirectory,
      ".codex",
      "skills",
      "webpage-to-markdown"
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
        "ts-node/esm",
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
      await expect(
        access(resolve(claudeCodeInstallDirectory, "skills", "webpage-to-markdown", "SKILL.md"))
      ).resolves.toBeUndefined();
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

    try {
      const { stdout } = await execFileAsync(symlinkPath, [
        "update",
        "--dry-run"
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const output = stdout.trim();
      expect(output).toContain("skills-broker updated");
      expect(output).not.toMatch(/^\s*\{/);
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });
});
