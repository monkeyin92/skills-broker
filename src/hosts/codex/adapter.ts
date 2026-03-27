import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { type RunBrokerOptions, type RunBrokerResult } from "../../broker/run.js";
import type { NormalizeRequestInput } from "../../core/request.js";

const execFileAsync = promisify(execFile);

export type RunCodexAdapterOptions = {
  installDirectory: string;
} & Pick<RunBrokerOptions, "cacheFilePath" | "now">;

async function assertInstalledSkill(installDirectory: string): Promise<void> {
  const skillPath = join(installDirectory, "SKILL.md");
  const runnerPath = join(installDirectory, "bin", "run-broker");

  await access(skillPath);
  await access(runnerPath);
}

export async function runCodexAdapter(
  input: NormalizeRequestInput,
  options: RunCodexAdapterOptions
): Promise<RunBrokerResult> {
  await assertInstalledSkill(options.installDirectory);
  const runnerPath = join(options.installDirectory, "bin", "run-broker");
  const env = {
    ...process.env
  } as NodeJS.ProcessEnv;

  if (options.cacheFilePath !== undefined) {
    env.BROKER_CACHE_FILE = options.cacheFilePath;
  }

  if (options.now !== undefined) {
    env.BROKER_NOW = options.now.toISOString();
  }

  const { stdout } = await execFileAsync(runnerPath, [JSON.stringify(input)], {
    cwd: options.installDirectory,
    env
  });

  return JSON.parse(stdout) as RunBrokerResult;
}
