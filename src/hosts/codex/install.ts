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
const DEFAULT_VERSION = "0.1.6";
const HOST_SHELL_NAME = "skills-broker";

function buildSkillMarkdown(installDirectory: string): string {
  return `---
name: "${HOST_SHELL_NAME}"
description: "Route capability requests through skills-broker. Use when the user wants a reusable skill, MCP, or workflow such as webpage-to-markdown, social-post-to-markdown, requirements analysis, website QA, investigation, or explicit capability discovery/install, including phrases like '测下这个网站的质量', '检查这个网站质量', 'QA 这个网站', 'QA this website', and 'check this website quality'. Do not use for ordinary chat, coding, or summarization."
---

# Skills Broker

Use this skill only for capability requests, such as:

- converting web content to markdown
- converting a social post to markdown
- analyzing a requirement and producing a design doc
- QA or quality-checking a website
- explicitly finding or installing a skill or MCP

QA trigger examples include:

- "测下这个网站的质量"
- "检查这个网站质量"
- "QA 这个网站"
- "QA this website"
- "check this website quality"

When this skill is loaded:

1. preserve the user's original wording
2. decide whether the user is asking for a reusable capability instead of ordinary chat
3. build a broker envelope with raw request text plus safe hints
4. when confident, include a structured \`capabilityQuery\` describing the job, targets, and output artifacts
5. forward that envelope to the local broker runner
6. do not fall back to host-native fetch/install behavior when broker routing should decide

## Capability Query Contract

When you can confidently normalize the request, include a structured \`capabilityQuery\`.

Use this shape:

\`\`\`json
{
  "kind": "capability_request",
  "goal": "qa a website",
  "host": "codex",
  "requestText": "QA 这个网站",
  "jobFamilies": ["quality_assurance"],
  "targets": [
    { "type": "website", "value": "https://example.com" }
  ],
  "artifacts": ["qa_report"]
}
\`\`\`

If you are not confident, omit \`capabilityQuery\` and still send the raw envelope.

## Decline Contract

- If the broker returns \`UNSUPPORTED_REQUEST\`, continue normally.
- If the broker returns \`AMBIGUOUS_REQUEST\`, ask a clarifying question.
- If the broker returns \`NO_CANDIDATE\`, offer capability discovery or install help.
- If the broker returns \`PREPARE_FAILED\`, explain the failure clearly and do not silently substitute a native tool path.

## Quick Command

\`\`\`bash
${join(installDirectory, "bin", RUNNER_FILE_NAME)} '{"requestText":"turn this webpage into markdown: https://example.com/article","host":"codex","invocationMode":"explicit","urls":["https://example.com/article"]}'
\`\`\`

\`\`\`bash
${join(installDirectory, "bin", RUNNER_FILE_NAME)} --debug '{"requestText":"QA this website","host":"codex","invocationMode":"explicit","urls":["https://example.com"]}'
\`\`\`

\`\`\`bash
${join(installDirectory, "bin", RUNNER_FILE_NAME)} '{"requestText":"QA 这个网站","host":"codex","invocationMode":"explicit","capabilityQuery":{"kind":"capability_request","goal":"qa a website","host":"codex","requestText":"QA 这个网站","jobFamilies":["quality_assurance"],"targets":[{"type":"website","value":"https://example.com"}],"artifacts":["qa_report"]}}'
\`\`\`
`;
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
