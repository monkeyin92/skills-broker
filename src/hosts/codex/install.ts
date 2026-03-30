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
const HOST_SHELL_NAME = "skills-broker";

function buildSkillMarkdown(installDirectory: string): string {
  return `---
name: "${HOST_SHELL_NAME}"
description: "Route external capability requests through skills-broker. Use for web content to markdown, social post to markdown, and explicit skill or MCP discovery/install requests. Do not use for ordinary chat, coding, or summarization."
---

# Skills Broker

Use this skill only for external capability requests, such as:

- converting web content to markdown
- converting a social post to markdown
- explicitly finding or installing a skill or MCP

When this skill is loaded:

1. preserve the user's original wording
2. build a broker envelope with raw request text plus safe hints
3. forward that envelope to the local broker runner
4. do not fall back to host-native fetch/install behavior when broker routing should decide

## Decline Contract

- If the broker returns \`UNSUPPORTED_REQUEST\`, continue normally.
- If the broker returns \`AMBIGUOUS_REQUEST\`, ask a clarifying question.
- If the broker returns \`NO_CANDIDATE\`, offer capability discovery or install help.
- If the broker returns \`PREPARE_FAILED\`, explain the failure clearly and do not silently substitute a native tool path.

## Quick Command

\`\`\`bash
${join(installDirectory, "bin", RUNNER_FILE_NAME)} '{"requestText":"turn this webpage into markdown: https://example.com/article","host":"codex","invocationMode":"explicit","urls":["https://example.com/article"]}'
\`\`\`
`;
}

function buildRunnerScript(brokerHomeDirectory: string): string {
  return `#!/usr/bin/env bash
set -euo pipefail

BROKER_INPUT="\${1:-}"

if [[ -z "\${BROKER_INPUT}" ]]; then
  echo "usage: $0 '<broker-envelope-json>'" >&2
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
