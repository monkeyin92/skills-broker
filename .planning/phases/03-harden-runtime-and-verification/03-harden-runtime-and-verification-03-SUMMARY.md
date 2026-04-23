---
phase: 03-harden-runtime-and-verification
plan: 03
subsystem: shared-home
tags: [manual-recovery, rollback, fail-closed, lifecycle-cli, peer-surface]
requires: [02]
provides:
  - Executable fail-closed coverage for append-fails plus rollback-fails peer-surface repair branch
  - Lifecycle output that exposes `markerId`, `failurePhase=rollback`, `rollbackStatus=failed`, and clear command truth
  - Rollback blockers that force overall lifecycle status to `failed` instead of `degraded_success`
affects: [03-04, phase-04-operator-truth]
tech-stack:
  added: []
  patterns: [rollback-fail-closed, marker-first-recovery-truth, lifecycle-manual-recovery-blocker]
key-files:
  created: []
  modified:
    - src/shared-home/update.ts
    - src/shared-home/format.ts
    - tests/shared-home/update-lifecycle.test.ts
    - tests/cli/lifecycle-cli.test.ts
key-decisions:
  - "只要 manual recovery marker 代表 rollback closure 失败，整次 lifecycle result 就必须 fail closed。"
  - "append 失败后 rollback 也失败的分支，marker 必须记录 `failurePhase=rollback`，而不是继续记成 `append`。"
  - "operator text output 必须直接展示 `markerId`、`failurePhase`、`rollbackStatus` 和 clear command。"
patterns-established:
  - "Rollback blocker dominates status: 共享 home 或其他 host 成功，不能掩盖 rollback manual recovery blocker。"
  - "Manual recovery output is a contract: CLI 文本输出必须能直接指导 `--clear-manual-recovery`。"
requirements-completed: [HARD-02]
duration: 1 session
completed: 2026-04-22
---

# Phase 3 Plan 03 Summary

**shared-home repair 现在把 append 失败且 rollback 也失败的最高 blast-radius 分支真正收口成 fail-closed contract，并在 lifecycle 输出里明确暴露 rollback manual recovery truth**

## Accomplishments

- `src/shared-home/update.ts` 现在会把 rollback manual recovery blocker 直接抬成整体 `failed`，并在 marker / warning 里显式写出 `rollback failed during repair`。
- 先前 skipped 的 `tests/shared-home/update-lifecycle.test.ts` 场景已经 unskip，并锁住 append-fails + rollback-fails 会留下可恢复 marker、failed peers 与 ledger evidence。
- `src/shared-home/format.ts` 与 `tests/cli/lifecycle-cli.test.ts` 现在把 `markerId`、`failurePhase=rollback`、`rollbackStatus=failed`、clear command 一起展示给 operator。

## Verification

- `npm_execpath=/tmp/skills-broker-npm-shim.mjs /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/shared-home/update-lifecycle.test.ts tests/cli/lifecycle-cli.test.ts`

## Deviations

- 当前 worktree 已有无关修改与未跟踪文件，因此没有为本 plan 单独 commit；Phase 3 收尾文档统一记录这个 deviation。
- 验证继续使用 workspace runtime Node，而不是 Codex app 内置 Node，以规避本地 Rollup native addon 兼容性问题。

## Next Readiness

- shared-home 的最高风险 rollback/manual-recovery 分支已经被 CI 级测试锁住，Phase 4 可以把重点转向多文档 operator truth 与扩展 readiness，而不用继续背着 skipped recovery debt。
