---
phase: 05-ship-the-opencode-thin-host-shell
plan: 04
subsystem: operator-truth
tags: [opencode, operator-truth, docs, status, parity]
requires:
  - phase: 05-ship-the-opencode-thin-host-shell
    provides: Three-host shared-home attach/no-regression smoke
provides:
  - Canonical three-host supported truth after OpenCode shipping
  - Explicit Phase 6 lifecycle/proof parity caveat across docs and status surfaces
  - Package metadata and installed-shell truth parity for the shipped third host
affects: [phase-completion, release-readiness, docs]
tech-stack:
  added: []
  patterns: [typed-operator-truth-caveat, three-host-doc-parity]
key-files:
  created:
    - .planning/phases/05-ship-the-opencode-thin-host-shell/05-ship-the-opencode-thin-host-shell-04-SUMMARY.md
  modified:
    - src/core/operator-truth.ts
    - tests/shared-home/operator-truth-parity.test.ts
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
    - package.json
key-decisions:
  - "一旦 OpenCode 的真实 attach/shipping path 成立，support matrix 必须立即翻成 supported，而不是继续停留在 deferred 叙事。"
  - "support flip 只覆盖 shipped thin host shell truth；完整 lifecycle / proof parity 继续明确留在 Phase 6。"
  - "README 双语、STATUS、TODOS、package metadata 与 installed-shell copy 必须围绕同一份 typed operator truth contract 说话。"
patterns-established:
  - "Operator-facing truth should be generated from one typed contract, then proven by parity tests across docs/status surfaces."
  - "A newly shipped host can be marked supported before full parity, but only with an explicit next-phase caveat."
requirements-completed: [HOST-01]
duration: 1 session
completed: 2026-04-23
---

# Phase 5 Plan 04 Summary

**OpenCode 已从 deferred readiness 翻成真正的第三支持宿主：三宿主 support matrix、Phase 6 caveat、README/STATUS/TODOS/package metadata 现在都与真实 shipping 状态一致**

## Accomplishments

- `src/core/operator-truth.ts` 现在把 canonical truth 固定为 `supportedHosts: ["Claude Code", "Codex", "OpenCode"]`，并用单一 helper 明确表达 “Phase 5 已 ship thin host shell，Phase 6 继续补 lifecycle / proof parity”。
- `tests/shared-home/operator-truth-parity.test.ts` 改成围绕三宿主 support matrix 与 Phase 6 caveat 做 fail-closed parity proof，不再要求旧的 deferred-host 文案。
- `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md`、`package.json` 已同步到三宿主 truth；OpenCode 不再被描述成“待支持第三宿主”，但也没有被提前写成 full parity done。

## Verification

- `rg -n 'Claude Code, Codex, OpenCode|现在支持：Claude Code、Codex、OpenCode|Phase 6|lifecycle / proof parity|OpenCode' src/core/operator-truth.ts README.md README.zh-CN.md TODOS.md STATUS.md package.json tests/shared-home/operator-truth-parity.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/hosts/host-shell-install.test.ts tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`

## Deviations

- 本次没有新增功能范围，只是把剩余的双宿主/未发货文案翻到当前真实状态，并补齐相关 parity proof。
- 当前 worktree 仍有既存未跟踪 planning/打包噪音文件，因此本 plan 没有生成原子 commit。

## Next Readiness

- Phase 5 的四个执行 plan 现在都已有 SUMMARY，可进入 phase-level verification。
- Phase 6 可以专注于 OpenCode 的 doctor/remove/adoptionHealth/proof-reuse parity，而不必再处理 “是否已经 support OpenCode” 这类 truth 倒挂问题。
