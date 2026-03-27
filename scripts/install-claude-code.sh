#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-}"

if [[ -z "${INSTALL_DIR}" ]]; then
  echo "usage: $0 <install-directory>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

npm run build >/dev/null

INSTALL_DIR="${INSTALL_DIR}" PROJECT_ROOT="${PROJECT_ROOT}" node --input-type=module <<'EOF'
import { installClaudeCodePlugin } from "./dist/hosts/claude-code/install.js";

await installClaudeCodePlugin({
  installDirectory: process.env.INSTALL_DIR,
  projectRoot: process.env.PROJECT_ROOT
});
EOF
