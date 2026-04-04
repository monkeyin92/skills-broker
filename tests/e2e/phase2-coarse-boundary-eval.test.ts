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
import {
  loadMaintainedBrokerFirstContract,
  type MaintainedBrokerFirstContract
} from "../../src/core/maintained-broker-first";
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

const [cases, contract] = await Promise.all([
  loadEvalFixture(),
  loadMaintainedBrokerFirstContract()
]);

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

function maintainedBrokerFirstFamilies(contract: MaintainedBrokerFirstContract): string[] {
  return contract.maintainedFamilies.map((entry) => entry.family);
}

function maintainedBrokerFirstWinnerIds(
  contract: MaintainedBrokerFirstContract
): string[] {
  return contract.maintainedFamilies.map((entry) => entry.winnerId);
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
        const observedMaintainedWinners = new Map<string, Set<string>>();

        for (const family of maintainedBrokerFirstFamilies(contract)) {
          observedMaintainedWinners.set(family, new Set<string>());
        }

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

            if (
              testCase.mode === "host_runner" &&
              trace.hostDecision === "broker_first" &&
              trace.winnerId !== null
            ) {
              for (const family of contract.maintainedFamilies) {
                if (family.winnerId === trace.winnerId) {
                  observedMaintainedWinners.get(family.family)?.add(host);
                }
              }
            }
          }

          expect(new Set(signatures).size).toBe(1);
        }

        expect([...observedDecisions].sort()).toEqual(
          [...PHASE2_BOUNDARY_DECISIONS].sort()
        );

        expect(maintainedBrokerFirstWinnerIds(contract)).toEqual(
          expect.arrayContaining(["requirements-analysis", "website-qa", "investigation"])
        );
        expect(maintainedBrokerFirstFamilies(contract)).toEqual(
          expect.arrayContaining([
            "requirements_analysis",
            "quality_assurance",
            "investigation"
          ])
        );

        for (const family of contract.maintainedFamilies) {
          const hosts = observedMaintainedWinners.get(family.family);

          expect(hosts, `missing coverage for maintained family ${family.family}`).toBeDefined();
          expect(hosts?.size).toBeGreaterThan(0);
          expect(hosts?.has("claude-code")).toBe(true);
          expect(hosts?.has("codex")).toBe(true);
        }
      } finally {
        await rm(runtimeDirectory, { recursive: true, force: true });
      }
    },
    60_000
  );
});
