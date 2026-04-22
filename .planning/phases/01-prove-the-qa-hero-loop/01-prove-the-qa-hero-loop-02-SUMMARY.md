---
phase: 01-prove-the-qa-hero-loop
plan: 02
subsystem: routing
tags: [query-compiler, website-qa, eval-harness, precision-first]
requires: []
provides:
  - Precision-first website QA normalization boundary
  - Negative cases blocking page/link ambiguity from entering QA lane
  - Phase 1 miss-layer eval fixture with deterministic retrieval coverage
affects: [phase-01-proof-loop, phase-02-family-proofs]
tech-stack:
  added: []
  patterns: [explicit-qa-plus-website-target, dedicated-install-required-fixture]
key-files:
  created: []
  modified:
    - src/broker/query-compiler.ts
    - tests/core/request-normalization.test.ts
    - tests/e2e/phase1-website-qa-eval.test.ts
    - tests/fixtures/phase1-website-qa-eval.json
key-decisions:
  - "把 QA lane 的 website target 判断从 page/url 模糊词收紧到 website/site 明确信号或显式 URL。"
  - "retrieval eval 不复用仓库默认 catalog，而是注入专用 available-but-not-installed website QA catalog。"
patterns-established:
  - "Precision-first routing: 只有显式 QA 意图加 website target 才进入 quality_assurance。"
  - "Layered eval fixtures: host_selection / broker_normalization / retrieval / prepare 各层都用固定夹具证明。"
requirements-completed: [ROUTE-01]
duration: 1h
completed: 2026-04-22
---

# Phase 1 Plan 02 Summary

**website QA 现在只接受显式 QA + website target，请求 miss 也能在 Phase 1 eval harness 中被稳定归因到四层 routing layer**

## Accomplishments

- `query-compiler` 不再把 `check this page`、`QA 这个页面` 之类模糊请求误吞进 QA lane。
- `request-normalization` 增加中英负例，保护 markdown / requirements / investigation 既有 lane 不回归。
- Phase 1 eval harness 通过专用 install-required catalog 明确证明 retrieval miss 会返回 `INSTALL_REQUIRED`，而不是被当前环境的已安装赢家污染成 `HANDOFF_READY`。

## Verification

- `PATH=/Users/monkeyin/.nvm/versions/node/v25.0.0/bin:$PATH npm test -- --run tests/core/request-normalization.test.ts tests/e2e/phase1-website-qa-eval.test.ts`

## Deviations

- 原计划默认 retrieval 夹具会被仓库 seed catalog 的已安装赢家污染。执行时改为在 eval harness 内写入专用 `website_qa_install_required` catalog，保持证明面 deterministic。

## Next Readiness

- ROUTE-01 的 normalization 与 retrieval 证据已经稳定，可继续在 doctor / cross-host proof 中复用同一条 QA lane。
