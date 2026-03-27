import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  runBroker,
  type RunBrokerOptions,
  type RunBrokerResult
} from "../../broker/run";
import type { NormalizeRequestInput } from "../../core/request";

export type RunClaudeCodeAdapterOptions = {
  installDirectory: string;
  projectRoot?: string;
} & Pick<
  RunBrokerOptions,
  "cacheFilePath" | "hostCatalogFilePath" | "mcpRegistryFilePath" | "now"
>;

const CURRENT_HOST = "claude-code";

async function assertInstalledPlugin(installDirectory: string): Promise<void> {
  const manifestPath = join(installDirectory, ".claude-plugin", "plugin.json");
  const skillPath = join(
    installDirectory,
    "skills",
    "webpage-to-markdown",
    "SKILL.md"
  );

  await access(manifestPath);
  await access(skillPath);
}

function defaultProjectPath(projectRoot: string | undefined, fileName: string): string {
  return join(projectRoot ?? process.cwd(), "config", fileName);
}

export async function runClaudeCodeAdapter(
  input: NormalizeRequestInput,
  options: RunClaudeCodeAdapterOptions
): Promise<RunBrokerResult> {
  await assertInstalledPlugin(options.installDirectory);

  return runBroker(input, {
    cacheFilePath: options.cacheFilePath,
    hostCatalogFilePath:
      options.hostCatalogFilePath ??
      defaultProjectPath(options.projectRoot, "host-skills.seed.json"),
    mcpRegistryFilePath:
      options.mcpRegistryFilePath ??
      defaultProjectPath(options.projectRoot, "mcp-registry.seed.json"),
    currentHost: CURRENT_HOST,
    now: options.now
  });
}
