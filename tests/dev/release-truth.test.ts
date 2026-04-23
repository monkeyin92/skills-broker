import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { StatusProof } from "../../src/shared-home/status";
import {
  buildReleaseGateRailSpecs,
  inspectReleaseGate,
  promoteReleaseTruth
} from "../../src/dev/release-truth";
import {
  cloneGitRepo,
  commitAll,
  initBareGitRepo,
  initGitRepo,
  runGit
} from "../helpers/git";

type StatusItemFixture = {
  id: string;
  title: string;
  status: string;
  summary?: string;
  proofs: StatusProof[];
};

function renderStatusBoard(items: StatusItemFixture[]): string {
  return `# STATUS

<!-- skills-broker-status:start -->
\`\`\`json
${JSON.stringify({ schemaVersion: 1, items }, null, 2)}
\`\`\`
<!-- skills-broker-status:end -->
`;
}

function extractCanonicalStatusBoard(markdown: string): { items: StatusItemFixture[] } {
  const match = markdown.match(
    /<!--\s*skills-broker-status:start\s*-->\s*```json\s*([\s\S]*?)\s*```\s*<!--\s*skills-broker-status:end\s*-->/m
  );

  if (!match) {
    throw new Error("STATUS.md canonical block is missing");
  }

  return JSON.parse(match[1]) as { items: StatusItemFixture[] };
}

function createCiTrustReport(hasIssues: boolean) {
  return JSON.stringify({
    repoRoot: "/repo",
    inventory: {
      supportedHosts: ["claude-code"],
      maintainedFamilies: ["quality_assurance"],
      provenFamilies: ["website_qa"],
      workflows: ["idea-to-ship"]
    },
    surfaceResults: [],
    issues: [],
    totalSurfaces: 3,
    passingSurfaces: hasIssues ? 2 : 3,
    failingSurfaces: hasIssues ? 1 : 0,
    hasIssues
  });
}

function createStrictDoctorReport(hasStrictIssues: boolean) {
  return JSON.stringify({
    status: {
      skipped: false,
      boardPath: "/repo/STATUS.md",
      shippingRef: "origin/main",
      remoteFreshness: {
        state: "refreshed",
        detail: "fetched origin before comparing origin/main"
      },
      issues: hasStrictIssues
        ? [
            {
              code: "STATUS_REMOTE_REFRESH_FAILED",
              severity: "error",
              strict: true,
              message: "refresh failed",
              evidenceRefs: ["origin"]
            }
          ]
        : [],
      items: [],
      hasStrictIssues
    },
    brokerFirstGate: {
      hasStrictIssues: false
    },
    adoptionHealth: {
      status: "green"
    },
    websiteQaLoop: {
      verdict: "proven"
    }
  });
}

describe("release truth", () => {
  it("aggregates the three release rails into one machine-readable verdict", async () => {
    const verdict = await inspectReleaseGate({
      repoRoot: "/repo",
      commandRunner: async (spec) => {
        if (spec.id === "ci_blind_spot") {
          return {
            exitCode: 0,
            stdout: createCiTrustReport(false),
            stderr: ""
          };
        }

        if (spec.id === "narrative_parity") {
          return {
            exitCode: 1,
            stdout: "",
            stderr: "narrative drift"
          };
        }

        return {
          exitCode: 0,
          stdout: createStrictDoctorReport(false),
          stderr: ""
        };
      }
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.failingRails).toEqual(["narrative_parity"]);
    expect(verdict.shippingRef).toBe("origin/main");
    expect(verdict.remoteFreshness).toEqual({
      state: "refreshed",
      detail: "fetched origin before comparing origin/main"
    });
    expect(verdict.strictDoctor).toEqual({
      hasStrictIssues: false,
      issueCodes: [],
      adoptionHealth: "green",
      websiteQaVerdict: "proven"
    });
  });

  it("treats strict doctor failure as a failing release rail while preserving diagnostics", async () => {
    const verdict = await inspectReleaseGate({
      repoRoot: "/repo",
      commandRunner: async (spec) => {
        if (spec.id === "ci_blind_spot") {
          return {
            exitCode: 0,
            stdout: createCiTrustReport(false),
            stderr: ""
          };
        }

        if (spec.id === "narrative_parity") {
          return {
            exitCode: 0,
            stdout: "",
            stderr: ""
          };
        }

        return {
          exitCode: 1,
          stdout: createStrictDoctorReport(true),
          stderr: "strict doctor failed"
        };
      }
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.failingRails).toEqual(["strict_doctor"]);
    expect(verdict.strictDoctor).toEqual({
      hasStrictIssues: true,
      issueCodes: ["STATUS_REMOTE_REFRESH_FAILED"],
      adoptionHealth: "green",
      websiteQaVerdict: "proven"
    });
  });

  it("builds rail commands without reusing verify:local as shipping proof", () => {
    const commands = buildReleaseGateRailSpecs("/repo")
      .map((spec) => spec.command)
      .join("\n");

    expect(commands).toContain("ci-trust-report.mjs");
    expect(commands).toContain("operator-truth-parity.test.ts");
    expect(commands).toContain("doctor --json --strict --refresh-remote");
    expect(commands).not.toContain("verify:local");
  });

  it("promotes eligible shipped_local proofs to shipped_remote and rewrites STATUS.md", async () => {
    const remoteDirectory = await mkdtemp(join(tmpdir(), "skills-broker-release-truth-remote-"));
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-release-truth-local-"));

    try {
      await initBareGitRepo(remoteDirectory);
      await cloneGitRepo(remoteDirectory, repoDirectory);

      await writeFile(join(repoDirectory, "remote-proof.txt"), "remote proof\n", "utf8");
      const remoteCommit = await commitAll(repoDirectory, "add remote proof");
      await runGit(repoDirectory, ["push", "-u", "origin", "main"]);

      await writeFile(
        join(repoDirectory, "STATUS.md"),
        renderStatusBoard([
          {
            id: "phase9-release-gate",
            title: "Phase 9 release gate",
            status: "shipped_local",
            proofs: [
              { type: "commit", ref: remoteCommit },
              { type: "file", path: "remote-proof.txt" }
            ]
          }
        ]),
        "utf8"
      );
      await commitAll(repoDirectory, "add local status board");

      const result = await promoteReleaseTruth({
        repoRoot: repoDirectory
      });

      expect(result.ok).toBe(true);
      expect(result.wrote).toBe(true);
      expect(result.shippingRef).toBe("origin/main");
      expect(result.promotions).toEqual([
        {
          id: "phase9-release-gate",
          title: "Phase 9 release gate",
          from: "shipped_local",
          to: "shipped_remote"
        }
      ]);

      const board = extractCanonicalStatusBoard(
        await readFile(join(repoDirectory, "STATUS.md"), "utf8")
      );
      expect(board.items).toContainEqual(
        expect.objectContaining({
          id: "phase9-release-gate",
          status: "shipped_remote"
        })
      );
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
      await rm(remoteDirectory, { recursive: true, force: true });
    }
  }, 60_000);

  it("fails closed when refreshing remote truth breaks and leaves STATUS.md unchanged", async () => {
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-release-truth-refresh-fail-"));

    try {
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "local-proof.txt"), "local proof\n", "utf8");
      const localCommit = await commitAll(repoDirectory, "add local proof");
      await runGit(repoDirectory, ["remote", "add", "origin", join(repoDirectory, "missing-remote.git")]);
      await runGit(repoDirectory, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      await runGit(repoDirectory, ["branch", "--set-upstream-to=origin/main", "main"]);
      const statusContents = renderStatusBoard([
        {
          id: "phase10-proof-promotion",
          title: "Phase 10 proof promotion",
          status: "shipped_local",
          proofs: [{ type: "commit", ref: localCommit }]
        }
      ]);
      await writeFile(join(repoDirectory, "STATUS.md"), statusContents, "utf8");
      await commitAll(repoDirectory, "add local-only status board");

      const result = await promoteReleaseTruth({
        repoRoot: repoDirectory
      });

      expect(result.ok).toBe(false);
      expect(result.wrote).toBe(false);
      expect(result.blockingIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "STATUS_REMOTE_REFRESH_FAILED"
          })
        ])
      );
      expect(await readFile(join(repoDirectory, "STATUS.md"), "utf8")).toBe(statusContents);
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
    }
  }, 60_000);

  it("does not rewrite STATUS.md when a non-promotion mismatch still exists", async () => {
    const remoteDirectory = await mkdtemp(join(tmpdir(), "skills-broker-release-truth-mismatch-remote-"));
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-release-truth-mismatch-local-"));

    try {
      await initBareGitRepo(remoteDirectory);
      await cloneGitRepo(remoteDirectory, repoDirectory);

      await writeFile(join(repoDirectory, "baseline.txt"), "baseline\n", "utf8");
      await commitAll(repoDirectory, "baseline");
      await runGit(repoDirectory, ["push", "-u", "origin", "main"]);

      await writeFile(join(repoDirectory, "local-proof.txt"), "local proof\n", "utf8");
      const localCommit = await commitAll(repoDirectory, "local proof");
      const statusContents = renderStatusBoard([
        {
          id: "phase4-readiness",
          title: "Phase 4 readiness",
          status: "shipped_remote",
          proofs: [{ type: "commit", ref: localCommit }]
        }
      ]);
      await writeFile(join(repoDirectory, "STATUS.md"), statusContents, "utf8");
      await commitAll(repoDirectory, "add mismatched status board");

      const result = await promoteReleaseTruth({
        repoRoot: repoDirectory
      });

      expect(result.ok).toBe(false);
      expect(result.wrote).toBe(false);
      expect(result.blockingIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "STATUS_DECLARED_EVALUATED_MISMATCH",
            itemId: "phase4-readiness"
          })
        ])
      );
      expect(await readFile(join(repoDirectory, "STATUS.md"), "utf8")).toBe(statusContents);
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
      await rm(remoteDirectory, { recursive: true, force: true });
    }
  }, 60_000);

  it("reuses canonical release truth inside the publish workflow", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github", "workflows", "publish-npm.yml"),
      "utf8"
    );

    expect(workflow).toContain('npm run release:gate -- --json --ship-ref "origin/${DEFAULT_BRANCH}"');
    expect(workflow).toContain('npm run release:promote -- --json --ship-ref "${ship_ref}"');
    expect(workflow).toContain('git push origin "HEAD:${DEFAULT_BRANCH}"');
  });
});
