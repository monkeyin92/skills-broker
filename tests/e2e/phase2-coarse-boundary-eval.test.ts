import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createSyntheticHostSkippedBrokerTrace,
  type BrokerRoutingTrace
} from "../../src/broker/trace";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { installSharedBrokerHome } from "../../src/shared-home/install";

const PHASE2_BOUNDARY_DECISIONS = [
  "broker_first",
  "handle_normally",
  "clarify_before_broker"
] as const;

type EvalHost = "claude-code" | "codex";

type EvalExpectation = Pick<
  BrokerRoutingTrace,
  "hostDecision" | "resultCode"
> &
  Partial<
    Pick<
      BrokerRoutingTrace,
      "hostAction" | "normalizedBy" | "requestSurface" | "winnerId"
    >
  >;

type EvalCaseBase = {
  id: string;
  hosts: EvalHost[];
  requestText: string;
  now: string;
  expect: EvalExpectation;
};

type SyntheticHostSkippedEvalCase = EvalCaseBase & {
  mode: "synthetic_host_skip";
};

type HostRunnerEvalCase = EvalCaseBase & {
  mode: "host_runner";
  urls?: string[];
};

type EvalCase = SyntheticHostSkippedEvalCase | HostRunnerEvalCase;

type EvalFixture = {
  cases: EvalCase[];
};

type InstalledHostShells = {
  "claude-code": string;
  codex: string;
};

async function loadEvalFixture(): Promise<EvalCase[]> {
  const fixturePath = join(
    process.cwd(),
    "tests",
    "fixtures",
    "phase2-coarse-boundary-eval.json"
  );
  const fixture = JSON.parse(
    await readFile(fixturePath, "utf8")
  ) as EvalFixture;

  return fixture.cases;
}

function defaultInvocationMode(host: EvalHost): "auto" | "explicit" {
  return host === "claude-code" ? "auto" : "explicit";
}

async function runHostRunnerEvalCase(
  testCase: HostRunnerEvalCase,
  host: EvalHost,
  shellDirectories: InstalledHostShells
): Promise<BrokerRoutingTrace> {
  const input = {
    requestText: testCase.requestText,
    host,
    invocationMode: defaultInvocationMode(host),
    ...(testCase.urls === undefined ? {} : { urls: testCase.urls })
  } as const;

  const result =
    host === "claude-code"
      ? await runClaudeCodeAdapter(input, {
          installDirectory: shellDirectories["claude-code"],
          includeTrace: true,
          now: new Date(testCase.now)
        })
      : await runCodexAdapter(input, {
          installDirectory: shellDirectories.codex,
          includeTrace: true,
          now: new Date(testCase.now)
        });

  expect(result.trace).toBeDefined();

  return result.trace;
}

describe("Phase 2 coarse-boundary eval harness", () => {
  it(
    "keeps Claude Code and Codex aligned on the maintained coarse-boundary eval set",
    async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-phase2-boundary-")
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
      const cases = await loadEvalFixture();

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

      const observedDecisions = new Set<BrokerRoutingTrace["hostDecision"]>();

      for (const testCase of cases) {
        const signatures: string[] = [];

        for (const host of testCase.hosts) {
          const trace =
            testCase.mode === "synthetic_host_skip"
              ? createSyntheticHostSkippedBrokerTrace({
                  requestText: testCase.requestText,
                  host,
                  now: new Date(testCase.now),
                  hostDecision:
                    testCase.expect.hostDecision === "broker_first"
                      ? undefined
                      : testCase.expect.hostDecision,
                  hostAction: testCase.expect.hostAction
                })
              : await runHostRunnerEvalCase(testCase, host, {
                  "claude-code": claudeShellDirectory,
                  codex: codexShellDirectory
                });

          expect(trace).toMatchObject({
            requestText: testCase.requestText,
            host,
            ...testCase.expect
          });
          observedDecisions.add(trace.hostDecision);
          signatures.push(
            [
              trace.hostDecision,
              trace.resultCode,
              trace.hostAction ?? "",
              trace.winnerId ?? ""
            ].join("|")
          );
        }

        expect(new Set(signatures).size).toBe(1);
      }

      expect([...observedDecisions].sort()).toEqual(
        [...PHASE2_BOUNDARY_DECISIONS].sort()
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
    },
    15_000
  );
});
