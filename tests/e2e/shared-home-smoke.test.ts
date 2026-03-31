import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { installSharedBrokerHome } from "../../src/shared-home/install";

const execFileAsync = promisify(execFile);

async function writeLegacyCodexShell(
  installDirectory: string,
  brokerHomeDirectory: string
): Promise<void> {
  const runnerPath = join(installDirectory, "bin", "run-broker");

  await mkdir(join(installDirectory, "bin"), { recursive: true });
  await writeFile(join(installDirectory, "SKILL.md"), "# Skills Broker\n", "utf8");
  await writeFile(
    join(installDirectory, ".skills-broker.json"),
    `${JSON.stringify({
      managedBy: "skills-broker",
      host: "codex",
      version: "0.1.5",
      brokerHome: brokerHomeDirectory
    }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    runnerPath,
    `#!/usr/bin/env bash
set -euo pipefail

BROKER_INPUT="\${1:-}"

if [[ -z "\${BROKER_INPUT}" ]]; then
  echo "usage: $0 '<broker-envelope-json>'" >&2
  exit 1
fi

BROKER_CURRENT_HOST="codex" exec "${brokerHomeDirectory}/bin/run-broker" "\${BROKER_INPUT}"
`,
    "utf8"
  );
  await chmod(runnerPath, 0o755);
}

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
    const codexRunnerPath = join(codexShellDirectory, "bin", "run-broker");

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
      expect(codexSkillContents).toContain("Use this skill only at the coarse broker boundary.");
      expect(codexSkillContents).toContain("## Broker-First");
      expect(codexSkillContents).toContain("## Handle Normally");
      expect(codexSkillContents).toContain("## Clarify Before Broker");
      expect(codexSkillContents).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
      expect(codexSkillContents).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
      expect(codexSkillContents).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery or install help.");
      expect(codexSkillContents).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");

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
      expect(codexResult).not.toHaveProperty("trace");

      const { stdout: sharedRunnerStdout } = await execFileAsync(
        sharedRunnerPath,
        [
          "--debug",
          JSON.stringify({
            requestText: "turn this webpage into markdown: https://example.com/debug",
            host: "claude-code",
            invocationMode: "explicit",
            urls: ["https://example.com/debug"]
          })
        ],
        {
          env: {
            ...process.env,
            BROKER_CURRENT_HOST: "claude-code",
            BROKER_NOW: "2026-03-31T09:00:00.000Z"
          }
        }
      );
      const sharedRunnerResult = JSON.parse(sharedRunnerStdout) as {
        trace?: {
          host: string;
          resultCode: string;
          missLayer: string | null;
        };
      };

      expect(sharedRunnerResult).toMatchObject({
        trace: {
          host: "claude-code",
          resultCode: "HANDOFF_READY",
          missLayer: null
        }
      });

      const { stdout: codexRunnerStdout } = await execFileAsync(
        codexRunnerPath,
        [
          "--debug",
          JSON.stringify({
            requestText: "测下这个网站的质量",
            host: "codex",
            invocationMode: "explicit",
            urls: ["https://example.com/debug-qa"]
          })
        ],
        {
          cwd: codexShellDirectory,
          env: {
            ...process.env,
            BROKER_NOW: "2026-03-31T09:15:00.000Z"
          }
        }
      );
      const codexRunnerResult = JSON.parse(codexRunnerStdout) as {
        trace?: {
          host: string;
          resultCode: string;
          missLayer: string | null;
          winnerId: string | null;
        };
      };

      expect(codexRunnerResult).toMatchObject({
        trace: {
          host: "codex",
          resultCode: "HANDOFF_READY",
          missLayer: null,
          winnerId: "website-qa"
        }
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("keeps an old codex host shell working against a new shared runtime", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-mixed-version-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexShellDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeLegacyCodexShell(codexShellDirectory, brokerHomeDirectory);

      const result = await runCodexAdapter(
        {
          requestText: "turn this webpage into markdown: https://example.com/article",
          host: "codex",
          invocationMode: "explicit",
          urls: ["https://example.com/article"]
        },
        {
          installDirectory: codexShellDirectory,
          now: new Date("2026-03-31T08:00:00.000Z")
        }
      );

      expect(result).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          chosenImplementation: {
            id: "baoyu.url_to_markdown"
          }
        }
      });
      expect(result).not.toHaveProperty("trace");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
