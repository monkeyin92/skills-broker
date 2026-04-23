import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { runOpenCodeAdapter } from "../../src/hosts/opencode/adapter";
import { installOpenCodeHostShell } from "../../src/hosts/opencode/install";
import { installSharedBrokerHome } from "../../src/shared-home/install";

type EvalHost = "claude-code" | "codex" | "opencode";

type WorkflowScenario = {
  workflowId: string;
  requestText: string;
  urls?: string[];
  startStageId: string;
  startImplementationId: string;
  resumeArtifacts: string[];
  resumedStageId: string;
};

const WORKFLOW_SCENARIOS: WorkflowScenario[] = [
  {
    workflowId: "idea-to-ship",
    requestText: "我有一个想法：做一个自动串起评审和发版的工具",
    startStageId: "office-hours",
    startImplementationId: "gstack.office_hours",
    resumeArtifacts: ["design_doc", "analysis"],
    resumedStageId: "plan-ceo-review"
  },
  {
    workflowId: "investigation-to-fix",
    requestText: "investigate this site failure with a reusable workflow",
    urls: ["https://example.com"],
    startStageId: "investigate",
    startImplementationId: "gstack.investigate",
    resumeArtifacts: ["analysis", "recommendation"],
    resumedStageId: "implement-fix"
  }
];

function defaultInvocationMode(host: EvalHost): "auto" | "explicit" {
  return host === "claude-code" ? "auto" : "explicit";
}

function workflowRequest(host: EvalHost, scenario: WorkflowScenario) {
  return {
    requestText: scenario.requestText,
    host,
    invocationMode: defaultInvocationMode(host),
    ...(scenario.urls === undefined ? {} : { urls: scenario.urls })
  } as const;
}

async function runHostAdapter(
  host: EvalHost,
  input: Parameters<typeof runClaudeCodeAdapter>[0],
  directories: {
    claudeShellDirectory: string;
    codexShellDirectory: string;
    opencodeShellDirectory: string;
  },
  now: string
) {
  switch (host) {
    case "claude-code":
      return runClaudeCodeAdapter(input, {
        installDirectory: directories.claudeShellDirectory,
        includeTrace: true,
        now: new Date(now)
      });
    case "codex":
      return runCodexAdapter(input, {
        installDirectory: directories.codexShellDirectory,
        includeTrace: true,
        now: new Date(now)
      });
    case "opencode":
      return runOpenCodeAdapter(input, {
        installDirectory: directories.opencodeShellDirectory,
        includeTrace: true,
        now: new Date(now)
      });
  }
}

describe("workflow host smoke", () => {
  it(
    "keeps Claude Code, Codex, and OpenCode aligned on workflow start and resume semantics",
    async () => {
      const runtimeDirectory = await mkdtemp(
        join(tmpdir(), "skills-broker-workflow-host-smoke-")
      );
      const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
      const claudeShellDirectory = join(
        runtimeDirectory,
        ".claude",
        "skills",
        "skills-broker"
      );
      const codexShellDirectory = join(
        runtimeDirectory,
        ".agents",
        "skills",
        "skills-broker"
      );
      const opencodeShellDirectory = join(
        runtimeDirectory,
        ".config",
        "opencode",
        "skills",
        "skills-broker"
      );

      try {
        await installSharedBrokerHome({
          brokerHomeDirectory,
          projectRoot: process.cwd()
        });
        await installClaudeCodeHostShell({
          installDirectory: claudeShellDirectory,
          brokerHomeDirectory,
          projectRoot: process.cwd()
        });
        await installCodexHostShell({
          installDirectory: codexShellDirectory,
          brokerHomeDirectory
        });
        await installOpenCodeHostShell({
          installDirectory: opencodeShellDirectory,
          brokerHomeDirectory,
          projectRoot: process.cwd()
        });

        for (const scenario of WORKFLOW_SCENARIOS) {
          for (const host of ["claude-code", "codex", "opencode"] as const) {
            const started = await runHostAdapter(
              host,
              workflowRequest(host, scenario),
              {
                claudeShellDirectory,
                codexShellDirectory,
                opencodeShellDirectory
              },
              "2026-03-31T08:00:00.000Z"
            );

            expect(started.ok).toBe(true);
            expect(started.outcome.code).toBe("WORKFLOW_STAGE_READY");
            expect(started.winner.id).toBe(scenario.workflowId);
            expect(started.workflow).toMatchObject({
              workflowId: scenario.workflowId,
              activeStageId: scenario.startStageId
            });
            expect(started.stage).toMatchObject({
              id: scenario.startStageId,
              kind: "capability"
            });
            expect(started.stage.handoff?.chosenImplementation.id).toBe(
              scenario.startImplementationId
            );
            expect(started.trace).toMatchObject({
              host,
              resultCode: "WORKFLOW_STAGE_READY",
              workflowId: scenario.workflowId,
              runId: started.workflow.runId,
              stageId: scenario.startStageId
            });

            const resumedInput = {
              requestText: "继续这个 workflow",
              host,
              invocationMode: defaultInvocationMode(host),
              workflowResume: {
                runId: started.workflow.runId,
                stageId: scenario.startStageId,
                decision: "confirm",
                artifacts: scenario.resumeArtifacts
              }
            } as const;
            const resumed = await runHostAdapter(
              host,
              resumedInput,
              {
                claudeShellDirectory,
                codexShellDirectory,
                opencodeShellDirectory
              },
              "2026-03-31T08:05:00.000Z"
            );

            expect(resumed.ok).toBe(true);
            expect(resumed.outcome.code).toBe("WORKFLOW_STAGE_READY");
            expect(resumed.workflow.runId).toBe(started.workflow.runId);
            expect(resumed.workflow.completedStageIds).toContain(
              scenario.startStageId
            );
            expect(resumed.stage.id).toBe(scenario.resumedStageId);
            expect(resumed.trace).toMatchObject({
              host,
              resultCode: "WORKFLOW_STAGE_READY",
              workflowId: scenario.workflowId,
              runId: started.workflow.runId,
              stageId: scenario.resumedStageId
            });
          }
        }
      } finally {
        await rm(runtimeDirectory, { recursive: true, force: true });
      }
    },
    90_000
  );
});
