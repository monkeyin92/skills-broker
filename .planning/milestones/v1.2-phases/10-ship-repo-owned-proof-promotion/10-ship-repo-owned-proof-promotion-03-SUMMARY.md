---
phase: 10-ship-repo-owned-proof-promotion
plan: 03
subsystem: proof-promotion-wording-and-status-truth
tags: [release, docs, status, shipped-truth]
requires:
  - phase: 10-ship-repo-owned-proof-promotion
    plan: 01
    provides: explicit proof promotion flow
  - phase: 10-ship-repo-owned-proof-promotion
    plan: 02
    provides: fail-closed promotion behavior
provides:
  - README wording for repo-local release truth
  - STATUS board entries for v1.2 release truth packets
  - Repo-native status/todo truth that mentions proof promotion explicitly
affects: [phase-10, docs, status-board]
tech-stack:
  added: []
  patterns: [repo-owned-release-wording, canonical-status-forwarding]
key-files:
  created:
    - .planning/milestones/v1.2-phases/10-ship-repo-owned-proof-promotion/10-ship-repo-owned-proof-promotion-03-SUMMARY.md
  modified:
    - README.md
    - README.zh-CN.md
    - STATUS.md
key-decisions:
  - "README 双语直接把 `release:gate` / `release:promote` 讲成 repo-local shipping truth，而不是 published lifecycle CLI 新子命令。"
  - "STATUS human summary 与 canonical board 同时记录 v1.2 release truth packets，保持 repo-native truth 可追溯。"
patterns-established:
  - "当 release truth 从 CI rail 收口成 repo-owned flow 时，repo docs 和 status board 也必须同步从“未来要做”前推到“已经存在的 contract”。"
requirements-completed: [PROOF-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 10 Plan 03 Summary

**Phase 10 最后把 proof promotion 从内部实现前推到了 repo truth 表层。README 双语、STATUS human summary 与 canonical board 现在都认识 `release:gate` / `release:promote` 这套 repo-local shipping truth contract。**

## Accomplishments

- `README.md` 与 `README.zh-CN.md` 明确说明：
  - 发布前运行 `release:gate`
  - shipping ref 包含 `HEAD` 后运行 `release:promote`
  - 这两条命令不会扩张 published lifecycle CLI
- `STATUS.md` human summary 与 canonical board 现在记录了 Phase 9 / 10 / 11 release truth packets。

## Verification

- `rg -n "release:gate|release:promote|shipped_remote" README.md README.zh-CN.md STATUS.md`

## Deviations

- 没有自动重写 STATUS human summary 的所有历史 bullet，只补了 v1.2 对应 packet 的 canonical story。

## Next Readiness

- repo wording 已经能承载 publish-flow closure，下一步只需把 workflow 本身接到同一套 truth 上。
