import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  loadMaintainedBrokerFirstContract,
  maintainedBrokerFirstBoundaryExamples
} from "../../core/maintained-broker-first.js";
import { buildHostShellSkillMarkdown } from "../skill-markdown.js";
import { writeManagedShellManifest } from "../../shared-home/ownership.js";
import { readPackageVersion } from "../../shared-home/version.js";

export type InstallOpenCodeHostShellOptions = {
  installDirectory: string;
  brokerHomeDirectory: string;
  projectRoot?: string;
};

export type InstallOpenCodeHostShellResult = {
  installDirectory: string;
  skillPath: string;
  runnerPath: string;
};

const RUNNER_FILE_NAME = "run-broker";

function buildRunnerScript(): string {
  return `#!/usr/bin/env bash
set -euo pipefail

CLI_ARGS=()

if [[ "\${1:-}" == "--debug" ]]; then
  CLI_ARGS+=("--debug")
  shift
fi

BROKER_INPUT="\${1:-}"

if [[ -z "\${BROKER_INPUT}" || "\${#}" -ne 1 ]]; then
  echo "usage: $0 [--debug] '<broker-envelope-json>'" >&2
  exit 1
fi

CLI_ARGS+=("\${BROKER_INPUT}")

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "\${SCRIPT_DIR}/.." && pwd)"
BROKER_HOME="$(SKILLS_BROKER_SHELL_DIR="\${INSTALL_DIR}" node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const shellDirectory = resolve(process.env.SKILLS_BROKER_SHELL_DIR ?? ".");
const manifestPath = join(shellDirectory, ".skills-broker.json");

let manifest;

try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  const message =
    error instanceof Error ? error.message : "unknown manifest read failure";
  process.stderr.write(
    \`skills-broker host shell could not read managed manifest: \${message}\\n\`
  );
  process.exit(1);
}

if (manifest?.managedBy !== "skills-broker" || typeof manifest.brokerHome !== "string") {
  process.stderr.write(
    "skills-broker host shell manifest is missing a usable brokerHome path\\n"
  );
  process.exit(1);
}

process.stdout.write(manifest.brokerHome);
EOF
)"

if [[ -z "\${BROKER_HOME}" ]]; then
  echo "skills-broker host shell could not resolve brokerHome" >&2
  exit 1
fi

BROKER_CURRENT_HOST="opencode" exec "\${BROKER_HOME}/bin/run-broker" "\${CLI_ARGS[@]}"
`;
}

export async function installOpenCodeHostShell(
  options: InstallOpenCodeHostShellOptions
): Promise<InstallOpenCodeHostShellResult> {
  const brokerHomeDirectory = resolve(options.brokerHomeDirectory);
  const sourceRoot = resolve(options.projectRoot ?? process.cwd());
  const version = await readPackageVersion(options.projectRoot);
  const maintainedContract = await loadMaintainedBrokerFirstContract(
    join(sourceRoot, "config", "maintained-broker-first-families.json")
  );
  const skillPath = join(options.installDirectory, "SKILL.md");
  const runnerPath = join(options.installDirectory, "bin", RUNNER_FILE_NAME);

  await mkdir(dirname(skillPath), { recursive: true });
  await mkdir(dirname(runnerPath), { recursive: true });
  await writeFile(
    skillPath,
    buildHostShellSkillMarkdown({
      host: "opencode",
      invocationMode: "explicit",
      runnerCommand: join(options.installDirectory, "bin", RUNNER_FILE_NAME),
      maintainedBoundaryExamples:
        maintainedBrokerFirstBoundaryExamples(maintainedContract)
    }),
    "utf8"
  );
  await writeFile(runnerPath, buildRunnerScript(), "utf8");
  await chmod(runnerPath, 0o755);
  await writeManagedShellManifest(options.installDirectory, {
    managedBy: "skills-broker",
    host: "opencode",
    version,
    brokerHome: brokerHomeDirectory
  });

  return {
    installDirectory: options.installDirectory,
    skillPath,
    runnerPath
  };
}
