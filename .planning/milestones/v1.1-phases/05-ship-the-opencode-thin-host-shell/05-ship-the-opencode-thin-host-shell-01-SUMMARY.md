---
phase: 05-ship-the-opencode-thin-host-shell
plan: 01
subsystem: host-lifecycle
tags: [opencode, lifecycle, cli, paths, envelope]
requires: []
provides:
  - Canonical third-host identity `opencode` across runtime envelope and CLI validation
  - Published lifecycle CLI support for `--opencode-dir`
  - Shared-home path detection that supports both `~/.config/opencode` and `~/.opencode`
affects: [05-02, 05-03, 05-04, shared-home]
tech-stack:
  added: []
  patterns: [canonical-host-truth, dual-root-detection, fail-closed-cli-flags]
key-files:
  created:
    - .planning/phases/05-ship-the-opencode-thin-host-shell/05-ship-the-opencode-thin-host-shell-01-SUMMARY.md
  modified:
    - src/core/types.ts
    - src/shared-home/paths.ts
    - src/shared-home/update.ts
    - src/shared-home/remove.ts
    - src/shared-home/doctor.ts
    - src/bin/skills-broker.ts
    - tests/core/envelope.test.ts
    - tests/cli/cli-contract.test.ts
    - tests/shared-home/update-lifecycle.test.ts
key-decisions:
  - "OpenCode 的 canonical host id 固定为 `opencode`，不接受 `open-code` 之类别名。"
  - "published lifecycle CLI 在 Phase 5 就暴露 `--opencode-dir`，但 attach/install 真实壳体继续留到 05-02。"
  - "默认 root detection 同时兼容 `~/.config/opencode` 与 `~/.opencode`，但 install subpath 统一固定为 `<root>/skills/skills-broker`。"
patterns-established:
  - "Typed host truth first: host enum、CLI flag、path resolution 先统一，再接真实宿主壳。"
  - "Fail-closed third-host detection: 未检测到默认 OpenCode root 时必须显式提示 `--opencode-dir`。"
requirements-completed: [HOST-01]
duration: 1 session
completed: 2026-04-23
---

# Phase 5 Plan 01 Summary

**OpenCode 现在已经进入 canonical host/CLI/path contract：`opencode` 成为唯一第三宿主 id，lifecycle CLI 新增 `--opencode-dir`，shared-home path detection 同时支持 `~/.config/opencode` 和 `~/.opencode`**

## Accomplishments

- `src/core/types.ts` 把 `BROKER_HOSTS` 扩成 `claude-code | codex | opencode`，并新增 OpenCode 的 support spec 与 `--opencode-dir` truth。
- `src/shared-home/paths.ts` 新增 `opencodeDirOverride` / `opencodeInstallDirectory` / `opencode` target，并锁定双根目录 detection 与固定 install subpath。
- `src/bin/skills-broker.ts`、`src/shared-home/{update,remove,doctor}.ts` 贯通了 `--opencode-dir` option surface，避免第三宿主 path contract 停在 parser 入口。
- `tests/core/envelope.test.ts`、`tests/cli/cli-contract.test.ts`、`tests/shared-home/update-lifecycle.test.ts` 新增或更新了 OpenCode canonical host acceptance、alias rejection、CLI currentHost proof、dual-root detection proof。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/core/envelope.test.ts tests/cli/cli-contract.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/update-lifecycle.test.ts -t "shared-home lifecycle paths"`
- `rg -n '"opencode"|--opencode-dir|opencodeInstallDirectory|\\.config", "opencode"|\\.opencode' src/core/types.ts src/core/envelope.ts src/cli.ts src/shared-home/paths.ts tests/core/envelope.test.ts tests/cli/cli-contract.test.ts tests/shared-home/update-lifecycle.test.ts`

## Deviations

- 为了让 Vitest 能在当前 Codex.app Node 环境里启动，本地 `node_modules` 临时切换到了 Rollup 的 WASM fallback；仓库源码没有为此引入产品级实现分叉。
- 当前 worktree 仍有既存未跟踪 planning/噪音文件，因此本 plan 没有生成原子 commit。

## Next Readiness

- Phase 5 后续可以直接在 `src/hosts/opencode/*` 上实现真实 thin shell installer/adapter，不需要再额外定义 host id、CLI flag 或 install root contract。
- `update/remove/doctor` 已经具备接收 OpenCode install path 的 plumbing，05-02 只需补真实 attach/install/doctor truth，而不是重构 lifecycle 入口。
