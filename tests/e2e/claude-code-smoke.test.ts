import { access, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";

const execFileAsync = promisify(execFile);

describe("Claude Code smoke", () => {
  it("installs a minimal Claude Code plugin and returns HANDOFF_READY for markdown handoff", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-claude-code-"));
    const installDirectory = join(runtimeDirectory, "claude-code-plugin");
    const cacheFilePath = join(runtimeDirectory, "broker-cache.json");
    const packageJsonPath = join(installDirectory, "package.json");
    const manifestPath = join(installDirectory, ".claude-plugin", "plugin.json");
    const installScriptPath = join(
      process.cwd(),
      "scripts",
      "install-claude-code.sh"
    );
    const hostConfigPath = join(installDirectory, "config", "host-skills.seed.json");
    const mcpConfigPath = join(installDirectory, "config", "mcp-registry.seed.json");
    const runnerPath = join(installDirectory, "bin", "run-broker");
    const distCliPath = join(installDirectory, "dist", "cli.js");
    const skillPath = join(
      installDirectory,
      "skills",
      "webpage-to-markdown",
      "SKILL.md"
    );

    try {
      await execFileAsync(installScriptPath, [installDirectory], {
        cwd: process.cwd()
      });

      await expect(access(packageJsonPath)).resolves.toBeUndefined();
      await expect(access(manifestPath)).resolves.toBeUndefined();
      await expect(access(skillPath)).resolves.toBeUndefined();
      await expect(access(hostConfigPath)).resolves.toBeUndefined();
      await expect(access(mcpConfigPath)).resolves.toBeUndefined();
      await expect(access(runnerPath)).resolves.toBeUndefined();
      await expect(access(distCliPath)).resolves.toBeUndefined();

      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      expect(manifest).toMatchObject({
        name: "skills-broker-claude-code",
        version: "0.1.1"
      });

      const skillContents = await readFile(skillPath, "utf8");
      expect(skillContents).toContain("turn this webpage into markdown");

      const relocatedInstallDirectory = join(
        runtimeDirectory,
        "claude-code-plugin-relocated"
      );
      await rename(installDirectory, relocatedInstallDirectory);

      const result = await runClaudeCodeAdapter(
        {
          task: "turn this webpage into markdown",
          url: "https://example.com/article"
        },
        {
          installDirectory: relocatedInstallDirectory,
          cacheFilePath
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.handoff.context.currentHost).toBe("claude-code");
      expect(result.handoff.request.url).toBe("https://example.com/article");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
