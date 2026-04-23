---
phase: 09-lock-release-gate-verdicts
plan: 02
subsystem: release-gate-diagnostics
tags: [release, diagnostics, docs, shipping-ref]
requires:
  - phase: 09-lock-release-gate-verdicts
    plan: 01
    provides: canonical repo-owned release gate command
provides:
  - Shipping-ref and remote-freshness diagnostics in release verdicts
  - Repo docs that distinguish repo-local release truth from published lifecycle commands
affects: [phase-9, release-truth, docs]
tech-stack:
  added: []
  patterns: [shipping-ref-surfacing, remote-freshness-diagnostics, repo-local-release-wording]
key-files:
  created:
    - .planning/milestones/v1.2-phases/09-lock-release-gate-verdicts/09-lock-release-gate-verdicts-02-SUMMARY.md
  modified:
    - src/dev/release-truth.ts
    - README.md
    - README.zh-CN.md
    - tests/dev/release-truth.test.ts
key-decisions:
  - "release verdict JSON 必须一次给全：failing rail、shipping ref、remote freshness、strict doctor summary。"
  - "strict doctor rail 改为复用 `--import ./scripts/register-ts-node.mjs`，避免额外 loader 依赖分叉。"
  - "README 双语明确 `release:gate` / `release:promote` 是 repo-local shipping truth，不是 published lifecycle CLI 的新子命令。"
patterns-established:
  - "automation 想读 release truth 时，diagnostics 应直接跟 verdict 一起给出，而不是把 maintainer 扔回原始 workflow log。"
requirements-completed: [REL-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 9 Plan 02 Summary

**Phase 9 后半段把 release gate 从“能跑”推进到了“能解释”。现在 JSON verdict 会直接给出 failing rail、shipping ref、remote freshness 和 strict doctor 摘要；README 双语也把 repo-local release truth 与 published lifecycle commands 的边界讲清楚了。**

## Accomplishments

- `release:gate` JSON 输出现在显式暴露 `shippingRef` 与 `remoteFreshness`。
- strict doctor rail 失败时，verdict 仍然保留 enough diagnostics，让 maintainer 直接看到 strict issue summary、adoption health、website QA verdict。
- `README.md` 与 `README.zh-CN.md` 已新增 repo-local shipping truth 说明：
  - 发布前运行 `release:gate`
  - shipping ref 包含 `HEAD` 后运行 `release:promote`
  - published lifecycle CLI 仍然保持 `update / doctor / remove`

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts`
- `rg -n "release:gate|release:promote|shippingRef|remoteFreshness" README.md README.zh-CN.md src/dev/release-truth.ts tests/dev/release-truth.test.ts`

## Deviations

- 没有为 release gate 额外引入 HTML summary 或 richer UI；当前阶段优先保证 repo-owned contract 可读、可机读。

## Next Readiness

- shipping ref / remote freshness 已可被 automation 直接消费，proof promotion 可以沿同一 release truth surface 继续扩展。
