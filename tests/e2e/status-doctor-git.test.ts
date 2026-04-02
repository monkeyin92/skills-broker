import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  cloneGitRepo,
  commitAll,
  initBareGitRepo,
  initGitRepo,
  runGit
} from "../helpers/git";

const execFileAsync = promisify(execFile);
const tsNodeLoaderPath = resolve("node_modules/ts-node/esm.mjs");

function renderStatusBoard(remoteCommit: string, localCommit?: string): string {
  const items = [
    {
      id: "remote-item",
      title: "Remote item",
      status: "shipped_remote",
      proofs: [
        {
          type: "commit",
          ref: remoteCommit
        },
        {
          type: "file",
          path: "remote-proof.txt"
        }
      ]
    }
  ];

  if (localCommit) {
    items.push({
      id: "local-item",
      title: "Local item",
      status: "shipped_local",
      proofs: [
        {
          type: "commit",
          ref: localCommit
        }
      ]
    });
  }

  return `# STATUS

<!-- skills-broker-status:start -->
\`\`\`json
${JSON.stringify({ schemaVersion: 1, items }, null, 2)}
\`\`\`
<!-- skills-broker-status:end -->
`;
}

describe("status doctor git integration", () => {
  it("refreshes remote truth and keeps strict doctor green when the board matches", async () => {
    const remoteDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-e2e-remote-"));
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-e2e-local-"));
    const scriptPath = resolve("src/bin/skills-broker.ts");

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
        renderStatusBoard(remoteCommit, localCommit),
        "utf8"
      );
      await commitAll(repoDirectory, "add status board");

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "doctor",
        "--json",
        "--strict",
        "--refresh-remote",
        "--repo-root",
        repoDirectory
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim()) as {
        status: {
          shippingRef?: string;
          remoteFreshness: { state: string };
          issues: unknown[];
          items: Array<{ id: string; evaluatedStatus: string }>;
        };
      };

      expect(result.status.shippingRef).toBe("origin/main");
      expect(result.status.remoteFreshness.state).toBe("refreshed");
      expect(result.status.issues).toEqual([]);
      expect(result.status.items).toEqual([
        expect.objectContaining({
          id: "remote-item",
          evaluatedStatus: "shipped_remote"
        }),
        expect.objectContaining({
          id: "local-item",
          evaluatedStatus: "shipped_local"
        })
      ]);
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
      await rm(remoteDirectory, { recursive: true, force: true });
    }
  }, 20_000);

  it("falls back to the remote default branch when strict doctor runs on detached HEAD", async () => {
    const remoteDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-e2e-detached-remote-"));
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-e2e-detached-local-"));
    const scriptPath = resolve("src/bin/skills-broker.ts");

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
        renderStatusBoard(remoteCommit, localCommit),
        "utf8"
      );
      await commitAll(repoDirectory, "add status board");
      await runGit(repoDirectory, ["checkout", "--detach", "HEAD"]);

      const { stdout } = await execFileAsync("node", [
        "--loader",
        tsNodeLoaderPath,
        scriptPath,
        "doctor",
        "--json",
        "--strict",
        "--refresh-remote",
        "--repo-root",
        repoDirectory
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim()) as {
        status: {
          shippingRef?: string;
          issues: unknown[];
          items: Array<{ id: string; evaluatedStatus: string }>;
        };
      };

      expect(result.status.shippingRef).toBe("origin/main");
      expect(result.status.issues).toEqual([]);
      expect(result.status.items).toEqual([
        expect.objectContaining({
          id: "remote-item",
          evaluatedStatus: "shipped_remote"
        }),
        expect.objectContaining({
          id: "local-item",
          evaluatedStatus: "shipped_local"
        })
      ]);
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
      await rm(remoteDirectory, { recursive: true, force: true });
    }
  }, 20_000);

  it("fails strict doctor when remote refresh breaks but still preserves local diagnostics", async () => {
    const repoDirectory = await mkdtemp(join(tmpdir(), "skills-broker-status-e2e-refresh-fail-"));
    const scriptPath = resolve("src/bin/skills-broker.ts");

    try {
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "remote-proof.txt"), "remote proof\n", "utf8");
      const remoteCommit = await commitAll(repoDirectory, "add local proof");
      await runGit(repoDirectory, ["remote", "add", "origin", join(repoDirectory, "missing-remote.git")]);
      await runGit(repoDirectory, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      await runGit(repoDirectory, ["branch", "--set-upstream-to=origin/main", "main"]);
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard(remoteCommit), "utf8");
      await commitAll(repoDirectory, "add status board");

      await expect(
        execFileAsync(
          "node",
          [
            "--loader",
            tsNodeLoaderPath,
            scriptPath,
            "doctor",
            "--json",
            "--strict",
            "--refresh-remote",
            "--repo-root",
            repoDirectory
          ],
          {
            env: process.env,
            encoding: "utf8"
          }
        )
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining("\"state\":\"unknown\"")
      });
    } finally {
      await rm(repoDirectory, { recursive: true, force: true });
    }
  }, 20_000);
});
