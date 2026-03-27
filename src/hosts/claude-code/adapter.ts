import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { type RunBrokerOptions, type RunBrokerResult } from "../../broker/run.js";
import type { NormalizeRequestInput } from "../../core/request.js";

const execFileAsync = promisify(execFile);

export type RunClaudeCodeAdapterOptions = {
  installDirectory: string;
} & Pick<RunBrokerOptions, "cacheFilePath" | "now">;

const CURRENT_HOST = "claude-code";

async function assertInstalledPlugin(installDirectory: string): Promise<void> {
  const manifestPath = join(installDirectory, ".claude-plugin", "plugin.json");
  const skillPath = join(
    installDirectory,
    "skills",
    "webpage-to-markdown",
    "SKILL.md"
  );
  const hostConfigPath = join(installDirectory, "config", "host-skills.seed.json");
  const mcpConfigPath = join(installDirectory, "config", "mcp-registry.seed.json");
  const runnerPath = join(installDirectory, "bin", "run-broker");

  await access(manifestPath);
  await access(skillPath);
  await access(hostConfigPath);
  await access(mcpConfigPath);
  await access(runnerPath);
}

export async function runClaudeCodeAdapter(
  input: NormalizeRequestInput,
  options: RunClaudeCodeAdapterOptions
): Promise<RunBrokerResult> {
  await assertInstalledPlugin(options.installDirectory);
  const runnerPath = join(options.installDirectory, "bin", "run-broker");
  const env = {
    ...process.env,
    BROKER_CACHE_FILE: options.cacheFilePath,
    BROKER_NOW: options.now?.toISOString()
  };
  const { stdout } = await execFileAsync(runnerPath, [JSON.stringify(input)], {
    cwd: options.installDirectory,
    env
  });

  return JSON.parse(stdout) as RunBrokerResult;
}
