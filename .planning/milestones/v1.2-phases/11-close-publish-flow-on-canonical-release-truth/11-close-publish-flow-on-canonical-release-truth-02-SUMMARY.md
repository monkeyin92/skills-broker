---
phase: 11-close-publish-flow-on-canonical-release-truth
plan: 02
subsystem: release-wording-alignment
tags: [publish, docs, status, todos]
requires:
  - phase: 11-close-publish-flow-on-canonical-release-truth
    plan: 01
    provides: publish workflow wired to canonical release truth
provides:
  - README / README.zh-CN wording aligned with repo-local release truth
  - STATUS / TODOS truth updated for v1.2 shipping closure
  - Single operator story for published lifecycle vs repo-local release flow
affects: [phase-11, docs, status, todos]
tech-stack:
  added: []
  patterns: [operator-story-alignment, repo-truth-forwarding]
key-files:
  created:
    - .planning/milestones/v1.2-phases/11-close-publish-flow-on-canonical-release-truth/11-close-publish-flow-on-canonical-release-truth-02-SUMMARY.md
  modified:
    - README.md
    - README.zh-CN.md
    - STATUS.md
    - TODOS.md
key-decisions:
  - "published lifecycle commands 继续固定为 `update / doctor / remove`；`release:gate` / `release:promote` 明确定位为 repo-local shipping truth helpers。"
  - "STATUS human summary、canonical board、TODOS current focus / completed entries 一起更新，避免 repo surfaces 对 v1.2 讲不同故事。"
patterns-established:
  - "只要 operator wording 跨多个 surface 出现，就必须同步收口 README / README.zh-CN / STATUS / TODOS。"
requirements-completed: [SHIP-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 11 Plan 02 Summary

**Phase 11 的后半段把 release-facing wording 收成了一条 operator story。README 双语、STATUS、TODOS 现在都承认：published lifecycle CLI 仍然是 shared-home maintenance，而 repo-local release truth 由 `release:gate` / `release:promote` 负责。**

## Accomplishments

- `README.md` 与 `README.zh-CN.md` 现在明确解释 repo-local shipping truth commands 的职责边界。
- `STATUS.md` human summary 与 canonical board 现在记录了 v1.2 的 release gate / proof promotion / publish closure packets。
- `TODOS.md` 已从“要把 CI trust rails 变成 release truth”前推到“v1.2 已交付，下一 milestone 待定义”。

## Verification

- `rg -n "release:gate|release:promote|publish flow|canonical release truth" README.md README.zh-CN.md STATUS.md TODOS.md`

## Deviations

- 没有尝试在本轮就定义下一 milestone 的新 scope；当前只收口 v1.2 交付后的 repo truth。

## Next Readiness

- v1.2 的 phase-level artifacts 与 operator wording 已全部齐备，milestone 可以进入 audit / archive / cleanup。
