import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";

const execFileAsync = promisify(execFile);

describe("shared broker home smoke", () => {
  it("lets Claude Code and Codex reuse the same shared broker home", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-shared-home-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeShellDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexShellDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");
    const buildScriptPath = join(process.cwd(), "dist", "bin", "skills-broker.js");
    const sharedRunnerPath = join(brokerHomeDirectory, "bin", "run-broker");
    const sharedDistCliPath = join(brokerHomeDirectory, "dist", "cli.js");
    const claudeManifestPath = join(
      claudeShellDirectory,
      ".claude-plugin",
      "plugin.json"
    );
    const codexSkillPath = join(codexShellDirectory, "SKILL.md");

    try {
      await expect(access(buildScriptPath)).resolves.toBeUndefined();
      await execFileAsync("node", [
        buildScriptPath,
        "update",
        "--broker-home",
        brokerHomeDirectory,
        "--claude-dir",
        claudeShellDirectory,
        "--codex-dir",
        codexShellDirectory
      ]);

      await expect(access(sharedRunnerPath)).resolves.toBeUndefined();
      await expect(access(sharedDistCliPath)).resolves.toBeUndefined();
      await expect(access(claudeManifestPath)).resolves.toBeUndefined();
      await expect(access(codexSkillPath)).resolves.toBeUndefined();

      const codexSkillContents = await readFile(codexSkillPath, "utf8");
      expect(codexSkillContents).toContain("# Skills Broker");

      const claudeResult = await runClaudeCodeAdapter(
        {
          requestText: "turn this webpage into markdown: https://example.com/article",
          host: "claude-code",
          invocationMode: "explicit",
          urls: ["https://example.com/article"]
        },
        {
          installDirectory: claudeShellDirectory,
          now: new Date("2026-03-27T08:00:00.000Z")
        }
      );

      const codexResult = await runCodexAdapter(
        {
          requestText:
            "turn this webpage into markdown: https://example.com/article?host=codex",
          host: "codex",
          invocationMode: "explicit",
          urls: ["https://example.com/article?host=codex"]
        },
        {
          installDirectory: codexShellDirectory,
          now: new Date("2026-03-27T12:00:00.000Z")
        }
      );

      expect(claudeResult.ok).toBe(true);
      expect(codexResult.ok).toBe(true);
      expect(codexResult.outcome.code).toBe("HANDOFF_READY");
      expect(codexResult.handoff.context.currentHost).toBe("codex");
      expect(codexResult.debug.cacheHit).toBe(true);
      expect(codexResult.debug.cachedCandidateId).toBe(claudeResult.winner.id);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
