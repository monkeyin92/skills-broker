import { access, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";

const execFileAsync = promisify(execFile);

describe("host auto-routing smoke", () => {
  it("covers routed and declined outcomes through installed host shells", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-routing-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const claudeShellDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexShellDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");
    const buildScriptPath = join(process.cwd(), "dist", "bin", "skills-broker.js");

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

      const socialResult = await runClaudeCodeAdapter(
        {
          requestText: "save this X post as markdown: https://x.com/example/status/1",
          host: "claude-code",
          invocationMode: "auto",
          urls: ["https://x.com/example/status/1"]
        },
        {
          installDirectory: claudeShellDirectory,
          now: new Date("2026-03-30T01:00:00.000Z")
        }
      );

      const discoveryResult = await runCodexAdapter(
        {
          requestText: "find a skill to save webpages as markdown",
          host: "codex",
          invocationMode: "explicit"
        },
        {
          installDirectory: codexShellDirectory,
          now: new Date("2026-03-30T02:00:00.000Z")
        }
      );

      const unsupportedResult = await runClaudeCodeAdapter(
        {
          requestText: "explain this codebase layout",
          host: "claude-code",
          invocationMode: "auto"
        },
        {
          installDirectory: claudeShellDirectory,
          now: new Date("2026-03-30T03:00:00.000Z")
        }
      );

      const ambiguousResult = await runCodexAdapter(
        {
          requestText: "save this page",
          host: "codex",
          invocationMode: "auto",
          urls: ["https://example.com/article"]
        },
        {
          installDirectory: codexShellDirectory,
          now: new Date("2026-03-30T04:00:00.000Z")
        }
      );

      expect(socialResult).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          request: {
            intent: "social_post_to_markdown"
          }
        }
      });

      expect(discoveryResult).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          request: {
            intent: "capability_discovery_or_install"
          }
        }
      });

      expect(unsupportedResult).toMatchObject({
        ok: false,
        outcome: {
          code: "UNSUPPORTED_REQUEST",
          hostAction: "continue_normally"
        }
      });

      expect(ambiguousResult).toMatchObject({
        ok: false,
        outcome: {
          code: "AMBIGUOUS_REQUEST",
          hostAction: "ask_clarifying_question"
        }
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
