import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { installSharedBrokerHome } from "../../src/shared-home/install";

type EvalHost = "claude-code" | "codex";

const WORKFLOW_IDEA_REQUESTS = [
  "我有一个想法：做一个自动串起评审和发版的工具",
  "如果在mac的摄像头遮挡处，弄一个codex或者claude code的进度提示，就像iPhone的胶囊岛一样的，这样就不用傻傻盯着cli了"
] as const;

function ideaRequest(host: EvalHost, requestText: string) {
  return {
    requestText,
    host,
    invocationMode: host === "claude-code" ? "auto" : "explicit"
  } as const;
}

describe("workflow host smoke", () => {
  it(
    "keeps Claude Code and Codex aligned on workflow start and resume semantics",
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

        for (const requestText of WORKFLOW_IDEA_REQUESTS) {
          for (const host of ["claude-code", "codex"] as const) {
            const started =
              host === "claude-code"
                ? await runClaudeCodeAdapter(ideaRequest(host, requestText), {
                    installDirectory: claudeShellDirectory,
                    includeTrace: true,
                    now: new Date("2026-03-31T08:00:00.000Z")
                  })
                : await runCodexAdapter(ideaRequest(host, requestText), {
                    installDirectory: codexShellDirectory,
                    includeTrace: true,
                    now: new Date("2026-03-31T08:00:00.000Z")
                  });

            expect(started.ok).toBe(true);
            expect(started.outcome.code).toBe("WORKFLOW_STAGE_READY");
            expect(started.winner.id).toBe("idea-to-ship");
            expect(started.workflow).toMatchObject({
              workflowId: "idea-to-ship",
              activeStageId: "office-hours"
            });
            expect(started.stage).toMatchObject({
              id: "office-hours",
              kind: "capability"
            });
            expect(started.trace).toMatchObject({
              host,
              resultCode: "WORKFLOW_STAGE_READY",
              workflowId: "idea-to-ship",
              runId: started.workflow.runId,
              stageId: "office-hours"
            });

            const resumedInput = {
              requestText: "继续这个 workflow",
              host,
              invocationMode: host === "claude-code" ? "auto" : "explicit",
              workflowResume: {
                runId: started.workflow.runId,
                stageId: "office-hours",
                decision: "confirm",
                artifacts: ["design_doc", "analysis"]
              }
            } as const;
            const resumed =
              host === "claude-code"
                ? await runClaudeCodeAdapter(resumedInput, {
                    installDirectory: claudeShellDirectory,
                    includeTrace: true,
                    now: new Date("2026-03-31T08:05:00.000Z")
                  })
                : await runCodexAdapter(resumedInput, {
                    installDirectory: codexShellDirectory,
                    includeTrace: true,
                    now: new Date("2026-03-31T08:05:00.000Z")
                  });

            expect(resumed.ok).toBe(true);
            expect(resumed.outcome.code).toBe("WORKFLOW_STAGE_READY");
            expect(resumed.workflow.runId).toBe(started.workflow.runId);
            expect(resumed.workflow.completedStageIds).toContain("office-hours");
            expect(resumed.stage.id).toBe("plan-ceo-review");
            expect(resumed.trace).toMatchObject({
              host,
              resultCode: "WORKFLOW_STAGE_READY",
              workflowId: "idea-to-ship",
              runId: started.workflow.runId,
              stageId: "plan-ceo-review"
            });
          }
        }
      } finally {
        await rm(runtimeDirectory, { recursive: true, force: true });
      }
    },
    15_000
  );
});
