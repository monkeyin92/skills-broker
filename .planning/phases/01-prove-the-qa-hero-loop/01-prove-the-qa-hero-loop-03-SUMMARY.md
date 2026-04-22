---
phase: 01-prove-the-qa-hero-loop
plan: 03
subsystem: lifecycle
tags: [doctor, strict-gate, website-qa, cross-host-reuse]
requires: []
provides:
  - Verdict-first doctor text surface for website QA
  - Strict gate behavior tied to website QA proof health
  - End-to-end same-request QA reuse proof across Claude Code and Codex
affects: [phase-02-family-proofs, phase-03-runtime-hardening]
tech-stack:
  added: []
  patterns: [websiteqa-top-level-truth, fail-closed-proof-rails]
key-files:
  created: []
  modified:
    - src/shared-home/format.ts
    - tests/shared-home/doctor.test.ts
key-decisions:
  - "沿用 brownfield 已有 `websiteQaLoop` / strict gate 结构，不在 Phase 1 重开 familyProofs 泛化。"
  - "doctor 文本输出先暴露 website QA verdict 和 next action，再展示 routing / proof drill-down。"
patterns-established:
  - "Verdict-first doctor: operator 先看到 `blocked` / `in_progress` / `proven`，再看细节。"
  - "Proof rails fail closed: acquisition memory 或 downstream manifests unreadable 时，website QA verdict 直接变 blocked。"
requirements-completed: [ROUTE-01, ROUTE-02, ROUTE-03]
duration: 1h
completed: 2026-04-22
---

# Phase 1 Plan 03 Summary

**doctor 文本输出现在先讲 website QA verdict 和 next action，且 same-request QA loop 的 INSTALL_REQUIRED -> HANDOFF_READY -> cross-host reuse 证明继续保持全绿**

## Accomplishments

- `formatLifecycleResult()` 在 doctor 文本输出顶部新增 `Website QA verdict` 与 `Website QA next action`，把 operator surface 调整为 verdict-first。
- shared-home doctor tests 现在明确覆盖 `in_progress` 与 `blocked` verdict headline，证明 unreadable proof rails 会 fail closed。
- Phase 1 既有的 integration / CLI / doctor proof 继续通过，说明 same-request QA loop、strict gate 与 cross-host reuse 仍然成立。

## Verification

- `PATH=/Users/monkeyin/.nvm/versions/node/v25.0.0/bin:$PATH npm test -- --run tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts tests/integration/broker-flow.test.ts`

## Deviations

- brownfield 基线已经具备 `websiteQaLoop`、strict gate 和跨宿主 QA proof。执行重点转为把文本 surface 收紧成 verdict-first，并在本机 Node 环境下重新验证整条证据链。

## Next Readiness

- Phase 1 的 doctor / strict gate / reuse proof 已经对齐，可在 Phase 2 基于此推广到其他 proven family，而不重开默认入口语义。
