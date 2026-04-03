import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS,
  brokerFirstGateArtifactPath,
  evaluateBrokerFirstGate,
  materializeBrokerFirstGateArtifact,
  type BrokerFirstGateArtifact
} from "../../src/shared-home/broker-first-gate";
import {
  installSharedBrokerHome,
  resolveSharedBrokerHomeLayout
} from "../../src/shared-home/install";
import { loadMaintainedBrokerFirstContract } from "../../src/core/maintained-broker-first";

async function writeGateArtifact(
  brokerHomeDirectory: string,
  generatedAt: string,
  mutate?: (artifact: BrokerFirstGateArtifact) => BrokerFirstGateArtifact
): Promise<void> {
  const layout = resolveSharedBrokerHomeLayout(brokerHomeDirectory);
  const contract = await loadMaintainedBrokerFirstContract(
    layout.maintainedFamiliesPath
  );
  const artifactPath = brokerFirstGateArtifactPath(brokerHomeDirectory);
  const artifact = mutate?.({
    schemaVersion: 1,
    artifactPath,
    generatedAt,
    maintainedFamilies: contract.maintainedFamilies.map((family) => ({
      family: family.family,
      winnerId: family.winnerId,
      capabilityId: family.capabilityId,
      status: "green",
      proofs: {
        phase2Boundary: "pass",
        phase3Eval: "pass",
        peerConflict: "pass"
      },
      issues: []
    })),
    issues: []
  }) ?? {
    schemaVersion: 1,
    artifactPath,
    generatedAt,
    maintainedFamilies: contract.maintainedFamilies.map((family) => ({
      family: family.family,
      winnerId: family.winnerId,
      capabilityId: family.capabilityId,
      status: "green",
      proofs: {
        phase2Boundary: "pass",
        phase3Eval: "pass",
        peerConflict: "pass"
      },
      issues: []
    })),
    issues: []
  };

  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8"
  );
}

describe("broker-first gate", () => {
  it("fails closed when the gate artifact is missing under an installed shared home", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-gate-missing-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });

      const result = await evaluateBrokerFirstGate({
        brokerHomeDirectory,
        now: new Date("2026-04-03T12:00:00.000Z")
      });

      expect(result.skipped).toBe(false);
      expect(result.hasStrictIssues).toBe(true);
      expect(result.maintainedFamilies).toEqual([]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_GATE_MISSING"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("refreshes the gate artifact from the maintained contract when requested", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-gate-refresh-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeGateArtifact(
        brokerHomeDirectory,
        "2026-04-03T11:00:00.000Z"
      );

      const result = await evaluateBrokerFirstGate({
        brokerHomeDirectory,
        refresh: true,
        now: new Date("2026-04-03T12:00:00.000Z")
      });

      expect(result.skipped).toBe(false);
      expect(result.hasStrictIssues).toBe(false);
      expect(result.freshness.state).toBe("fresh");
      expect(result.issues).toEqual([]);
      expect(result.maintainedFamilies.map((family) => family.family)).toEqual([
        "requirements_analysis",
        "quality_assurance",
        "investigation"
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("materializes a fresh passing gate artifact from the maintained contract", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-gate-materialize-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });

      const artifact = await materializeBrokerFirstGateArtifact({
        brokerHomeDirectory,
        now: new Date("2026-04-03T12:00:00.000Z")
      });
      const result = await evaluateBrokerFirstGate({
        brokerHomeDirectory,
        now: new Date("2026-04-03T12:30:00.000Z")
      });

      expect(artifact.issues).toEqual([]);
      expect(
        artifact.maintainedFamilies.every(
          (family) =>
            family.status === "green" &&
            family.proofs.phase2Boundary === "pass" &&
            family.proofs.phase3Eval === "pass" &&
            family.proofs.peerConflict === "pass"
        )
      ).toBe(true);
      expect(result.hasStrictIssues).toBe(false);
      expect(result.freshness.state).toBe("fresh");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reads a fresh contract-aligned gate artifact without strict issues", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-gate-fresh-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeGateArtifact(
        brokerHomeDirectory,
        "2026-04-03T11:00:00.000Z"
      );

      const result = await evaluateBrokerFirstGate({
        brokerHomeDirectory,
        now: new Date("2026-04-03T12:00:00.000Z")
      });

      expect(result.skipped).toBe(false);
      expect(result.hasStrictIssues).toBe(false);
      expect(result.freshness.state).toBe("fresh");
      expect(result.issues).toEqual([]);
      expect(result.maintainedFamilies.map((family) => family.family)).toEqual([
        "requirements_analysis",
        "quality_assurance",
        "investigation"
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("marks stale artifacts red while preserving family rows for diagnostics", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-gate-stale-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      const staleGeneratedAt = new Date(
        new Date("2026-04-03T12:00:00.000Z").getTime() -
          BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS -
          60 * 60 * 1000
      ).toISOString();
      await writeGateArtifact(brokerHomeDirectory, staleGeneratedAt);

      const result = await evaluateBrokerFirstGate({
        brokerHomeDirectory,
        now: new Date("2026-04-03T12:00:00.000Z")
      });

      expect(result.freshness.state).toBe("stale");
      expect(result.hasStrictIssues).toBe(true);
      expect(result.maintainedFamilies).toEqual([]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_GATE_STALE"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed when the artifact family set drifts from the maintained contract", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-gate-drift-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeGateArtifact(
        brokerHomeDirectory,
        "2026-04-03T11:00:00.000Z",
        (artifact) => ({
          ...artifact,
          maintainedFamilies: artifact.maintainedFamilies.slice(0, 2)
        })
      );

      const result = await evaluateBrokerFirstGate({
        brokerHomeDirectory,
        now: new Date("2026-04-03T12:00:00.000Z")
      });

      expect(result.hasStrictIssues).toBe(true);
      expect(result.maintainedFamilies).toEqual([]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "BROKER_FIRST_GATE_CONTRACT_MISMATCH"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
