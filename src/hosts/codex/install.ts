import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  loadMaintainedBrokerFirstContract,
  maintainedBrokerFirstBoundaryExamples
} from "../../core/maintained-broker-first.js";
import { buildHostShellSkillMarkdown } from "../skill-markdown.js";
import { writeManagedShellManifest } from "../../shared-home/ownership.js";
import { readPackageVersion } from "../../shared-home/version.js";

export type InstallCodexHostShellOptions = {
  installDirectory: string;
  brokerHomeDirectory: string;
  projectRoot?: string;
};

export type InstallCodexHostShellResult = {
  installDirectory: string;
  skillPath: string;
  runnerPath: string;
};

const RUNNER_FILE_NAME = "run-broker";

function buildRunnerScript(brokerHomeDirectory: string): string {
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

BROKER_CURRENT_HOST="codex" exec "${brokerHomeDirectory}/bin/run-broker" "\${CLI_ARGS[@]}"
`;
}

export async function installCodexHostShell(
  options: InstallCodexHostShellOptions
): Promise<InstallCodexHostShellResult> {
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
      host: "codex",
      invocationMode: "explicit",
      runnerCommand: join(options.installDirectory, "bin", RUNNER_FILE_NAME),
      maintainedBoundaryExamples:
        maintainedBrokerFirstBoundaryExamples(maintainedContract)
    }),
    "utf8"
  );
  await writeFile(runnerPath, buildRunnerScript(brokerHomeDirectory), "utf8");
  await chmod(runnerPath, 0o755);
  await writeManagedShellManifest(options.installDirectory, {
    managedBy: "skills-broker",
    host: "codex",
    version,
    brokerHome: brokerHomeDirectory
  });

  return {
    installDirectory: options.installDirectory,
    skillPath,
    runnerPath
  };
}
