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
      "skills-broker",
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
        version: "0.1.6"
      });

      const skillContents = await readFile(skillPath, "utf8");
      expect(skillContents).toContain("# Skills Broker");
      expect(skillContents).toContain("Route capability requests through skills-broker");
      expect(skillContents).toContain("do not independently substitute WebFetch");
      expect(skillContents).toContain("structured `capabilityQuery`");
      expect(skillContents).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
      expect(skillContents).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
      expect(skillContents).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery or install help.");
      expect(skillContents).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");
      expect(skillContents).toContain("../../bin/run-broker");

      const relocatedInstallDirectory = join(
        runtimeDirectory,
        "claude-code-plugin-relocated"
      );
      await rename(installDirectory, relocatedInstallDirectory);
      const relocatedRunnerPath = join(relocatedInstallDirectory, "bin", "run-broker");

      const result = await runClaudeCodeAdapter(
        {
          requestText: "turn this webpage into markdown: https://example.com/article",
          host: "claude-code",
          invocationMode: "explicit",
          urls: ["https://example.com/article"]
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

      const { stdout } = await execFileAsync(
        relocatedRunnerPath,
        [
          "--debug",
          JSON.stringify({
            requestText: "测下这个网站的质量",
            host: "claude-code",
            invocationMode: "auto",
            urls: ["https://example.com/qa"]
          })
        ],
        {
          cwd: relocatedInstallDirectory,
          env: {
            ...process.env,
            BROKER_NOW: "2026-03-31T10:00:00.000Z"
          }
        }
      );
      const debugResult = JSON.parse(stdout) as {
        trace?: {
          host: string;
          resultCode: string;
          winnerId: string | null;
        };
      };

      expect(debugResult).toMatchObject({
        trace: {
          host: "claude-code",
          resultCode: "HANDOFF_READY",
          winnerId: "website-qa"
        }
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
