import { access, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createSyntheticHostSkippedBrokerTrace } from "../../src/broker/trace";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { runOpenCodeAdapter } from "../../src/hosts/opencode/adapter";
import { loadMaintainedBrokerFirstContract } from "../../src/core/maintained-broker-first";

const execFileAsync = promisify(execFile);
const maintainedContract = await loadMaintainedBrokerFirstContract();
const maintainedExamples = maintainedContract.maintainedFamilies.flatMap(
  (family) => family.boundaryExamples
);
const maintainedFamilies = maintainedContract.maintainedFamilies.map(
  (family) => family.family
);

function expectQueryNativeRequest(
  request: {
    outputMode: string;
    capabilityQuery: Record<string, unknown>;
  }
): void {
  expect(request).not.toHaveProperty("intent");
  expect(request.outputMode).toBe("markdown_only");
}

describe("installed host-shell routing smoke", () => {
  it(
    "covers routed and declined broker outcomes once the installed host shell is invoked",
    async () => {
      const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-routing-"));
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

      const requirementsAnalysisRequest = maintainedExamples.find((example) =>
        example.includes("需求分析")
      ) ?? "帮我做需求分析并产出设计文档";
      const qualityAssuranceRequest = maintainedExamples.find((example) =>
        example.includes("网站")
      ) ?? "测下这个网站的质量";
      const investigationRequest = maintainedExamples.find((example) =>
        example.includes("investigate") || example.includes("排查")
      ) ?? "investigate this site failure with a reusable workflow";

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
      const opencodeMarkdownResult = await runOpenCodeAdapter(
        {
          requestText: "turn this webpage into markdown: https://example.com/opencode",
          host: "opencode",
          invocationMode: "explicit",
          urls: ["https://example.com/opencode"]
        },
        {
          installDirectory: opencodeShellDirectory,
          now: new Date("2026-03-30T02:15:00.000Z")
        }
      );

      const requirementsResult = await runClaudeCodeAdapter(
        {
          requestText: requirementsAnalysisRequest,
          host: "claude-code",
          invocationMode: "auto"
        },
        {
          installDirectory: claudeShellDirectory,
          now: new Date("2026-03-30T02:30:00.000Z")
        }
      );

      const qaResult = await runCodexAdapter(
        {
          requestText: qualityAssuranceRequest,
          host: "codex",
          invocationMode: "explicit",
          urls: ["https://example.com"]
        },
        {
          installDirectory: codexShellDirectory,
          now: new Date("2026-03-30T02:45:00.000Z")
        }
      );

      const investigationResult = await runClaudeCodeAdapter(
        {
          requestText: investigationRequest,
          host: "claude-code",
          invocationMode: "auto",
          urls: ["https://example.com"]
        },
        {
          installDirectory: claudeShellDirectory,
          now: new Date("2026-03-30T02:50:00.000Z")
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
      const opencodeUnsupportedResult = await runOpenCodeAdapter(
        {
          requestText: "explain this codebase layout",
          host: "opencode",
          invocationMode: "explicit"
        },
        {
          installDirectory: opencodeShellDirectory,
          now: new Date("2026-03-30T03:30:00.000Z")
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
          request: {}
        }
      });
      expectQueryNativeRequest(socialResult.handoff.request);

      expect(discoveryResult).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          request: {}
        }
      });
      expectQueryNativeRequest(discoveryResult.handoff.request);

      expect(opencodeMarkdownResult).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          context: {
            currentHost: "opencode"
          },
          request: {}
        }
      });
      expectQueryNativeRequest(opencodeMarkdownResult.handoff.request);

      expect(requirementsResult).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          chosenPackage: {
            packageId: "gstack"
          },
          chosenLeafCapability: {
            subskillId: "office-hours"
          },
          chosenImplementation: {
            id: "gstack.office_hours"
          },
          request: {
            capabilityQuery: {
              goal: "analyze a product requirement and produce a design doc",
              jobFamilies: ["requirements_analysis"],
              targets: [
                {
                  type: "problem_statement",
                  value: "帮我做需求分析并产出设计文档"
                }
              ],
              artifacts: ["design_doc", "analysis"]
            }
          }
        }
      });
      expectQueryNativeRequest(requirementsResult.handoff.request);

      expect(qaResult).toMatchObject({
        ok: true,
        outcome: {
          code: "HANDOFF_READY"
        },
        handoff: {
          chosenPackage: {
            packageId: "gstack"
          },
          chosenLeafCapability: {
            subskillId: "qa"
          },
          chosenImplementation: {
            id: "gstack.qa"
          },
          request: {
            capabilityQuery: {
              goal: "qa a website",
              requestText: qualityAssuranceRequest,
              jobFamilies: ["quality_assurance"],
              targets: [
                {
                  type: "website",
                  value: "https://example.com"
                }
              ],
              artifacts: ["qa_report"]
            }
          }
        }
      });
      expectQueryNativeRequest(qaResult.handoff.request);

      expect(investigationResult).toMatchObject({
        ok: true,
        outcome: {
          code: "WORKFLOW_STAGE_READY"
        },
        winner: {
          id: "investigation-to-fix"
        },
        workflow: {
          workflowId: "investigation-to-fix",
          activeStageId: "investigate"
        },
        stage: {
          id: "investigate",
          handoff: {
            chosenPackage: {
              packageId: "gstack"
            },
            chosenLeafCapability: {
              subskillId: "investigate"
            },
            chosenImplementation: {
              id: "gstack.investigate"
            },
            request: {
              capabilityQuery: {
                goal: "investigate a site failure and identify root cause",
                requestText: "investigate this site failure with a reusable workflow",
                jobFamilies: ["investigation"],
                targets: [
                  {
                    type: "website",
                    value: "https://example.com"
                  }
                ],
                artifacts: ["analysis", "recommendation"]
              }
            }
          }
        }
      });
      expectQueryNativeRequest(investigationResult.stage.handoff!.request);

      expect(unsupportedResult).toMatchObject({
        ok: false,
        outcome: {
          code: "UNSUPPORTED_REQUEST",
          hostAction: "continue_normally"
        }
      });
      expect(opencodeUnsupportedResult).toMatchObject({
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
      expect(requirementsResult.handoff.request.capabilityQuery?.requestText).toBe(
        requirementsAnalysisRequest
      );
      expect(qaResult.handoff.request.capabilityQuery?.requestText).toBe(
        qualityAssuranceRequest
      );
      expect(
        investigationResult.stage.handoff?.request.capabilityQuery?.requestText
      ).toBe(
        investigationRequest
      );
      expect(
        ["requirements_analysis", "quality_assurance", "investigation"].sort()
      ).toEqual([...maintainedFamilies].sort());
      expect(socialResult).not.toHaveProperty("trace");
      expect(qaResult).not.toHaveProperty("trace");
      expect(investigationResult).not.toHaveProperty("trace");
      expect(opencodeMarkdownResult).not.toHaveProperty("trace");
      } finally {
        await rm(runtimeDirectory, { recursive: true, force: true });
      }
    },
    90_000
  );

  it(
    "lets installed host adapters opt into routing trace without changing default output",
    async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-debug-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexShellDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");
    const buildScriptPath = join(process.cwd(), "dist", "bin", "skills-broker.js");

    try {
      await expect(access(buildScriptPath)).resolves.toBeUndefined();
      await execFileAsync("node", [
        buildScriptPath,
        "update",
        "--broker-home",
        brokerHomeDirectory,
        "--codex-dir",
        codexShellDirectory
      ]);

      const defaultResult = await runCodexAdapter(
        {
          requestText: "测下这个网站的质量",
          host: "codex",
          invocationMode: "explicit",
          urls: ["https://example.com"]
        },
        {
          installDirectory: codexShellDirectory,
          now: new Date("2026-03-31T06:00:00.000Z")
        }
      );

      const debugResult = await runCodexAdapter(
        {
          requestText: "测下这个网站的质量",
          host: "codex",
          invocationMode: "explicit",
          urls: ["https://example.com"]
        },
        {
          installDirectory: codexShellDirectory,
          includeTrace: true,
          now: new Date("2026-03-31T06:05:00.000Z")
        }
      );

      expect(defaultResult).not.toHaveProperty("trace");
      expect(debugResult).toMatchObject({
        trace: {
          host: "codex",
          hostDecision: "broker_first",
          resultCode: "HANDOFF_READY",
          missLayer: null,
          winnerId: "website-qa"
        }
      });
      } finally {
        await rm(runtimeDirectory, { recursive: true, force: true });
      }
    },
    30_000
  );

  it("records a synthetic host-selection trace when the host never invokes the broker", () => {
    const trace = createSyntheticHostSkippedBrokerTrace({
      requestText: "测下这个网站的质量：https://www.baidu.com",
      host: "codex",
      now: new Date("2026-03-31T02:45:00.000Z")
    });

    expect(trace).toMatchObject({
      traceVersion: "2026-03-31",
      requestText: "测下这个网站的质量：https://www.baidu.com",
      host: "codex",
      hostDecision: "handle_normally",
      resultCode: "HOST_SKIPPED_BROKER",
      missLayer: "host_selection",
      normalizedBy: null,
      requestSurface: null,
      hostAction: "continue_normally",
      candidateCount: null,
      winnerId: null,
      winnerPackageId: null,
      timestamp: "2026-03-31T02:45:00.000Z"
    });
  });
});
