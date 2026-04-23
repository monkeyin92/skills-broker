---
phase: 04-lock-operator-truth-and-expansion-readiness
plan: 01
subsystem: operator-truth
tags: [operator-truth, docs, parity, status, lifecycle]
requires: []
provides:
  - Repo-owned canonical operator truth contract for supported hosts, deferred host, hero lane, second proven family, and published lifecycle commands
  - Cross-surface parity coverage for README, README.zh-CN, TODOS, and STATUS
  - Repo truth wording that now fails closed when support matrix or lifecycle wording drifts
affects: [04-02, 04-03, status-board, repo-docs]
tech-stack:
  added: []
  patterns: [repo-owned-truth-contract, markdown-parity-tests, fail-closed-doc-truth]
key-files:
  created:
    - src/core/operator-truth.ts
    - tests/shared-home/operator-truth-parity.test.ts
  modified:
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
key-decisions:
  - "operator-facing truth 不再继续散落在 README / README.zh-CN / TODOS / STATUS 的手写近似里，而是收口到 `src/core/operator-truth.ts`。"
  - "doc parity proof 读取真实 repo surfaces，而不是只比对 shell grep 或孤立常量。"
  - "published lifecycle wording 统一收口到 `npx skills-broker update`、`npx skills-broker doctor`、`npx skills-broker remove`。"
patterns-established:
  - "One truth, many surfaces: repo docs、status board 和 backlog 都从同一套 canonical operator truth 回读。"
  - "Fail-closed narrative parity: support matrix、hero lane、second proven family、lifecycle wording 漂移会直接红测试。"
requirements-completed: []
duration: 1 session
completed: 2026-04-22
---

# Phase 4 Plan 01 Summary

**仓库现在有了一份 repo-owned canonical operator truth，并且 README / README.zh-CN / TODOS / STATUS 的关键叙事已经被 parity test 锁成 fail-closed contract**

## Accomplishments

- 新增 `src/core/operator-truth.ts`，把 Supported now: Claude Code, Codex、Deferred but planned: OpenCode thin host shell、website QA hero lane、web markdown second proven family，以及 `npx skills-broker update` / `doctor` / `remove` 收成一份可复用 truth contract。
- 新增 `tests/shared-home/operator-truth-parity.test.ts`，直接读取 `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 的真实文本与 canonical status block，锁住 support matrix、hierarchy、lifecycle wording 和 third-host readiness wording。
- `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 现在都显式表达同一套 operator truth，不再混用裸 `skills-broker update` 与不同支持矩阵说法。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`
- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`
- `rg -n "supportedHosts|deferredHosts|heroLane|secondProvenFamily|lifecycleCommands" src/core/operator-truth.ts tests/shared-home/operator-truth-parity.test.ts`

## Deviations

- 当前 worktree 已有大量无关修改与未跟踪文件，因此没有为本 plan 单独生成原子 commit。

## Next Readiness

- canonical operator truth 已经可被 installed host shell 与 third-host readiness spec 直接复用，后续两条 plan 不需要再各自维护独立 support/hierarchy/lifecycle copy。
