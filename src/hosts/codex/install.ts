import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildHostShellSkillMarkdown } from "../skill-markdown.js";
import { writeManagedShellManifest } from "../../shared-home/ownership.js";

export type InstallCodexHostShellOptions = {
  installDirectory: string;
  brokerHomeDirectory: string;
};

export type InstallCodexHostShellResult = {
  installDirectory: string;
  skillPath: string;
  runnerPath: string;
};

const RUNNER_FILE_NAME = "run-broker";
const DEFAULT_VERSION = "0.1.6";

function buildSkillMarkdown(installDirectory: string): string {
  return buildHostShellSkillMarkdown({
    host: "codex",
    invocationMode: "explicit",
    runnerCommand: join(installDirectory, "bin", RUNNER_FILE_NAME)
  });
}

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
  const skillPath = join(options.installDirectory, "SKILL.md");
  const runnerPath = join(options.installDirectory, "bin", RUNNER_FILE_NAME);

  await mkdir(dirname(skillPath), { recursive: true });
  await mkdir(dirname(runnerPath), { recursive: true });
  await writeFile(skillPath, buildSkillMarkdown(options.installDirectory), "utf8");
  await writeFile(runnerPath, buildRunnerScript(brokerHomeDirectory), "utf8");
  await chmod(runnerPath, 0o755);
  await writeManagedShellManifest(options.installDirectory, {
    managedBy: "skills-broker",
    host: "codex",
    version: DEFAULT_VERSION,
    brokerHome: brokerHomeDirectory
  });

  return {
    installDirectory: options.installDirectory,
    skillPath,
    runnerPath
  };
}
