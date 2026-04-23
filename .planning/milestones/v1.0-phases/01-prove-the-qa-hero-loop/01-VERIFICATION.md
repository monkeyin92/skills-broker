---
phase: 01-prove-the-qa-hero-loop
status: passed
verified: 2026-04-22
requirements:
  - ENTRY-01
  - ENTRY-02
  - ROUTE-01
  - ROUTE-02
  - ROUTE-03
evidence:
  - 01-prove-the-qa-hero-loop-01-SUMMARY.md
  - 01-prove-the-qa-hero-loop-02-SUMMARY.md
  - 01-prove-the-qa-hero-loop-03-SUMMARY.md
---

# Phase 1 Verification

## Result

`passed`

## Goal Check

Phase goal: 把 `website QA` 从“文案默认入口”推进成“docs、host shell、runtime、doctor 一起证明的产品闭环”。

Verdict: 达成。README / installed shell / routing / doctor / strict gate / cross-host reuse 都有对应代码或测试证据。

## Requirement Traceability

- `ENTRY-01`: 通过 `README.md`、`README.zh-CN.md`、`src/hosts/skill-markdown.ts` 与 smoke tests 证明 website QA 是唯一 first move。
- `ENTRY-02`: Quick Start 与 decline contract 明确展示 `INSTALL_REQUIRED -> install -> rerun -> doctor` 顺序，并由 host-shell tests 锁定。
- `ROUTE-01`: `src/broker/query-compiler.ts` 与 Phase 1 eval harness 证明 explicit QA request 会在 retrieval miss 时返回 `INSTALL_REQUIRED`，模糊 page/link 请求不会误入 QA lane。
- `ROUTE-02`: `tests/integration/broker-flow.test.ts` 证明同一句 website QA 请求在安装后返回 `HANDOFF_READY`。
- `ROUTE-03`: 同一 integration proof 与 doctor/acquisition-memory tests 证明 Claude Code / Codex 会复用同一条 QA lane，并记录 cross-host reuse。

## Automated Verification

- `PATH=/Users/monkeyin/.nvm/versions/node/v25.0.0/bin:$PATH npm test -- --run tests/hosts/host-shell-install.test.ts tests/e2e/claude-code-smoke.test.ts tests/e2e/shared-home-smoke.test.ts tests/core/request-normalization.test.ts tests/e2e/phase1-website-qa-eval.test.ts`
- `PATH=/Users/monkeyin/.nvm/versions/node/v25.0.0/bin:$PATH npm test -- --run tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts tests/integration/broker-flow.test.ts`

## Must-Haves

- website QA 在 docs 与 installed shell 中都是唯一 hero lane: passed
- same-request QA request 先 `INSTALL_REQUIRED` 再 `HANDOFF_READY`: passed
- second host reuse proof exists: passed
- doctor surfaces `blocked` / `in_progress` / `proven` truth via `websiteQaLoop`: passed

## Gaps

无。
