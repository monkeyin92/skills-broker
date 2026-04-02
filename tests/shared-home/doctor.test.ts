import { chmod, mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatLifecycleResult } from "../../src/shared-home/format";
import { doctorSharedBrokerHome } from "../../src/shared-home/doctor";
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
        exists: false
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
  });

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
  });

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
        version: "0.1.9",
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

  it("includes a first-class status object in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-json-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const claudeCodeInstallDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexInstallDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
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
      expect(result.status.items).toContainEqual(
        expect.objectContaining({
          id: "status-board-proof-rails",
          declaredStatus: "in_progress",
          evaluatedStatus: "in_progress"
        })
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.status.boardPath).toBe(join(repoRealPath, "STATUS.md"));
      expect(parsed.status.items).toHaveLength(1);
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
  });

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
          version: "0.1.9",
          brokerHome: brokerHomeDirectory
        }),
        "utf8"
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory
      });

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
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

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
            hostAction: null,
            candidateCount: 1,
            winnerId: "requirements-analysis",
            winnerPackageId: "gstack",
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
            hostAction: "continue_normally",
            candidateCount: 0,
            winnerId: null,
            winnerPackageId: null,
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
            hostAction: "offer_capability_discovery",
            candidateCount: 0,
            winnerId: null,
            winnerPackageId: null,
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:10:00.000Z"
          })
        ].join("\n"),
        "utf8"
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        now: new Date("2026-04-01T12:00:00.000Z")
      });

      expect(result.routingMetrics).toEqual({
        windowDays: 7,
        observed: 3,
        syntheticHostSkips: 0,
        surfaces: [
          {
            requestSurface: "structured_query",
            normalizedBy: "structured_query",
            observed: 1,
            hits: 1,
            misroutes: 0,
            fallbacks: 0,
            hitRate: 1,
            misrouteRate: 0,
            fallbackRate: 0
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
        "Routing structured_query: observed=1, hit=1.00, misroute=0.00, fallback=0.00"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
