import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { loadMaintainedBrokerFirstContract } from "../../src/core/maintained-broker-first";
import { installSharedBrokerHome } from "../../src/shared-home/install";

const execFileAsync = promisify(execFile);
const HERO_LANE_EXAMPLES = [
  '"测下这个网站的质量：https://www.baidu.com"',
  '"QA 这个网站 https://example.com"',
  '"QA this website https://example.com"',
  '"检查这个网站质量"',
  '"find a skill or MCP for website QA"',
  '"有没有现成 skill 能做这个网站 QA"'
] as const;

function expectInOrder(text: string, snippets: readonly string[]): void {
  let previousIndex = -1;

  for (const snippet of snippets) {
    const index = text.indexOf(snippet);
    expect(index, `Expected to find snippet in order: ${snippet}`).toBeGreaterThan(
      previousIndex
    );
    previousIndex = index;
  }
}

function expectCodexSkillLayout(skill: string): void {
  expectInOrder(skill, [
    "# Skills Broker",
    "Use this skill only at the coarse broker boundary.",
    "The host decides only one of these boundary outcomes:",
    "## Broker-First (`broker_first`)",
    "If you need one concrete broker-first example to calibrate the boundary, start with website QA.",
    "### Hero lane: website QA",
    "Keep website QA visually first. It is the QA default-entry lane and the calibration lane. Other maintained lanes are still valid, but secondary.",
    ...HERO_LANE_EXAMPLES,
    "### Secondary maintained lanes",
    "Requirements analysis and investigation still stay broker-first. They are maintained lanes, but they should not be the first thing this installed shell makes you try.",
    '"帮我做需求分析并产出设计文档"',
    '"帮我看看这个需求有没有漏洞"',
    '"investigate this site failure with a reusable workflow"',
    "### Other broker-first lanes",
    '"我有一个想法：做一个自动串起评审和发版的工具"',
    '"把这个页面转成 markdown: https://example.com/a"',
    '"convert this webpage to markdown https://example.com/a"',
    "## Handle Normally (`handle_normally`)",
    "## Clarify Before Broker (`clarify_before_broker`)",
    '"check this page"',
    "## Host Contract",
    "do not pick a package, workflow family, skill, or MCP at the host layer",
    "## Decline Contract",
    "If the broker returns `UNSUPPORTED_REQUEST`, continue normally.",
    "If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.",
    "If the broker returns `NO_CANDIDATE`, offer capability discovery help.",
    "If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.",
    "If the broker returns `HANDOFF_READY`, keep the broker-selected downstream path as the source of truth.",
    "If the broker returns `PREPARE_FAILED`, explain the failure clearly",
    "## Runner Contract",
    '--debug \'{"requestText":"QA this website https://example.com"'
  ]);
}

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
  it(
    "lets Claude Code and Codex reuse the same shared broker home",
    async () => {
      const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-shared-home-"));
      const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
      const claudeShellDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
      const codexShellDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");
      const buildScriptPath = join(process.cwd(), "dist", "bin", "skills-broker.js");
      const sharedRunnerPath = join(brokerHomeDirectory, "bin", "run-broker");
      const sharedDistCliPath = join(brokerHomeDirectory, "dist", "cli.js");
      const sharedMaintainedFamiliesPath = join(
        brokerHomeDirectory,
        "config",
        "maintained-broker-first-families.json"
      );
      const claudeManifestPath = join(
        claudeShellDirectory,
        ".claude-plugin",
        "plugin.json"
      );
      const codexSkillPath = join(codexShellDirectory, "SKILL.md");
      const codexRunnerPath = join(codexShellDirectory, "bin", "run-broker");

      try {
        const sourceContract = await loadMaintainedBrokerFirstContract();
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
        ], {
          cwd: runtimeDirectory
        });

        const { stdout: doctorStdout } = await execFileAsync("node", [
          buildScriptPath,
          "doctor",
          "--json",
          "--broker-home",
          brokerHomeDirectory,
          "--claude-dir",
          claudeShellDirectory,
          "--codex-dir",
          codexShellDirectory
        ], {
          cwd: runtimeDirectory
        });
        const doctorResult = JSON.parse(doctorStdout) as {
          adoptionHealth: {
            status: string;
            managedHosts: string[];
          };
        };

        expect(doctorResult.adoptionHealth).toMatchObject({
          status: "green",
          managedHosts: ["claude-code", "codex"]
        });

        await expect(access(sharedRunnerPath)).resolves.toBeUndefined();
        await expect(access(sharedDistCliPath)).resolves.toBeUndefined();
        await expect(access(sharedMaintainedFamiliesPath)).resolves.toBeUndefined();
        await expect(access(claudeManifestPath)).resolves.toBeUndefined();
        await expect(access(codexSkillPath)).resolves.toBeUndefined();

        const sharedContract = await loadMaintainedBrokerFirstContract(
          sharedMaintainedFamiliesPath
        );
        expect(sharedContract).toEqual(sourceContract);

        const codexSkillContents = await readFile(codexSkillPath, "utf8");
        expectCodexSkillLayout(codexSkillContents);
        expect(codexSkillContents).toContain(
          "Treat the examples below as semantic anchors, not literal trigger phrases."
        );
        expect(codexSkillContents).toContain(
          "Prefer semantic judgment over exact string overlap."
        );

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
              "turn this webpage into markdown: https://example.com/article",
            host: "codex",
            invocationMode: "explicit",
            urls: ["https://example.com/article"]
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
    },
    90_000
  );

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
  }, 30_000);
});
