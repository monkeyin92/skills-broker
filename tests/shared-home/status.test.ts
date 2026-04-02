import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateStatusBoard, type StatusProof } from "../../src/shared-home/status";
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

describe("evaluateStatusBoard", () => {
  it("returns a red issue when the repo target is invalid", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-invalid-repo-"));

    try {
      const result = await evaluateStatusBoard({
        repoRootOverride: join(runtimeDirectory, "missing-repo")
      });

      expect(result.items).toEqual([]);
      expect(result.hasStrictIssues).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "STATUS_REPO_TARGET_INVALID"
        })
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed when STATUS.md is missing the canonical block", async () => {
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-missing-"));

    try {
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await commitAll(repoDirectory, "init repo");

      const result = await evaluateStatusBoard({
        repoRootOverride: repoDirectory
      });

      expect(result.items).toEqual([]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "STATUS_CANONICAL_BLOCK_MISSING"
        })
      );
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed when the canonical block uses an unknown proof type", async () => {
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-invalid-block-"));

    try {
      await initGitRepo(repoDirectory);
      await writeFile(
        join(repoDirectory, "STATUS.md"),
        `# STATUS

<!-- skills-broker-status:start -->
\`\`\`json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "invalid-proof",
      "title": "Invalid proof",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "mystery",
          "path": "README.md"
        }
      ]
    }
  ]
}
\`\`\`
<!-- skills-broker-status:end -->
`,
        "utf8"
      );
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await commitAll(repoDirectory, "add invalid status board");

      const result = await evaluateStatusBoard({
        repoRootOverride: repoDirectory
      });

      expect(result.items).toEqual([]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "STATUS_CANONICAL_BLOCK_INVALID"
        })
      );
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes shipped_remote from shipped_local using the shipping ref", async () => {
    const remoteDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-remote-"));
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-local-"));

    try {
      await initBareGitRepo(remoteDirectory);
      await cloneGitRepo(remoteDirectory, repoDirectory);

      await writeFile(join(repoDirectory, "remote-proof.txt"), "remote proof\n", "utf8");
      const remoteCommit = await commitAll(repoDirectory, "add remote proof");
      await runGit(repoDirectory, ["push", "-u", "origin", "main"]);

      await writeFile(join(repoDirectory, "local-proof.txt"), "local proof\n", "utf8");
      const localCommit = await commitAll(repoDirectory, "add local proof");

      await writeFile(
        join(repoDirectory, "STATUS.md"),
        renderStatusBoard([
          {
            id: "remote-item",
            title: "Remote item",
            status: "shipped_remote",
            proofs: [
              { type: "commit", ref: remoteCommit },
              { type: "file", path: "remote-proof.txt" }
            ]
          },
          {
            id: "local-item",
            title: "Local item",
            status: "shipped_local",
            proofs: [{ type: "commit", ref: localCommit }]
          }
        ]),
        "utf8"
      );
      await commitAll(repoDirectory, "add status board");

      const result = await evaluateStatusBoard({
        repoRootOverride: repoDirectory
      });

      expect(result.shippingRef).toBe("origin/main");
      expect(result.remoteFreshness.state).toBe("local_tracking_ref");
      expect(result.issues).toEqual([]);
      expect(result.items).toEqual([
        expect.objectContaining({
          id: "remote-item",
          declaredStatus: "shipped_remote",
          evaluatedStatus: "shipped_remote"
        }),
        expect.objectContaining({
          id: "local-item",
          declaredStatus: "shipped_local",
          evaluatedStatus: "shipped_local"
        })
      ]);
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
      await rm(remoteDirectory, { recursive: true, force: true });
    }
  });

  it("preserves declared and evaluated status on mismatch", async () => {
    const remoteDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-mismatch-remote-"));
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-mismatch-local-"));

    try {
      await initBareGitRepo(remoteDirectory);
      await cloneGitRepo(remoteDirectory, repoDirectory);

      await writeFile(join(repoDirectory, "baseline.txt"), "baseline\n", "utf8");
      await commitAll(repoDirectory, "baseline");
      await runGit(repoDirectory, ["push", "-u", "origin", "main"]);

      await writeFile(join(repoDirectory, "local-proof.txt"), "local proof\n", "utf8");
      const localCommit = await commitAll(repoDirectory, "local proof");

      await writeFile(
        join(repoDirectory, "STATUS.md"),
        renderStatusBoard([
          {
            id: "mismatch-item",
            title: "Mismatch item",
            status: "shipped_remote",
            proofs: [{ type: "commit", ref: localCommit }]
          }
        ]),
        "utf8"
      );
      await commitAll(repoDirectory, "add mismatched board");

      const result = await evaluateStatusBoard({
        repoRootOverride: repoDirectory
      });

      expect(result.items).toContainEqual(
        expect.objectContaining({
          id: "mismatch-item",
          declaredStatus: "shipped_remote",
          evaluatedStatus: "shipped_local"
        })
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "STATUS_DECLARED_EVALUATED_MISMATCH",
          itemId: "mismatch-item"
        })
      );
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
      await rm(remoteDirectory, { recursive: true, force: true });
    }
  });

  it("marks remote truth unknown and strict-failing when refresh remote fails", async () => {
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-refresh-fail-"));

    try {
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "local-proof.txt"), "local proof\n", "utf8");
      const localCommit = await commitAll(repoDirectory, "local proof");
      await runGit(repoDirectory, ["remote", "add", "origin", join(repoDirectory, "missing-remote.git")]);
      await runGit(repoDirectory, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      await runGit(repoDirectory, ["branch", "--set-upstream-to=origin/main", "main"]);
      await writeFile(
        join(repoDirectory, "STATUS.md"),
        renderStatusBoard([
          {
            id: "local-only-item",
            title: "Local only item",
            status: "shipped_local",
            proofs: [{ type: "commit", ref: localCommit }]
          }
        ]),
        "utf8"
      );
      await commitAll(repoDirectory, "add status board");

      const result = await evaluateStatusBoard({
        repoRootOverride: repoDirectory,
        refreshRemote: true
      });

      expect(result.remoteFreshness.state).toBe("unknown");
      expect(result.hasStrictIssues).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "STATUS_REMOTE_REFRESH_FAILED"
        })
      );
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
    }
  });
});
