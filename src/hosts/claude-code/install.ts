import { chmod, copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildHostShellSkillMarkdown } from "../skill-markdown.js";
import { writeManagedShellManifest } from "../../shared-home/ownership.js";
import { readPackageVersion } from "../../shared-home/version.js";

export type InstallClaudeCodePluginOptions = {
  installDirectory: string;
  projectRoot?: string;
};

export type InstallClaudeCodeHostShellOptions = {
  installDirectory: string;
  brokerHomeDirectory: string;
  projectRoot?: string;
};

export type InstallClaudeCodePluginResult = {
  installDirectory: string;
  packageJsonPath: string;
  manifestPath: string;
  skillPath: string;
  hostCatalogPath: string;
  mcpRegistryPath: string;
  distPath: string;
  runnerPath: string;
};

const PLUGIN_NAME = "skills-broker-claude-code";
const SKILL_DIRECTORY = "skills-broker";
const RUNNER_FILE_NAME = "run-broker";

function buildManifest(version: string) {
  return {
    name: PLUGIN_NAME,
    version,
    description: "Minimal local Claude Code host package for skills-broker."
  };
}

function buildRuntimePackageJson(version: string) {
  return {
    name: PLUGIN_NAME,
    version,
    private: true,
    type: "module"
  };
}

function buildSkillMarkdown(runnerCommand: string) {
  return buildHostShellSkillMarkdown({
    host: "claude-code",
    invocationMode: "auto",
    runnerCommand
  });
}

function buildHostShellRunnerScript(brokerHomeDirectory: string): string {
  return `#!/usr/bin/env bash
set -euo pipefail

CLI_ARGS=()
INCLUDE_TRACE="\${BROKER_INCLUDE_TRACE:-false}"

if [[ "\${1:-}" == "--debug" ]]; then
  CLI_ARGS+=("--debug")
  INCLUDE_TRACE="true"
  shift
fi

BROKER_INPUT="\${1:-}"

if [[ -z "\${BROKER_INPUT}" || "\${#}" -ne 1 ]]; then
  echo "usage: $0 [--debug] '<broker-envelope-json>'" >&2
  exit 1
fi

CLI_ARGS+=("\${BROKER_INPUT}")

BROKER_CURRENT_HOST="claude-code" exec "${brokerHomeDirectory}/bin/run-broker" "\${CLI_ARGS[@]}"
`;
}

function buildRunnerScript(): string {
  return `#!/usr/bin/env bash
set -euo pipefail

CLI_ARGS=()
INCLUDE_TRACE="\${BROKER_INCLUDE_TRACE:-false}"

if [[ "\${1:-}" == "--debug" ]]; then
  CLI_ARGS+=("--debug")
  INCLUDE_TRACE="true"
  shift
fi

BROKER_INPUT="\${1:-}"

if [[ -z "\${BROKER_INPUT}" || "\${#}" -ne 1 ]]; then
  echo "usage: $0 [--debug] '<broker-envelope-json>'" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "\${SCRIPT_DIR}/.." && pwd)"
CACHE_FILE="\${BROKER_CACHE_FILE:-\${INSTALL_DIR}/broker-cache.json}"
CLI_ARGS+=("\${BROKER_INPUT}")

BROKER_INPUT="\${BROKER_INPUT}" \\
BROKER_CACHE_FILE="\${CACHE_FILE}" \\
BROKER_HOST_CATALOG="\${BROKER_HOST_CATALOG:-\${INSTALL_DIR}/config/host-skills.seed.json}" \\
BROKER_MCP_REGISTRY="\${BROKER_MCP_REGISTRY:-\${INSTALL_DIR}/config/mcp-registry.seed.json}" \\
BROKER_HOME_DIR="\${INSTALL_DIR}" \\
BROKER_NOW="\${BROKER_NOW:-}" \\
BROKER_CURRENT_HOST="claude-code" \\
BROKER_CLI_PATH="\${INSTALL_DIR}/dist/cli.js" \\
BROKER_INCLUDE_TRACE="\${INCLUDE_TRACE}" \\
node --input-type=module <<'EOF'
import { pathToFileURL } from "node:url";

const { runBrokerCli } = await import(pathToFileURL(process.env.BROKER_CLI_PATH).href);
const input = JSON.parse(process.env.BROKER_INPUT);
const now = process.env.BROKER_NOW ? new Date(process.env.BROKER_NOW) : undefined;
const includeTrace =
  process.env.BROKER_INCLUDE_TRACE === "true" ||
  /^(?:1|true|yes|trace)$/i.test(
    process.env.BROKER_DEBUG ?? process.env.BROKER_TRACE ?? ""
  );

await runBrokerCli(input, {
  cacheFilePath: process.env.BROKER_CACHE_FILE,
  hostCatalogFilePath: process.env.BROKER_HOST_CATALOG,
  mcpRegistryFilePath: process.env.BROKER_MCP_REGISTRY,
  brokerHomeDirectory: process.env.BROKER_HOME_DIR,
  currentHost: process.env.BROKER_CURRENT_HOST,
  now,
  includeTrace
});
EOF
`;
}

export async function installClaudeCodePlugin(
  options: InstallClaudeCodePluginOptions
): Promise<InstallClaudeCodePluginResult> {
  const sourceRoot = resolve(options.projectRoot ?? process.cwd());
  const version = await readPackageVersion(options.projectRoot);
  const packageJsonPath = join(options.installDirectory, "package.json");
  const manifestPath = join(
    options.installDirectory,
    ".claude-plugin",
    "plugin.json"
  );
  const skillPath = join(
    options.installDirectory,
    "skills",
    SKILL_DIRECTORY,
    "SKILL.md"
  );
  const hostCatalogPath = join(
    options.installDirectory,
    "config",
    "host-skills.seed.json"
  );
  const mcpRegistryPath = join(
    options.installDirectory,
    "config",
    "mcp-registry.seed.json"
  );
  const distPath = join(options.installDirectory, "dist");
  const runnerPath = join(options.installDirectory, "bin", RUNNER_FILE_NAME);

  await mkdir(dirname(manifestPath), { recursive: true });
  await mkdir(dirname(skillPath), { recursive: true });
  await mkdir(dirname(hostCatalogPath), { recursive: true });
  await mkdir(dirname(runnerPath), { recursive: true });
  await writeFile(
    packageJsonPath,
    `${JSON.stringify(buildRuntimePackageJson(version), null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify(buildManifest(version), null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    skillPath,
    buildSkillMarkdown("../../bin/run-broker"),
    "utf8"
  );
  await copyFile(join(sourceRoot, "config", "host-skills.seed.json"), hostCatalogPath);
  await copyFile(join(sourceRoot, "config", "mcp-registry.seed.json"), mcpRegistryPath);
  await cp(join(sourceRoot, "dist"), distPath, { recursive: true, force: true });
  await writeFile(runnerPath, buildRunnerScript(), "utf8");
  await chmod(runnerPath, 0o755);

  return {
    installDirectory: options.installDirectory,
    packageJsonPath,
    manifestPath,
    skillPath,
    hostCatalogPath,
    mcpRegistryPath,
    distPath,
    runnerPath
  };
}

export async function installClaudeCodeHostShell(
  options: InstallClaudeCodeHostShellOptions
): Promise<InstallClaudeCodePluginResult> {
  const brokerHomeDirectory = resolve(options.brokerHomeDirectory);
  const version = await readPackageVersion(options.projectRoot);
  const packageJsonPath = join(options.installDirectory, "package.json");
  const manifestPath = join(
    options.installDirectory,
    ".claude-plugin",
    "plugin.json"
  );
  const skillPath = join(options.installDirectory, "SKILL.md");
  const runnerPath = join(options.installDirectory, "bin", RUNNER_FILE_NAME);

  await mkdir(dirname(manifestPath), { recursive: true });
  await mkdir(dirname(skillPath), { recursive: true });
  await mkdir(dirname(runnerPath), { recursive: true });
  await writeFile(
    packageJsonPath,
    `${JSON.stringify(buildRuntimePackageJson(version), null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify(buildManifest(version), null, 2)}\n`,
    "utf8"
  );
  await writeFile(skillPath, buildSkillMarkdown("./bin/run-broker"), "utf8");
  await writeFile(
    runnerPath,
    buildHostShellRunnerScript(brokerHomeDirectory),
    "utf8"
  );
  await chmod(runnerPath, 0o755);
  await writeManagedShellManifest(options.installDirectory, {
    managedBy: "skills-broker",
    host: "claude-code",
    version,
    brokerHome: brokerHomeDirectory
  });

  return {
    installDirectory: options.installDirectory,
    packageJsonPath,
    manifestPath,
    skillPath,
    hostCatalogPath: join(brokerHomeDirectory, "config", "host-skills.seed.json"),
    mcpRegistryPath: join(brokerHomeDirectory, "config", "mcp-registry.seed.json"),
    distPath: join(brokerHomeDirectory, "dist"),
    runnerPath
  };
}
