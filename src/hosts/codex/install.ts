import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
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
const DEFAULT_VERSION = "0.1.1";

function buildSkillMarkdown(installDirectory: string): string {
  return `---
name: "webpage-to-markdown"
description: "Use this skill when the user asks to turn a webpage into markdown."
---

# Webpage To Markdown

Use this skill when the request is: turn this webpage into markdown.

## Quick Command

\`\`\`bash
${join(installDirectory, "bin", RUNNER_FILE_NAME)} '{"task":"turn this webpage into markdown","url":"https://example.com/article"}'
\`\`\`
`;
}

function buildRunnerScript(brokerHomeDirectory: string): string {
  return `#!/usr/bin/env bash
set -euo pipefail

BROKER_INPUT="\${1:-}"

if [[ -z "\${BROKER_INPUT}" ]]; then
  echo "usage: $0 '<broker-request-json>'" >&2
  exit 1
fi

BROKER_CURRENT_HOST="codex" exec "${brokerHomeDirectory}/bin/run-broker" "\${BROKER_INPUT}"
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
