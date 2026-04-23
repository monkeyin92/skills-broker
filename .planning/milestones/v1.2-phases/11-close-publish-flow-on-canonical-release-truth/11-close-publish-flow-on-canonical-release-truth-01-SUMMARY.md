---
phase: 11-close-publish-flow-on-canonical-release-truth
plan: 01
subsystem: publish-workflow-release-truth-wiring
tags: [publish, workflow, release-truth]
requires:
  - phase: 09-lock-release-gate-verdicts
    plan: 01
    provides: canonical release gate surface
  - phase: 10-ship-repo-owned-proof-promotion
    plan: 01
    provides: explicit proof promotion flow
provides:
  - Pre-publish canonical release gate
  - Post-publish proof promotion and STATUS pushback
  - Publish-workflow closeout on the same release truth
affects: [phase-11, publish, workflow]
tech-stack:
  added: []
  patterns: [prepublish-gate, postpublish-promotion, detached-head-pushback]
key-files:
  created:
    - .planning/milestones/v1.2-phases/11-close-publish-flow-on-canonical-release-truth/11-close-publish-flow-on-canonical-release-truth-01-SUMMARY.md
  modified:
    - .github/workflows/publish-npm.yml
    - tests/dev/release-truth.test.ts
key-decisions:
  - "publish workflow 在 `npm publish` 前先跑 `release:gate`，直接复用 canonical repo truth。"
  - "publish 成功后再跑 `release:promote`，若 `STATUS.md` 有变化则 commit 并 push 回默认分支。"
  - "workflow 最后再次跑 `release:gate` 做 closeout，避免 publish/promotion 之后又分叉出第二套 verifier。"
patterns-established:
  - "publish automation 想表达 shipped truth 时，应先复用 repo-owned gate，再复用 repo-owned promotion，而不是把 release 逻辑写死进 workflow shell。"
requirements-completed: [SHIP-01]
duration: 1 session
completed: 2026-04-23
---

# Phase 11 Plan 01 Summary

**Phase 11 的第一部分把 npm publish automation 真正接到了 canonical release truth 上。workflow 现在不再只是 build/test/publish 三步，而是 pre-publish gate、post-publish promotion、final closeout 全部围绕同一条 repo-owned truth。**

## Accomplishments

- `.github/workflows/publish-npm.yml` 现在在 `npm publish` 之前运行 `npm run release:gate -- --json --ship-ref "origin/${DEFAULT_BRANCH}"`。
- publish 成功后，workflow 会运行 `npm run release:promote -- --json --ship-ref "${ship_ref}"`，并在 `STATUS.md` 发生变化时 commit/push 回默认分支。
- publish workflow 最后再次运行 `release:gate`，用同一条 canonical verdict 做 closeout。
- `tests/dev/release-truth.test.ts` 现在断言 workflow wiring 中确实存在 gate、promotion 与 pushback。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts`
- `rg -n "release:gate|release:promote|git push origin" .github/workflows/publish-npm.yml`

## Deviations

- 没有在 workflow 中额外生成 GitHub summary UI；当前阶段优先保证 truth contract 本身闭环。

## Next Readiness

- publish automation 已经接上 canonical release truth，只差把 repo-facing wording 和 milestone state 完整收口。
