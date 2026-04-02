import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8"
  });

  return stdout.trim();
}

export async function initGitRepo(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await runGit(directory, ["init", "--initial-branch=main"]);
  await runGit(directory, ["config", "user.name", "Skills Broker Tests"]);
  await runGit(directory, ["config", "user.email", "tests@example.com"]);
}

export async function initBareGitRepo(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await execFileAsync("git", ["init", "--bare", "--initial-branch=main", directory], {
    encoding: "utf8"
  });
}

export async function commitAll(cwd: string, message: string): Promise<string> {
  await runGit(cwd, ["add", "-A"]);
  await runGit(cwd, ["commit", "-m", message]);
  return runGit(cwd, ["rev-parse", "--short", "HEAD"]);
}

export async function cloneGitRepo(remoteDirectory: string, directory: string): Promise<void> {
  await execFileAsync("git", ["clone", remoteDirectory, directory], {
    encoding: "utf8"
  });
  await runGit(directory, ["config", "user.name", "Skills Broker Tests"]);
  await runGit(directory, ["config", "user.email", "tests@example.com"]);
}
