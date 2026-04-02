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
NODE_BIN="$(command -v node)"
NPM_CLI="${npm_execpath:-$(dirname "$(dirname "${NODE_BIN}")")/lib/node_modules/npm/bin/npm-cli.js}"

cd "${PROJECT_ROOT}"

"${NODE_BIN}" "${NPM_CLI}" run build >/dev/null

ARGS=(
  node "${PROJECT_ROOT}/dist/bin/skills-broker.js"
  update
  --broker-home "${BROKER_HOME_DIR}"
)

if [[ -n "${CLAUDE_SHELL_DIR}" ]]; then
  ARGS+=(--claude-dir "${CLAUDE_SHELL_DIR}")
fi

if [[ -n "${CODEX_SHELL_DIR}" ]]; then
  ARGS+=(--codex-dir "${CODEX_SHELL_DIR}")
fi

"${ARGS[@]}"
