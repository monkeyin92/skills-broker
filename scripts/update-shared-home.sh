#!/usr/bin/env bash
set -euo pipefail

BROKER_HOME_DIR="${1:-}"
CLAUDE_SHELL_DIR="${2:-}"
CODEX_SHELL_DIR="${3:-}"

if [[ -z "${BROKER_HOME_DIR}" ]]; then
  echo "usage: $0 <broker-home-directory> [claude-shell-directory] [codex-shell-directory]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

npm run build >/dev/null

BROKER_HOME_DIR="${BROKER_HOME_DIR}" \
CLAUDE_SHELL_DIR="${CLAUDE_SHELL_DIR}" \
CODEX_SHELL_DIR="${CODEX_SHELL_DIR}" \
PROJECT_ROOT="${PROJECT_ROOT}" \
node --input-type=module <<'EOF'
import { updateSharedBrokerHome } from "./dist/shared-home/update.js";

await updateSharedBrokerHome({
  brokerHomeDirectory: process.env.BROKER_HOME_DIR,
  claudeCodeInstallDirectory: process.env.CLAUDE_SHELL_DIR || undefined,
  codexInstallDirectory: process.env.CODEX_SHELL_DIR || undefined,
  projectRoot: process.env.PROJECT_ROOT
});
EOF
