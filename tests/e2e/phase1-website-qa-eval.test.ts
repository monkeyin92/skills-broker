import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSyntheticHostSkippedBrokerTrace,
  type BrokerRoutingTrace
} from "../../src/broker/trace";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { installSharedBrokerHome } from "../../src/shared-home/install";

const PHASE1_MISS_LAYERS = [
  "host_selection",
  "broker_normalization",
  "retrieval",
  "prepare"
] as const;

type EvalExpectation = {
  resultCode: BrokerRoutingTrace["resultCode"];
  missLayer: NonNullable<BrokerRoutingTrace["missLayer"]>;
};

type EvalCaseBase = {
  id: string;
  host: "codex";
  requestText: string;
  now: string;
  expect: EvalExpectation;
};

type SyntheticHostSkippedEvalCase = EvalCaseBase & {
  mode: "synthetic_host_skip";
};

type HostRunnerEvalCase = EvalCaseBase & {
  mode: "host_runner";
  invocationMode: "auto" | "explicit";
  urls?: string[];
  catalogVariant?: "default" | "empty";
  registryVariant?: "default" | "empty";
};

type PrepareFailureEvalCase = EvalCaseBase & {
  mode: "prepare_failure";
  invocationMode: "auto" | "explicit";
  urls?: string[];
};

type EvalCase =
  | SyntheticHostSkippedEvalCase
  | HostRunnerEvalCase
  | PrepareFailureEvalCase;

type EvalFixture = {
  cases: EvalCase[];
};

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadEvalFixture(): Promise<EvalCase[]> {
  const fixturePath = join(
    process.cwd(),
    "tests",
    "fixtures",
    "phase1-website-qa-eval.json"
  );
  const fixture = JSON.parse(
    await readFile(fixturePath, "utf8")
  ) as EvalFixture;

  return fixture.cases;
}

async function writeEmptyCatalog(runtimeDirectory: string): Promise<string> {
  const filePath = join(runtimeDirectory, "empty-host-skills.seed.json");

  await writeFile(
    filePath,
    `${JSON.stringify({ packages: [], skills: [] }, null, 2)}\n`,
    "utf8"
  );

  return filePath;
}

async function writeEmptyRegistry(runtimeDirectory: string): Promise<string> {
  const filePath = join(runtimeDirectory, "empty-mcp-registry.seed.json");

  await writeFile(
    filePath,
    `${JSON.stringify({ servers: [] }, null, 2)}\n`,
    "utf8"
  );

  return filePath;
}

async function runHostRunnerEvalCase(
  testCase: HostRunnerEvalCase,
  codexShellDirectory: string,
  overrides: {
    emptyCatalogPath: string;
    emptyRegistryPath: string;
  }
): Promise<BrokerRoutingTrace> {
  const result = await runCodexAdapter(
    {
      requestText: testCase.requestText,
      host: testCase.host,
      invocationMode: testCase.invocationMode,
      ...(testCase.urls === undefined ? {} : { urls: testCase.urls })
    },
    {
      installDirectory: codexShellDirectory,
      includeTrace: true,
      now: new Date(testCase.now),
      ...(testCase.catalogVariant === "empty"
        ? { hostCatalogFilePath: overrides.emptyCatalogPath }
        : {}),
      ...(testCase.registryVariant === "empty"
        ? { mcpRegistryFilePath: overrides.emptyRegistryPath }
        : {})
    }
  );

  expect(result.trace).toBeDefined();

  return result.trace;
}

async function runPrepareFailureEvalCase(
  testCase: PrepareFailureEvalCase
): Promise<BrokerRoutingTrace> {
  vi.doMock("../../src/broker/prepare", () => ({
    prepareCandidate: vi.fn(async () => {
      throw new Error("kaboom");
    })
  }));

  const { runBroker } = await import("../../src/broker/run");
  const result = await runBroker(
    {
      requestText: testCase.requestText,
      host: testCase.host,
      invocationMode: testCase.invocationMode,
      ...(testCase.urls === undefined ? {} : { urls: testCase.urls })
    },
    {
      currentHost: testCase.host,
      now: new Date(testCase.now),
      hostCatalogFilePath: join(process.cwd(), "config", "host-skills.seed.json"),
      mcpRegistryFilePath: join(process.cwd(), "config", "mcp-registry.seed.json")
    }
  );

  return result.trace;
}

describe("Phase 1 website QA eval harness", () => {
  it("attributes every maintained website QA miss to a Phase 1 routing layer", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-phase1-qa-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexShellDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const cases = await loadEvalFixture();
      const emptyCatalogPath = await writeEmptyCatalog(runtimeDirectory);
      const emptyRegistryPath = await writeEmptyRegistry(runtimeDirectory);

      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory
      });

      const observedLayers: string[] = [];

      for (const testCase of cases) {
        const trace =
          testCase.mode === "synthetic_host_skip"
            ? createSyntheticHostSkippedBrokerTrace({
                requestText: testCase.requestText,
                host: testCase.host,
                now: new Date(testCase.now)
              })
            : testCase.mode === "host_runner"
              ? await runHostRunnerEvalCase(
                  testCase,
                  codexShellDirectory,
                  {
                    emptyCatalogPath,
                    emptyRegistryPath
                  }
                )
              : await runPrepareFailureEvalCase(testCase);

        expect(trace).toMatchObject({
          requestText: testCase.requestText,
          host: testCase.host,
          resultCode: testCase.expect.resultCode,
          missLayer: testCase.expect.missLayer
        });
        observedLayers.push(trace.missLayer ?? "unknown");
      }

      expect(observedLayers.sort()).toEqual([...PHASE1_MISS_LAYERS].sort());
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
