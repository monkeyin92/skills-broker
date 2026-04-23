---
phase: 10-ship-repo-owned-proof-promotion
plan: 01
subsystem: eligible-proof-promotion
tags: [release, promotion, status-board]
requires:
  - phase: 09-lock-release-gate-verdicts
    plan: 01
    provides: canonical repo-owned release truth surface
provides:
  - Explicit `release:promote` command
  - Eligible-only shipped-local -> shipped-remote rewrite
  - Repo-local npm script surface for proof promotion
affects: [phase-10, release-truth, status-board]
tech-stack:
  added: []
  patterns: [eligible-only-promotion, canonical-status-rewrite, repo-owned-shipped-truth]
key-files:
  created:
    - .planning/milestones/v1.2-phases/10-ship-repo-owned-proof-promotion/10-ship-repo-owned-proof-promotion-01-SUMMARY.md
  modified:
    - src/dev/release-truth.ts
    - package.json
    - tests/dev/release-truth.test.ts
key-decisions:
  - "`release:promote` 只升级 declared=shipped_local 且 evaluated=shipped_remote 的 item。"
  - "写回直接修改 canonical `STATUS.md` JSON block，而不是维护另一份 promotion ledger。"
  - "promotion surface 和 gate surface 继续共用 `src/dev/release-truth.ts`，保持 repo-owned release truth 集中。"
patterns-established:
  - "当 canonical status board 已存在 shipped_local / shipped_remote 语义时，promotion 应该只是显式升级动作，而不是第二套真相来源。"
requirements-completed: [PROOF-01]
duration: 1 session
completed: 2026-04-23
---

# Phase 10 Plan 01 Summary

**Phase 10 先把 shipped-proof promotion 从“手工补 STATUS”升级成了显式命令。现在 maintainer 可以运行 `npm run release:promote`，让 canonical `STATUS.md` 只升级 truly eligible 的 `shipped_local` 项。**

## Accomplishments

- `src/dev/release-truth.ts` 新增 `promote` 子命令。
- `package.json` 新增 `release:promote`。
- promotion 成功时会原子写回 canonical `STATUS.md` block，把 eligible item 改成 `shipped_remote`。
- `tests/dev/release-truth.test.ts` 新增真实 git repo fixture coverage，锁住 successful promotion rewrite。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/release-truth.mjs promote --json`

## Deviations

- 没有新建独立 `status-promotion.ts` 模块。当前阶段优先让 repo-owned release truth 保持在一个文件里，便于 ship/publish workflow 直接消费。

## Next Readiness

- promotion command 已可升级 eligible truth，下一步只需要把 fail-closed blocking taxonomy 与 repo wording 完整收口。
