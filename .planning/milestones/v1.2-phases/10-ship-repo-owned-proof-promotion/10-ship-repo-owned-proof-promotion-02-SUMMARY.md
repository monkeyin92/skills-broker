---
phase: 10-ship-repo-owned-proof-promotion
plan: 02
subsystem: promotion-fail-closed-boundary
tags: [release, promotion, fail-closed, status]
requires:
  - phase: 10-ship-repo-owned-proof-promotion
    plan: 01
    provides: explicit release:promote command
provides:
  - Blocking issue classification for proof promotion
  - No-write-on-failure guarantee
  - Test coverage for refresh failure and non-promotion mismatch blockers
affects: [phase-10, release-truth, status-board]
tech-stack:
  added: []
  patterns: [blocking-issue-filtering, no-partial-rewrite, repo-proof-fail-closed]
key-files:
  created:
    - .planning/milestones/v1.2-phases/10-ship-repo-owned-proof-promotion/10-ship-repo-owned-proof-promotion-02-SUMMARY.md
  modified:
    - src/dev/release-truth.ts
    - tests/dev/release-truth.test.ts
key-decisions:
  - "ship ref unresolved、remote refresh failed、proof invalid、non-promotion mismatch 一律视为 blocking issue。"
  - "eligible promotion mismatch 自身不视为 blocker；它正是 promotion 要解决的对象。"
  - "只要还有 blocker，`STATUS.md` 就绝不做 partial rewrite。"
patterns-established:
  - "repo-owned promotion flow 应复用 strict doctor/status issue taxonomy，而不是自造一套不兼容的 failure vocabulary。"
requirements-completed: [PROOF-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 10 Plan 02 Summary

**Phase 10 的第二部分把 proof promotion 做成了真正的 fail-closed contract。remote refresh 失败、non-promotion mismatch、proof invalid 或 ship ref 解析问题，都会阻止写回。**

## Accomplishments

- `release:promote` 现在会复用 `evaluateStatusBoard()` 的 issue taxonomy，并过滤出真正 blocking 的 issue。
- eligible 的 `shipped_local -> shipped_remote` mismatch 会被识别成 promotion 目标，而不是 blocker。
- 只要还有 blocker，`STATUS.md` 保持原样。
- `tests/dev/release-truth.test.ts` 新增：
  - remote refresh failure 不写文件
  - non-promotion mismatch 不写文件

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/release-truth.mjs promote --json`

## Deviations

- 没有在 promotion flow 里自动修 proof 或猜 ship ref fallback 以外的策略。当前阶段优先 fail closed。

## Next Readiness

- fail-closed promotion flow 已经可供 publish automation 直接调用，只差把 workflow 与 repo wording 接上。
