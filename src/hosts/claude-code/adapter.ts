import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { type RunBrokerOptions, type RunBrokerResult } from "../../broker/run.js";
import type { NormalizeRequestInput } from "../../core/request.js";

const execFileAsync = promisify(execFile);

export type RunClaudeCodeAdapterOptions = {
  installDirectory: string;
  includeTrace?: boolean;
} & Pick<
  RunBrokerOptions,
  "cacheFilePath" | "hostCatalogFilePath" | "mcpRegistryFilePath" | "now"
>;

const CURRENT_HOST = "claude-code";

async function assertInstalledPlugin(installDirectory: string): Promise<void> {
  const manifestPath = join(installDirectory, ".claude-plugin", "plugin.json");
  const skillPath = join(installDirectory, "SKILL.md");
  const nestedSkillPath = join(installDirectory, "skills", "skills-broker", "SKILL.md");
  const runnerPath = join(installDirectory, "bin", "run-broker");

  await access(manifestPath);
  try {
    await access(skillPath);
  } catch {
    await access(nestedSkillPath);
  }
  await access(runnerPath);
}

export async function runClaudeCodeAdapter(
  input: NormalizeRequestInput,
  options: RunClaudeCodeAdapterOptions
): Promise<RunBrokerResult> {
  await assertInstalledPlugin(options.installDirectory);
  const runnerPath = join(options.installDirectory, "bin", "run-broker");
  const env = {
    ...process.env
  } as NodeJS.ProcessEnv;

  if (options.cacheFilePath !== undefined) {
    env.BROKER_CACHE_FILE = options.cacheFilePath;
  }

  if (options.hostCatalogFilePath !== undefined) {
    env.BROKER_HOST_CATALOG = options.hostCatalogFilePath;
  }

  if (options.mcpRegistryFilePath !== undefined) {
    env.BROKER_MCP_REGISTRY = options.mcpRegistryFilePath;
  }

  if (options.now !== undefined) {
    env.BROKER_NOW = options.now.toISOString();
  }

  const args =
    options.includeTrace === true
      ? ["--debug", JSON.stringify(input)]
      : [JSON.stringify(input)];

  const { stdout } = await execFileAsync(runnerPath, args, {
    cwd: options.installDirectory,
    env
  });

  return JSON.parse(stdout) as RunBrokerResult;
}
