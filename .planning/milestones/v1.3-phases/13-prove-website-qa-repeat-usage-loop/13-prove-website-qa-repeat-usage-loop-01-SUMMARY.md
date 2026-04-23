---
phase: 13-prove-website-qa-repeat-usage-loop
plan: 01
subsystem: qa-repeat-usage-proof-loop
tags: [website-qa, acquisition-memory, reuse, cross-host]
requires:
  - phase: 12-harden-website-qa-broker-first-hit-rate
    plan: 02
    provides: stable website QA routing and doctor evidence surface
provides:
  - Canonical website QA install / verify / reuse / repeat-usage proof on the three-host surface
  - Acquisition-memory assertions for successful routes, first reuse, and verified hosts
  - Regression coverage proving QA-first is not a one-time install demo
affects: [phase-13, integration, proof-loop, acquisition-memory]
tech-stack:
  added: []
  patterns: [three-host-repeat-usage-proof, mcp-bundle-proof-loop, acquisition-memory-proof-assert]
key-files:
  created:
    - .planning/milestones/v1.3-phases/13-prove-website-qa-repeat-usage-loop/13-prove-website-qa-repeat-usage-loop-01-SUMMARY.md
  modified:
    - tests/integration/broker-flow.test.ts
key-decisions:
  - "website QA canonical proof 继续走 shared-home surface，而不是为 repeat usage 单独发明新的 fixture rail。"
  - "proof loop 用三宿主 `claude-code -> codex -> opencode` 串起来，证明 install 后不止成功一次。"
  - "repeat usage 的核心证据继续来自 acquisition memory：`successfulRoutes`、`firstReuseAt` 与 `verifiedHosts`。"
patterns-established:
  - "当要证明默认入口不是一次性 demo 时，优先在 integration proof 里断言 acquisition memory 和 persisted traces，而不是只看 handoff 成功。"
requirements-completed: [REUSE-01, REUSE-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 13 Plan 01 Summary

**Phase 13 的第一部分把 website QA 的 canonical proof loop 从“install 后成功一次”推进到了“install 后还能在其他宿主继续成功”。integration proof 现在明确覆盖三宿主 shared-home surface，并直接断言 acquisition memory 里的 repeat-usage 证据。**

## Accomplishments

- `tests/integration/broker-flow.test.ts` 的 website QA MCP proof 现在覆盖 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse -> repeat usage`。
- proof loop 在 `claude-code` 首次 verify 后，又在 `codex` 和 `opencode` 上重复成功，证明 shared-home reuse 不是一次性 smoke。
- integration assert 现在直接检查 acquisition memory 的 `successfulRoutes: 3`、`firstReuseAt` 与三宿主 `verifiedHosts`，而不是只看 handoff 成功。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/integration/broker-flow.test.ts`

## Deviations

- `tests/e2e/shared-home-smoke.test.ts` 本轮只做回归验证，没有新增 website QA 专属断言；当前 canonical loop 主要锁在 integration + doctor / CLI surface 上。

## Next Readiness

- canonical repeat-usage proof 已经存在，下一步要把这条 loop 的语义拆清楚，让 `doctor` 能区分 repeat usage 与 cross-host reuse。
