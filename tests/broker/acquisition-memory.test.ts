import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AcquisitionMemoryStore,
  acquisitionMemoryFilePath
} from "../../src/broker/acquisition-memory";
import { toCapabilityCard } from "../../src/core/capability-card";

function capabilityCard(id: string) {
  return toCapabilityCard({
    id,
    kind: "skill",
    label: "Requirements Analysis",
    intent: "capability_discovery_or_install",
    package: {
      packageId: "gstack",
      label: "gstack",
      installState: "installed",
      acquisition: "local_skill_bundle"
    },
    leaf: {
      capabilityId: "gstack.office-hours",
      packageId: "gstack",
      subskillId: "office-hours"
    },
    query: {
      jobFamilies: ["requirements_analysis"],
      targetTypes: ["problem_statement", "text"],
      artifacts: ["design_doc"],
      examples: ["帮我分析这个需求"]
    },
    implementation: {
      id: "gstack.office_hours",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    }
  });
}

let runtimeDirectory: string | undefined;

afterEach(async () => {
  if (runtimeDirectory !== undefined) {
    await rm(runtimeDirectory, { recursive: true, force: true });
    runtimeDirectory = undefined;
  }
});

describe("AcquisitionMemoryStore", () => {
  it("fails open when the file is missing, corrupt, or on an old schema", async () => {
    runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-acq-memory-"));
    const filePath = acquisitionMemoryFilePath(join(runtimeDirectory, ".skills-broker"));
    const store = new AcquisitionMemoryStore(filePath);
    await mkdir(dirname(filePath), { recursive: true });

    await expect(store.read()).resolves.toEqual({
      version: "2026-04-16",
      entries: []
    });

    await writeFile(filePath, "{not json", "utf8");
    await expect(store.read()).resolves.toEqual({
      version: "2026-04-16",
      entries: []
    });

    await writeFile(
      filePath,
      JSON.stringify({
        version: "2026-04-01",
        entries: []
      }),
      "utf8"
    );
    await expect(store.read()).resolves.toEqual({
      version: "2026-04-16",
      entries: []
    });
  });

  it("derives acquisition outcome summaries for older memory entries", async () => {
    runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-acq-memory-"));
    const filePath = acquisitionMemoryFilePath(join(runtimeDirectory, ".skills-broker"));
    const store = new AcquisitionMemoryStore(filePath);
    await mkdir(dirname(filePath), { recursive: true });

    await writeFile(
      filePath,
      JSON.stringify({
        version: "2026-04-16",
        entries: [
          {
            canonicalKey: "query:v2|families:requirements_analysis",
            compatibilityIntent: "capability_discovery_or_install",
            candidateId: "requirements-analysis",
            packageId: "gstack",
            leafCapabilityId: "gstack.office-hours",
            successfulRoutes: 2,
            installedAt: "2026-04-16T03:00:00.000Z",
            verifiedAt: "2026-04-16T04:00:00.000Z",
            firstReuseAt: "2026-04-16T04:00:00.000Z",
            verifiedHosts: ["codex", "claude-code"],
            provenance: "package_probe",
            winnerSnapshot: capabilityCard("requirements-analysis")
          }
        ]
      }),
      "utf8"
    );

    await expect(store.read()).resolves.toMatchObject({
      entries: [
        {
          outcomes: {
            firstInstallAt: "2026-04-16T03:00:00.000Z",
            verificationSuccesses: 2,
            repeatUsages: 1,
            crossHostReuses: 1,
            degradedAcquisitions: 0,
            failedAcquisitions: 0
          }
        }
      ]
    });
  });

  it("records verified winners and matches future candidates by package and leaf identity", async () => {
    runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-acq-memory-"));
    const filePath = acquisitionMemoryFilePath(join(runtimeDirectory, ".skills-broker"));
    const store = new AcquisitionMemoryStore(filePath);
    const firstWinner = capabilityCard("requirements-analysis");
    const secondWinner = capabilityCard("requirements-analysis-v2");

    await store.recordVerifiedWinner({
      canonicalKey: "query:v2|families:requirements_analysis",
      compatibilityIntent: "capability_discovery_or_install",
      winner: firstWinner,
      currentHost: "codex",
      now: new Date("2026-04-16T03:00:00.000Z")
    });
    await store.recordVerifiedWinner({
      canonicalKey: "query:v2|families:requirements_analysis",
      compatibilityIntent: "capability_discovery_or_install",
      winner: secondWinner,
      currentHost: "claude-code",
      now: new Date("2026-04-16T04:00:00.000Z")
    });

    await expect(store.read()).resolves.toMatchObject({
      version: "2026-04-16",
      entries: [
        {
          canonicalKey: "query:v2|families:requirements_analysis",
          candidateId: "requirements-analysis-v2",
          packageId: "gstack",
          leafCapabilityId: "gstack.office-hours",
          successfulRoutes: 2,
          firstReuseAt: "2026-04-16T04:00:00.000Z",
          verifiedHosts: ["codex", "claude-code"],
          outcomes: {
            firstInstallAt: "2026-04-16T03:00:00.000Z",
            verificationSuccesses: 2,
            repeatUsages: 1,
            crossHostReuses: 1,
            degradedAcquisitions: 0,
            failedAcquisitions: 0
          }
        }
      ]
    });

    await expect(
      store.historyByCandidateId("query:v2|families:requirements_analysis", [
        secondWinner
      ])
    ).resolves.toEqual({
      "requirements-analysis-v2": {
        successfulRoutes: 2
      }
    });
  });

  it("replays stored winners as advisory discovery candidates", async () => {
    runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-acq-memory-"));
    const filePath = acquisitionMemoryFilePath(join(runtimeDirectory, ".skills-broker"));
    const store = new AcquisitionMemoryStore(filePath);
    const winner = capabilityCard("remembered-analysis");

    await store.recordVerifiedWinner({
      canonicalKey: "query:v2|families:requirements_analysis",
      compatibilityIntent: "capability_discovery_or_install",
      winner,
      currentHost: "claude-code",
      now: new Date("2026-04-16T05:00:00.000Z")
    });

    await expect(
      store.replayCandidates("query:v2|families:requirements_analysis")
    ).resolves.toEqual([
      expect.objectContaining({
        id: "remembered-analysis",
        package: expect.objectContaining({
          packageId: "gstack",
          installState: "available"
        }),
        prepare: expect.objectContaining({
          installRequired: true
        }),
        sourceMetadata: expect.objectContaining({
          discoverySource: "acquisition_memory",
          acquisitionMemoryCanonicalKey: "query:v2|families:requirements_analysis"
        })
      })
    ]);
  });
});
