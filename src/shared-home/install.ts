import { chmod, copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type InstallSharedBrokerHomeOptions = {
  brokerHomeDirectory: string;
  projectRoot?: string;
};

export type InstallSharedBrokerHomeResult = {
  brokerHomeDirectory: string;
  packageJsonPath: string;
  hostCatalogPath: string;
  mcpRegistryPath: string;
  distPath: string;
  runnerPath: string;
};

const DEFAULT_VERSION = "0.1.6";
const RUNTIME_PACKAGE_NAME = "skills-broker-home";

function buildRuntimePackageJson(version: string) {
  return {
    name: RUNTIME_PACKAGE_NAME,
    version,
    private: true,
    type: "module"
  };
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
  echo "usage: $0 [--debug] '<broker-request-json>'" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
BROKER_HOME="$(cd "\${SCRIPT_DIR}/.." && pwd)"
CURRENT_HOST="\${BROKER_CURRENT_HOST:-}"

if [[ -z "\${CURRENT_HOST}" ]]; then
  echo "BROKER_CURRENT_HOST is required" >&2
  exit 1
fi

mkdir -p "\${BROKER_HOME}/state"

CACHE_FILE="\${BROKER_CACHE_FILE:-\${BROKER_HOME}/state/broker-cache.json}"
CLI_ARGS+=("\${BROKER_INPUT}")

BROKER_INPUT="\${BROKER_INPUT}" \\
BROKER_CACHE_FILE="\${CACHE_FILE}" \\
BROKER_HOST_CATALOG="\${BROKER_HOST_CATALOG:-\${BROKER_HOME}/config/host-skills.seed.json}" \\
BROKER_MCP_REGISTRY="\${BROKER_MCP_REGISTRY:-\${BROKER_HOME}/config/mcp-registry.seed.json}" \\
BROKER_HOME_DIR="\${BROKER_HOME}" \\
BROKER_NOW="\${BROKER_NOW:-}" \\
BROKER_CURRENT_HOST="\${CURRENT_HOST}" \\
BROKER_CLI_PATH="\${BROKER_HOME}/dist/cli.js" \\
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

async function readPackageVersion(projectRoot?: string): Promise<string> {
  if (projectRoot === undefined) {
    return DEFAULT_VERSION;
  }

  try {
    const packageJson = JSON.parse(
      await readFile(join(projectRoot, "package.json"), "utf8")
    ) as { version?: string };

    return packageJson.version ?? DEFAULT_VERSION;
  } catch {
    return DEFAULT_VERSION;
  }
}

export function resolveSharedBrokerHomeLayout(
  brokerHomeDirectory: string
): InstallSharedBrokerHomeResult {
  return {
    brokerHomeDirectory,
    packageJsonPath: join(brokerHomeDirectory, "package.json"),
    hostCatalogPath: join(brokerHomeDirectory, "config", "host-skills.seed.json"),
    mcpRegistryPath: join(brokerHomeDirectory, "config", "mcp-registry.seed.json"),
    distPath: join(brokerHomeDirectory, "dist"),
    runnerPath: join(brokerHomeDirectory, "bin", "run-broker")
  };
}

export async function installSharedBrokerHome(
  options: InstallSharedBrokerHomeOptions
): Promise<InstallSharedBrokerHomeResult> {
  const sourceRoot = resolve(options.projectRoot ?? process.cwd());
  const version = await readPackageVersion(options.projectRoot);
  const {
    packageJsonPath,
    hostCatalogPath,
    mcpRegistryPath,
    distPath,
    runnerPath
  } = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);

  await mkdir(dirname(packageJsonPath), { recursive: true });
  await mkdir(dirname(hostCatalogPath), { recursive: true });
  await mkdir(dirname(runnerPath), { recursive: true });
  await mkdir(join(options.brokerHomeDirectory, "state"), { recursive: true });

  await writeFile(
    packageJsonPath,
    `${JSON.stringify(buildRuntimePackageJson(version), null, 2)}\n`,
    "utf8"
  );
  await copyFile(join(sourceRoot, "config", "host-skills.seed.json"), hostCatalogPath);
  await copyFile(join(sourceRoot, "config", "mcp-registry.seed.json"), mcpRegistryPath);
  await cp(join(sourceRoot, "dist"), distPath, { recursive: true, force: true });
  await writeFile(runnerPath, buildRunnerScript(), "utf8");
  await chmod(runnerPath, 0o755);

  return resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
}
