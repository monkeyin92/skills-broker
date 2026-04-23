import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { runOpenCodeAdapter } from "../../src/hosts/opencode/adapter";
import { loadMaintainedBrokerFirstContract } from "../../src/core/maintained-broker-first";
import {
  formatCoarseBoundaryLine,
  formatFullLifecycleParityLine,
  formatPublishedLifecycleCommandsLine,
  formatSupportedHostsLine,
  formatThirdHostReadinessLine
} from "../../src/core/operator-truth";
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

async function buildPublishedCli(): Promise<void> {
  await execFileAsync(
    process.execPath,
    [join(process.cwd(), "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.build.json"],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );
  await execFileAsync(
    process.execPath,
    [
      "-e",
      "const fs=require('fs');const file='dist/bin/skills-broker.js';const content=fs.readFileSync(file,'utf8');if(!content.startsWith('#!'))fs.writeFileSync(file,'#!/usr/bin/env node\\n'+content);"
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );
}

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
    formatCoarseBoundaryLine(),
    "## Supported Host Truth",
    formatSupportedHostsLine(),
    formatFullLifecycleParityLine(),
    formatPublishedLifecycleCommandsLine(),
    formatThirdHostReadinessLine(),
    "## Broker-First (`broker_first`)",
    "If you need one concrete broker-first example to calibrate the boundary, start with website QA.",
    "### Hero lane: website QA",
    "Keep website QA visually first. It is the QA default-entry lane and the calibration lane. Other maintained lanes are still valid, but secondary.",
    ...HERO_LANE_EXAMPLES,
    "### Secondary maintained lanes",
    "The second proven family is web markdown. Keep it visible here after website QA, not as a competing first move.",
    "The next proven family is social markdown. Keep it visible after web markdown, not as a competing first move.",
    "Requirements analysis and investigation still stay broker-first. They are maintained lanes, but they should not be the first thing this installed shell makes you try.",
    '"把这个页面转成 markdown: https://example.com/a"',
    '"convert this webpage to markdown https://example.com/a"',
    '"save this X post as markdown: https://x.com/example/status/1"',
    '"把这个帖子转成 markdown: https://x.com/example/status/1"',
    '"帮我做需求分析并产出设计文档"',
    '"帮我看看这个需求有没有漏洞"',
    '"investigate this site failure with a reusable workflow"',
    "### Other broker-first lanes",
    '"我有一个想法：做一个自动串起评审和发版的工具"',
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
    "lets Claude Code, Codex, and OpenCode reuse the same shared broker home",
    async () => {
      const runtimeDirectory = await mkdtemp(
        join(tmpdir(), "skills broker awkward \"$HOME\" $(echo nope)-")
      );
      const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
      const claudeShellDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
      const codexShellDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");
      const opencodeShellDirectory = join(
        runtimeDirectory,
        ".config",
        "opencode",
        "skills",
        "skills-broker"
      );
      const buildScriptPath = join(process.cwd(), "dist", "bin", "skills-broker.js");
      const sharedRunnerPath = join(brokerHomeDirectory, "bin", "run-broker");
      const sharedDistCliPath = join(brokerHomeDirectory, "dist", "cli.js");
      const sharedMaintainedFamiliesPath = join(
        brokerHomeDirectory,
        "config",
        "maintained-broker-first-families.json"
      );
      const socialProofHostCatalogPath = join(
        runtimeDirectory,
        "social-proof-host.json"
      );
      const socialProofMcpRegistryPath = join(
        runtimeDirectory,
        "social-proof-mcp.json"
      );
      const socialProofCacheFilePath = join(
        runtimeDirectory,
        "social-proof-cache.json"
      );
      const sharedInstalledSocialDirectory = join(
        brokerHomeDirectory,
        "downstream",
        "claude-code",
        "skills",
        "baoyu-danger-x-to-markdown"
      );
      const claudeManifestPath = join(
        claudeShellDirectory,
        ".claude-plugin",
        "plugin.json"
      );
      const codexSkillPath = join(codexShellDirectory, "SKILL.md");
      const codexRunnerPath = join(codexShellDirectory, "bin", "run-broker");
      const opencodeSkillPath = join(opencodeShellDirectory, "SKILL.md");
      const opencodeRunnerPath = join(opencodeShellDirectory, "bin", "run-broker");

      try {
        const sourceContract = await loadMaintainedBrokerFirstContract();
        await buildPublishedCli();
        await expect(access(buildScriptPath)).resolves.toBeUndefined();
        await execFileAsync("node", [
          buildScriptPath,
          "update",
          "--broker-home",
          brokerHomeDirectory,
          "--claude-dir",
          claudeShellDirectory,
          "--codex-dir",
          codexShellDirectory,
          "--opencode-dir",
          opencodeShellDirectory
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
          codexShellDirectory,
          "--opencode-dir",
          opencodeShellDirectory
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
          managedHosts: ["claude-code", "codex", "opencode"]
        });

        await expect(access(sharedRunnerPath)).resolves.toBeUndefined();
        await expect(access(sharedDistCliPath)).resolves.toBeUndefined();
        await expect(access(sharedMaintainedFamiliesPath)).resolves.toBeUndefined();
        await expect(access(claudeManifestPath)).resolves.toBeUndefined();
        await expect(access(codexSkillPath)).resolves.toBeUndefined();
        await expect(access(opencodeSkillPath)).resolves.toBeUndefined();

        const sharedContract = await loadMaintainedBrokerFirstContract(
          sharedMaintainedFamiliesPath
        );
        expect(sharedContract).toEqual(sourceContract);

        const codexSkillContents = await readFile(codexSkillPath, "utf8");
        const codexRunnerContents = await readFile(codexRunnerPath, "utf8");
        const opencodeSkillContents = await readFile(opencodeSkillPath, "utf8");
        const opencodeRunnerContents = await readFile(opencodeRunnerPath, "utf8");
        expectCodexSkillLayout(codexSkillContents);
        expectCodexSkillLayout(opencodeSkillContents);
        expect(codexSkillContents).toContain(
          "Treat the examples below as semantic anchors, not literal trigger phrases."
        );
        expect(codexSkillContents).toContain(
          "Prefer semantic judgment over exact string overlap."
        );
        expect(codexRunnerContents).toContain(".skills-broker.json");
        expect(codexRunnerContents).not.toContain(brokerHomeDirectory);
        expect(opencodeSkillContents).toContain('"host":"opencode"');
        expect(opencodeSkillContents).toContain('"invocationMode":"explicit"');
        expect(opencodeRunnerContents).toContain(".skills-broker.json");
        expect(opencodeRunnerContents).toContain('BROKER_CURRENT_HOST="opencode"');
        expect(opencodeRunnerContents).not.toContain(brokerHomeDirectory);

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
        const opencodeResult = await runOpenCodeAdapter(
          {
            requestText:
              "turn this webpage into markdown: https://example.com/article",
            host: "opencode",
            invocationMode: "explicit",
            urls: ["https://example.com/article"]
          },
          {
            installDirectory: opencodeShellDirectory,
            now: new Date("2026-03-27T16:00:00.000Z")
          }
        );

        expect(claudeResult.ok).toBe(true);
        expect(codexResult.ok).toBe(true);
        expect(opencodeResult.ok).toBe(true);
        expect(codexResult.outcome.code).toBe("HANDOFF_READY");
        expect(codexResult.handoff.context.currentHost).toBe("codex");
        expect(codexResult.debug.cacheHit).toBe(true);
        expect(codexResult.debug.cachedCandidateId).toBe(claudeResult.winner.id);
        expect(codexResult).not.toHaveProperty("trace");
        expect(opencodeResult.outcome.code).toBe("HANDOFF_READY");
        expect(opencodeResult.handoff.context.currentHost).toBe("opencode");
        expect(opencodeResult.debug.cacheHit).toBe(true);
        expect(opencodeResult.debug.cachedCandidateId).toBe(claudeResult.winner.id);
        expect(opencodeResult).not.toHaveProperty("trace");

        await writeFile(
          socialProofHostCatalogPath,
          JSON.stringify({
            packages: [
              {
                packageId: "baoyu",
                label: "baoyu",
                installState: "available",
                acquisition: "published_package",
                probe: {
                  layouts: ["single_skill_directory"]
                }
              }
            ],
            skills: [
              {
                id: "social-post-to-markdown",
                kind: "skill",
                label: "Social Post to Markdown",
                intent: "social_post_to_markdown",
                package: {
                  packageId: "baoyu"
                },
                leaf: {
                  capabilityId: "baoyu.x-post-to-markdown",
                  packageId: "baoyu",
                  subskillId: "x-post-to-markdown",
                  probe: {
                    manifestNames: ["baoyu-danger-x-to-markdown"],
                    aliases: ["x-post-to-markdown"]
                  }
                },
                query: {
                  proofFamily: "social_post_to_markdown",
                  jobFamilies: ["content_acquisition", "social_content_conversion"],
                  targetTypes: ["url", "website"],
                  artifacts: ["markdown"],
                  examples: ["save this X post as markdown"]
                },
                implementation: {
                  id: "baoyu.x_post_to_markdown",
                  type: "local_skill",
                  ownerSurface: "broker_owned_downstream"
                }
              }
            ]
          }),
          "utf8"
        );
        await writeFile(
          socialProofMcpRegistryPath,
          JSON.stringify({ servers: [] }),
          "utf8"
        );

        const socialInstallRequired = await runClaudeCodeAdapter(
          {
            requestText: "save this X post as markdown",
            host: "claude-code",
            invocationMode: "explicit",
            urls: ["https://x.com/example/status/1"]
          },
          {
            installDirectory: claudeShellDirectory,
            includeTrace: true,
            cacheFilePath: socialProofCacheFilePath,
            hostCatalogFilePath: socialProofHostCatalogPath,
            mcpRegistryFilePath: socialProofMcpRegistryPath,
            now: new Date("2026-03-27T18:00:00.000Z")
          }
        );

        expect(socialInstallRequired.ok).toBe(false);
        expect(socialInstallRequired.outcome.code).toBe("INSTALL_REQUIRED");
        expect(socialInstallRequired.trace).toMatchObject({
          host: "claude-code",
          resultCode: "INSTALL_REQUIRED",
          winnerId: "social-post-to-markdown",
          selectedCapabilityId: "baoyu.x-post-to-markdown",
          selectedLeafCapabilityId: "x-post-to-markdown"
        });

        await mkdir(sharedInstalledSocialDirectory, { recursive: true });
        await writeFile(
          join(sharedInstalledSocialDirectory, "SKILL.md"),
          "---\nname: baoyu-danger-x-to-markdown\n---\n",
          "utf8"
        );

        const socialVerified = await runClaudeCodeAdapter(
          {
            requestText: "save this X post as markdown",
            host: "claude-code",
            invocationMode: "explicit",
            urls: ["https://x.com/example/status/1"]
          },
          {
            installDirectory: claudeShellDirectory,
            includeTrace: true,
            cacheFilePath: socialProofCacheFilePath,
            hostCatalogFilePath: socialProofHostCatalogPath,
            mcpRegistryFilePath: socialProofMcpRegistryPath,
            now: new Date("2026-03-27T18:05:00.000Z")
          }
        );

        expect(socialVerified.ok).toBe(true);
        expect(socialVerified.outcome.code).toBe("HANDOFF_READY");
        expect(socialVerified.winner.id).toBe("social-post-to-markdown");
        expect(socialVerified.trace).toMatchObject({
          host: "claude-code",
          resultCode: "HANDOFF_READY",
          winnerId: "social-post-to-markdown",
          selectedCapabilityId: "baoyu.x-post-to-markdown",
          selectedLeafCapabilityId: "x-post-to-markdown"
        });

        const socialReused = await runOpenCodeAdapter(
          {
            requestText: "save this X post as markdown",
            host: "opencode",
            invocationMode: "explicit",
            urls: ["https://x.com/example/status/1"]
          },
          {
            installDirectory: opencodeShellDirectory,
            includeTrace: true,
            cacheFilePath: socialProofCacheFilePath,
            hostCatalogFilePath: socialProofHostCatalogPath,
            mcpRegistryFilePath: socialProofMcpRegistryPath,
            now: new Date("2026-03-27T18:10:00.000Z")
          }
        );

        expect(socialReused.ok).toBe(true);
        expect(socialReused.outcome.code).toBe("HANDOFF_READY");
        expect(socialReused.winner.id).toBe("social-post-to-markdown");
        expect(socialReused.trace).toMatchObject({
          host: "opencode",
          resultCode: "HANDOFF_READY",
          winnerId: "social-post-to-markdown",
          selectedCapabilityId: "baoyu.x-post-to-markdown",
          selectedLeafCapabilityId: "x-post-to-markdown"
        });

        const { stdout: parityDoctorStdout } = await execFileAsync("node", [
          buildScriptPath,
          "doctor",
          "--json",
          "--broker-home",
          brokerHomeDirectory,
          "--claude-dir",
          claudeShellDirectory,
          "--codex-dir",
          codexShellDirectory,
          "--opencode-dir",
          opencodeShellDirectory
        ], {
          cwd: runtimeDirectory
        });
        const parityDoctorResult = JSON.parse(parityDoctorStdout) as {
          acquisitionMemory: {
            state: string;
            entries: number;
            successfulRoutes: number;
            firstReuseRecorded: number;
            crossHostReuse: number;
          };
          familyProofs: {
            web_content_to_markdown: {
              verifyState: string;
              crossHostReuseState: string;
              reuseRecorded: number;
            };
            social_post_to_markdown: {
              verifyState: string;
              crossHostReuseState: string;
              reuseRecorded: number;
            };
          };
          adoptionHealth: {
            status: string;
            managedHosts: string[];
          };
        };

        expect(parityDoctorResult.acquisitionMemory).toEqual(
          expect.objectContaining({
            state: "present",
            entries: 2,
            successfulRoutes: 5,
            firstReuseRecorded: 2,
            crossHostReuse: 2
          })
        );
        expect(parityDoctorResult.familyProofs.web_content_to_markdown).toEqual(
          expect.objectContaining({
            verifyState: "confirmed",
            crossHostReuseState: "confirmed",
            reuseRecorded: 1
          })
        );
        expect(parityDoctorResult.familyProofs.social_post_to_markdown).toEqual(
          expect.objectContaining({
            verifyState: "confirmed",
            crossHostReuseState: "confirmed",
            reuseRecorded: 1
          })
        );
        expect(parityDoctorResult.adoptionHealth).toEqual(
          expect.objectContaining({
            status: "green",
            managedHosts: ["claude-code", "codex", "opencode"]
          })
        );

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
