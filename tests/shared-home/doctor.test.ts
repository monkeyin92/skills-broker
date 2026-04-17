import { chmod, mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquisitionMemoryFilePath } from "../../src/broker/acquisition-memory";
import { routingTraceLogFilePath } from "../../src/broker/trace-store";
import { loadMaintainedBrokerFirstContract } from "../../src/core/maintained-broker-first";
import {
  brokerFirstGateArtifactPath,
  type BrokerFirstGateArtifact
} from "../../src/shared-home/broker-first-gate";
import { formatLifecycleResult } from "../../src/shared-home/format";
import { doctorSharedBrokerHome } from "../../src/shared-home/doctor";
import {
  installSharedBrokerHome,
  resolveSharedBrokerHomeLayout
} from "../../src/shared-home/install";
import { writeManagedShellManifest } from "../../src/shared-home/ownership";
import { commitAll, initGitRepo } from "../helpers/git";

function renderStatusBoard(status: string): string {
  return `# STATUS

<!-- skills-broker-status:start -->
\`\`\`json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "status-board-proof-rails",
      "title": "Status board proof rails",
      "status": "${status}",
      "proofs": [
        {
          "type": "file",
          "path": "README.md"
        }
      ]
    }
  ]
}
\`\`\`
<!-- skills-broker-status:end -->
`;
}

async function writeFreshGateArtifact(
  brokerHomeDirectory: string,
  generatedAt = new Date().toISOString()
): Promise<void> {
  const layout = resolveSharedBrokerHomeLayout(brokerHomeDirectory);
  const contract = await loadMaintainedBrokerFirstContract(
    layout.maintainedFamiliesPath
  );
  const artifactPath = brokerFirstGateArtifactPath(brokerHomeDirectory);
  const artifact: BrokerFirstGateArtifact = {
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

async function writeAcquisitionMemoryFixture(
  brokerHomeDirectory: string
): Promise<void> {
  const filePath = acquisitionMemoryFilePath(brokerHomeDirectory);
  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        version: "2026-04-16",
        entries: [
          {
            canonicalKey: "query:v2|families:requirements_analysis",
            compatibilityIntent: "capability_discovery_or_install",
            candidateId: "gstack.office-hours",
            packageId: "gstack",
            leafCapabilityId: "gstack.office-hours",
            successfulRoutes: 2,
            installedAt: "2026-04-16T03:00:00.000Z",
            verifiedAt: "2026-04-16T04:00:00.000Z",
            firstReuseAt: "2026-04-16T04:00:00.000Z",
            verifiedHosts: ["codex", "claude-code"],
            provenance: "package_probe"
          },
          {
            canonicalKey: "query:v2|families:quality_assurance",
            compatibilityIntent: "capability_discovery_or_install",
            candidateId: "gstack.qa",
            packageId: "gstack",
            leafCapabilityId: "gstack.qa",
            successfulRoutes: 1,
            installedAt: "2026-04-16T05:00:00.000Z",
            verifiedAt: "2026-04-16T05:00:00.000Z",
            verifiedHosts: ["codex"],
            provenance: "package_probe"
          }
        ]
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function writeVerifiedDownstreamManifestFixture(
  brokerHomeDirectory: string
): Promise<void> {
  const claudeSkillDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "claude-code",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-office-hours"
  );
  const codexSkillDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "codex",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-qa"
  );

  await mkdir(claudeSkillDirectory, { recursive: true });
  await mkdir(codexSkillDirectory, { recursive: true });
  await writeFile(
    join(claudeSkillDirectory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: "2026-04-16T04:00:00.000Z",
        skillName: "office-hours",
        verifiedCandidate: {
          id: "remembered-analysis",
          kind: "skill",
          label: "Remembered Analysis",
          intent: "capability_discovery_or_install",
          package: {
            packageId: "gstack",
            installState: "installed"
          },
          leaf: {
            capabilityId: "gstack.office-hours",
            packageId: "gstack",
            subskillId: "office-hours"
          },
          implementation: {
            id: "gstack.office_hours",
            type: "local_skill",
            ownerSurface: "broker_owned_downstream"
          },
          sourceMetadata: {
            skillName: "office-hours"
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    join(codexSkillDirectory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: "2026-04-16T05:00:00.000Z",
        skillName: "qa",
        verifiedCandidate: {
          id: "remembered-qa",
          kind: "skill",
          label: "Remembered QA",
          intent: "capability_discovery_or_install",
          package: {
            packageId: "gstack",
            installState: "installed"
          },
          leaf: {
            capabilityId: "gstack.qa",
            packageId: "gstack",
            subskillId: "qa"
          },
          implementation: {
            id: "gstack.qa",
            type: "local_skill",
            ownerSurface: "broker_owned_downstream"
          },
          sourceMetadata: {
            skillName: "qa"
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function writeWebsiteQaInstallRequiredTraceFixture(
  brokerHomeDirectory: string
): Promise<void> {
  const traceFilePath = routingTraceLogFilePath(brokerHomeDirectory);
  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    traceFilePath,
    `${JSON.stringify({
      traceVersion: "2026-03-31",
      requestText: "QA this website https://example.com",
      host: "codex",
      hostDecision: "broker_first",
      resultCode: "INSTALL_REQUIRED",
      routingOutcome: "fallback",
      missLayer: "retrieval",
      normalizedBy: "structured_query",
      requestSurface: "structured_query",
      requestContract: "query_native",
      selectionMode: "explicit",
      hostAction: null,
      candidateCount: 1,
      winnerId: "website-qa",
      winnerPackageId: "gstack",
      selectedCapabilityId: "gstack.qa",
      selectedLeafCapabilityId: "qa",
      selectedImplementationId: "gstack.qa",
      selectedPackageInstallState: "available",
      workflowId: null,
      runId: null,
      stageId: null,
      reasonCode: null,
      timestamp: "2026-04-16T05:00:00.000Z"
    })}\n`,
    "utf8"
  );
}

describe("doctor shared broker home", () => {
  it("explains why codex was not detected", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-missing-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const missingCodexDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory: missingCodexDirectory
      });

      expect(result.command).toBe("doctor");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false,
        missingPaths: expect.arrayContaining([
          join(brokerHomeDirectory, "package.json")
        ])
      });
      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("missing")
        })
      );
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "not_detected",
        reason: expect.stringContaining("--claude-dir")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("reports a host as not writable when the target directory cannot be created", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-readonly-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const parentDirectory = join(runtimeDirectory, "readonly");
    const codexInstallDirectory = join(parentDirectory, "child");

    try {
      await mkdir(parentDirectory, { recursive: true });
      await chmod(parentDirectory, 0o555);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_writable"
        })
      );
      expect(result.hosts[1]?.reason ?? "").toMatch(/not writable|permission/i);
    } finally {
      await chmod(parentDirectory, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("keeps an existing managed host detected even when the install directory is read-only", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-managed-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await chmod(codexInstallDirectory, 0o555);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "detected",
        reason: "managed by skills-broker"
      });
    } finally {
      await chmod(codexInstallDirectory, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("formats doctor results as JSON", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-json-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });

      const rendered = formatLifecycleResult(result, "json");
      const parsed = JSON.parse(rendered) as typeof result;

      expect(parsed.command).toBe("doctor");
      expect(parsed.adoptionHealth.status).toBe("inactive");
      expect(parsed.sharedHome.exists).toBe(false);
      expect(parsed.status.skipped).toBe(true);
      expect(parsed.status.issues).toEqual([]);
      expect(parsed.hosts).toEqual([
        {
          name: "claude-code",
          status: "not_detected",
          reason: expect.stringContaining("--claude-dir")
        },
        {
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("--codex-dir")
        }
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("blocks adoption health when a managed host shell remains but the shared home is missing", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-missing-shared-home-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false,
        missingPaths: expect.arrayContaining([
          join(brokerHomeDirectory, "package.json")
        ])
      });
      expect(result.adoptionHealth).toEqual({
        status: "blocked",
        managedHosts: ["codex"],
        reasons: [
          {
            code: "SHARED_HOME_MISSING",
            message:
              expect.stringContaining(
                "shared-home: managed host shells exist but the shared broker home is missing"
              )
          }
        ]
      });
      expect(formatLifecycleResult(result, "text")).toContain(
        "Adoption health: blocked (SHARED_HOME_MISSING)"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("treats a partially installed shared home as missing install truth", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-incomplete-shared-home-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const sharedHomeLayout = await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await rm(sharedHomeLayout.maintainedFamiliesPath, { force: true });
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.sharedHome.exists).toBe(false);
      expect(result.sharedHome.missingPaths).toEqual(
        expect.arrayContaining([sharedHomeLayout.maintainedFamiliesPath])
      );
      expect(result.adoptionHealth.status).toBe("blocked");
      expect(rendered).toContain(
        "Shared home exists: no (missing config/maintained-broker-first-families.json)"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("includes a first-class status object in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-json-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const claudeCodeInstallDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexInstallDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add repo status board");
      const repoRealPath = await realpath(repoDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory
      });

      expect(result.status.repoTarget).toBe(repoRealPath);
      expect(result.brokerFirstGate.hasStrictIssues).toBe(false);
      expect(result.brokerFirstGate.maintainedFamilies).toHaveLength(3);
      expect(result.status.items).toContainEqual(
        expect.objectContaining({
          id: "status-board-proof-rails",
          declaredStatus: "in_progress",
          evaluatedStatus: "in_progress"
        })
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.status.boardPath).toBe(join(repoRealPath, "STATUS.md"));
      expect(parsed.brokerFirstGate.maintainedFamilies).toHaveLength(3);
      expect(parsed.status.items).toHaveLength(1);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("reports acquisition memory reuse metrics in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-acq-memory-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeAcquisitionMemoryFixture(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.acquisitionMemory).toEqual({
        path: acquisitionMemoryFilePath(brokerHomeDirectory),
        exists: true,
        state: "present",
        entries: 2,
        successfulRoutes: 3,
        firstReuseRecorded: 1,
        crossHostReuse: 1,
        qualityAssuranceSuccessfulRoutes: 1,
        qualityAssuranceFirstReuseRecorded: 0
      });
      expect(rendered).toContain(
        "Acquisition memory: present, entries=2, successful_routes=3, first_reuse_after_install=1, cross_host_reuse=1, website_qa_successful_reruns=1, website_qa_first_reuse=0"
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.acquisitionMemory).toEqual({
        path: acquisitionMemoryFilePath(brokerHomeDirectory),
        exists: true,
        state: "present",
        entries: 2,
        successfulRoutes: 3,
        firstReuseRecorded: 1,
        crossHostReuse: 1,
        qualityAssuranceSuccessfulRoutes: 1,
        qualityAssuranceFirstReuseRecorded: 0
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports verified downstream manifests in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-downstream-manifests-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeVerifiedDownstreamManifestFixture(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.verifiedDownstreamManifests).toEqual({
        rootPath: join(brokerHomeDirectory, "downstream"),
        state: "present",
        manifests: 2,
        qualityAssuranceManifests: 1,
        hosts: [
          {
            name: "claude-code",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 0
          },
          {
            name: "codex",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 1
          }
        ]
      });
      expect(rendered).toContain(
        "Verified downstream manifests: present, total=2, website_qa=1, claude-code=1, codex=1"
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.verifiedDownstreamManifests).toEqual({
        rootPath: join(brokerHomeDirectory, "downstream"),
        state: "present",
        manifests: 2,
        qualityAssuranceManifests: 1,
        hosts: [
          {
            name: "claude-code",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 0
          },
          {
            name: "codex",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 1
          }
        ]
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("renders the website QA install_required -> rerun -> reuse loop explicitly", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-qa-loop-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeWebsiteQaInstallRequiredTraceFixture(brokerHomeDirectory);
      await writeAcquisitionMemoryFixture(brokerHomeDirectory);
      await writeVerifiedDownstreamManifestFixture(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.websiteQaLoop).toEqual({
        installRequiredTraces: 1,
        rerunSuccessfulRoutes: 1,
        reuseRecorded: 0,
        downstreamReplayManifests: 1,
        acquisitionMemoryState: "present",
        verifiedDownstreamState: "present",
        verdict: "in_progress",
        phase: "cross_host_reuse_pending",
        proofs: {
          installRequiredObserved: true,
          verifyConfirmed: true,
          crossHostReuseConfirmed: false,
          replayReady: true
        },
        verifyState: "confirmed",
        crossHostReuseState: "pending",
        nextAction:
          "Repeat the same website QA request from another host to record the first proven reuse."
      });
      expect(rendered).toContain(
        "Website QA loop: install_required=observed (1 install_required trace); rerun=confirmed (1 successful rerun); reuse=pending (no website QA reuse recorded yet); replay=ready (1 verified downstream manifest)"
      );
      expect(rendered).toContain(
        "Website QA verify proof: confirmed (successful rerun evidence recorded)"
      );
      expect(rendered).toContain(
        "Website QA cross-host reuse proof: pending (first reuse across hosts not recorded yet)"
      );
      expect(rendered).toContain(
        "Website QA next action: Repeat the same website QA request from another host to record the first proven reuse."
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports green adoption health when a managed host and repo truth are both clean", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-adoption-green-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const codexInstallDirectory = join(
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
      await writeFreshGateArtifact(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add clean status board");
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        codexInstallDirectory
      });

      expect(result.adoptionHealth).toEqual({
        status: "green",
        managedHosts: ["codex"],
        reasons: []
      });
      expect(formatLifecycleResult(result, "text")).toContain("Adoption health: green");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("blocks adoption health when website QA proof rails are unreadable", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-proof-rails-unreadable-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const acquisitionMemoryPath = acquisitionMemoryFilePath(brokerHomeDirectory);
    const downstreamRoot = join(brokerHomeDirectory, "downstream");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await writeAcquisitionMemoryFixture(brokerHomeDirectory);
      await writeVerifiedDownstreamManifestFixture(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add clean status board");
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await chmod(acquisitionMemoryPath, 0o000);
      await chmod(downstreamRoot, 0o000);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        codexInstallDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.websiteQaLoop.verdict).toBe("blocked");
      expect(result.websiteQaLoop.phase).toBe("proof_unreadable");
      expect(result.websiteQaLoop.proofs).toEqual({
        installRequiredObserved: false,
        verifyConfirmed: false,
        crossHostReuseConfirmed: false,
        replayReady: false
      });
      expect(result.adoptionHealth.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "ACQUISITION_MEMORY_UNREADABLE",
            message: expect.stringContaining(
              "website QA verify proof is unreadable"
            )
          }),
          expect.objectContaining({
            code: "VERIFIED_DOWNSTREAM_MANIFESTS_UNREADABLE",
            message: expect.stringContaining(
              "website QA replay/reuse proof is unreadable"
            )
          })
        ])
      );
      expect(rendered).toContain(
        "Website QA loop: install_required=pending (no website QA install_required trace recorded yet); rerun=unknown (acquisition memory unreadable); reuse=unknown (acquisition memory unreadable); replay=unknown (verified downstream manifests unreadable)"
      );
      expect(rendered).toContain(
        "Website QA verify proof: unknown (acquisition memory unreadable)"
      );
      expect(rendered).toContain(
        "Website QA cross-host reuse proof: unknown (acquisition memory unreadable)"
      );
      expect(rendered).toContain(
        "Website QA next action: Trigger one website QA request until the broker returns INSTALL_REQUIRED."
      );
    } finally {
      await chmod(acquisitionMemoryPath, 0o644).catch(() => undefined);
      await chmod(downstreamRoot, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("renders all maintained broker-first proofs in doctor text output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-gate-proofs-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(rendered).toContain(
        "proofs=phase2Boundary:pass, phase3Eval:pass, peerConflict:pass"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("renders broker-first gate issues in doctor text output without duplicating them into warnings", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-gate-text-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.warnings).not.toContain(
        expect.stringContaining("BROKER_FIRST_GATE_MISSING")
      );
      expect(rendered).toContain("Broker-first gate:");
      expect(rendered).toContain(
        "Broker-first gate issue BROKER_FIRST_GATE_MISSING"
      );
      expect(rendered).not.toContain("Warning: BROKER_FIRST_GATE_MISSING");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("skips repo-scoped status checks when doctor runs outside a git repo", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-skip-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.status.skipped).toBe(true);
      expect(result.status.issues).toEqual([]);
      expect(rendered).toContain("Status board: skipped");
      expect(rendered).toContain("Status issues: none");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("renders status issues in doctor text output without duplicating them into warnings", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-text-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const claudeCodeInstallDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexInstallDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("shipped_remote"), "utf8");
      await commitAll(repoDirectory, "add mismatched status board");

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.warnings).not.toContain(
        expect.stringContaining("STATUS_SHIP_REF_UNRESOLVED")
      );
      expect(rendered).toContain("Status board:");
      expect(rendered).toContain("Status status-board-proof-rails: declared=shipped_remote, evaluated=shipped_remote");
      expect(rendered).toContain("Status issue STATUS_SHIP_REF_UNRESOLVED");
      expect(rendered).not.toContain("Warning: STATUS_SHIP_REF_UNRESOLVED");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("includes structured remediation when competing peer skills are detected", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-remediation-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
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
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await mkdir(
        join(runtimeDirectory, ".agents", "skills", "baoyu-danger-x-to-markdown"),
        { recursive: true }
      );
      await writeFile(
        join(codexInstallDirectory, ".skills-broker.json"),
        JSON.stringify({
          managedBy: "skills-broker",
          host: "codex",
          version: "test-version",
          brokerHome: brokerHomeDirectory
        }),
        "utf8"
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });

      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "detected",
        reason: "managed by skills-broker",
        competingPeerSkills: ["baoyu-danger-x-to-markdown"],
        remediation: {
          action: "hide_competing_peer_skills",
          targetDirectory: join(
            brokerHomeDirectory,
            "downstream",
            "codex",
            "skills"
          ),
          peerSkills: ["baoyu-danger-x-to-markdown"],
          message: expect.stringContaining("Hide competing peer skills behind skills-broker")
        }
      });
      expect(formatLifecycleResult(result, "text")).toContain("HOST_COMPETING_PEERS");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("summarizes recent routing hit, misroute, and fallback rates from persisted traces", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-traces-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const traceFilePath = join(brokerHomeDirectory, "state", "routing-traces.jsonl");

    try {
      await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
      await writeFile(
        traceFilePath,
        [
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "structured hit",
            host: "codex",
            hostDecision: "broker_first",
            resultCode: "HANDOFF_READY",
            routingOutcome: "hit",
            missLayer: null,
            normalizedBy: "structured_query",
            requestSurface: "structured_query",
            requestContract: "query_native",
            selectionMode: "explicit",
            hostAction: null,
            candidateCount: 1,
            winnerId: "requirements-analysis",
            winnerPackageId: "gstack",
            selectedCapabilityId: "gstack.office-hours",
            selectedLeafCapabilityId: "office-hours",
            selectedImplementationId: "gstack.office_hours",
            selectedPackageInstallState: "installed",
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:00:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "raw miss",
            host: "codex",
            hostDecision: "broker_first",
            resultCode: "UNSUPPORTED_REQUEST",
            routingOutcome: "misroute",
            missLayer: "broker_normalization",
            normalizedBy: "raw_request_fallback",
            requestSurface: "raw_envelope",
            requestContract: "raw_envelope_fallback",
            selectionMode: null,
            hostAction: "continue_normally",
            candidateCount: 0,
            winnerId: null,
            winnerPackageId: null,
            selectedCapabilityId: null,
            selectedLeafCapabilityId: null,
            selectedImplementationId: null,
            selectedPackageInstallState: null,
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:05:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "legacy fallback",
            host: "claude-code",
            hostDecision: "broker_first",
            resultCode: "NO_CANDIDATE",
            routingOutcome: "fallback",
            missLayer: "retrieval",
            normalizedBy: "legacy_intent",
            requestSurface: "legacy_task",
            requestContract: "query_native_via_legacy_compat",
            selectionMode: null,
            hostAction: "offer_capability_discovery",
            candidateCount: 0,
            winnerId: null,
            winnerPackageId: null,
            selectedCapabilityId: null,
            selectedLeafCapabilityId: null,
            selectedImplementationId: null,
            selectedPackageInstallState: null,
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:10:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "install required",
            host: "codex",
            hostDecision: "broker_first",
            resultCode: "INSTALL_REQUIRED",
            routingOutcome: "fallback",
            missLayer: "retrieval",
            normalizedBy: "structured_query",
            requestSurface: "structured_query",
            requestContract: "query_native",
            selectionMode: "explicit",
            hostAction: "offer_package_install",
            candidateCount: 2,
            winnerId: "website-qa",
            winnerPackageId: "io.example/website-qa",
            selectedCapabilityId: "io.example/website-qa",
            selectedLeafCapabilityId: "website-qa",
            selectedImplementationId: "io.example/website-qa",
            selectedPackageInstallState: "available",
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: "package_not_installed",
            timestamp: "2026-03-31T11:15:00.000Z"
          })
        ].join("\n"),
        "utf8"
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        now: new Date("2026-04-01T12:00:00.000Z"),
        cwd: runtimeDirectory
      });

      expect(result.routingMetrics).toEqual({
        windowDays: 7,
        observed: 4,
        syntheticHostSkips: 0,
        acquisition: {
          trueNoCandidate: 1,
          installRequired: 1
        },
        contracts: [
          {
            requestContract: "query_native",
            observed: 2,
            hits: 1,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0.5,
            misrouteRate: 0,
            fallbackRate: 0.5
          },
          {
            requestContract: "query_native_via_legacy_compat",
            observed: 1,
            hits: 0,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0,
            misrouteRate: 0,
            fallbackRate: 1
          },
          {
            requestContract: "raw_envelope_fallback",
            observed: 1,
            hits: 0,
            misroutes: 1,
            fallbacks: 0,
            hitRate: 0,
            misrouteRate: 1,
            fallbackRate: 0
          }
        ],
        surfaces: [
          {
            requestSurface: "structured_query",
            normalizedBy: "structured_query",
            observed: 2,
            hits: 1,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0.5,
            misrouteRate: 0,
            fallbackRate: 0.5
          },
          {
            requestSurface: "raw_envelope",
            normalizedBy: "raw_request_fallback",
            observed: 1,
            hits: 0,
            misroutes: 1,
            fallbacks: 0,
            hitRate: 0,
            misrouteRate: 1,
            fallbackRate: 0
          },
          {
            requestSurface: "legacy_task",
            normalizedBy: "legacy_intent",
            observed: 1,
            hits: 0,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0,
            misrouteRate: 0,
            fallbackRate: 1
          }
        ]
      });

      expect(formatLifecycleResult(result, "text")).toContain(
        "Routing contract query_native: observed=2, hit=0.50, misroute=0.00, fallback=0.50"
      );
      expect(formatLifecycleResult(result, "text")).toContain(
        "Routing structured_query: observed=2, hit=0.50, misroute=0.00, fallback=0.50"
      );
      expect(formatLifecycleResult(result, "text")).toContain(
        "Acquisition routing: true_no_candidate=1, install_required=1"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);
});
