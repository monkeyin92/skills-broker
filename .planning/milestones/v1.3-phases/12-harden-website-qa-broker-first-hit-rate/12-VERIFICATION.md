---
phase: 12-harden-website-qa-broker-first-hit-rate
status: passed
verified: 2026-04-23
requirements:
  - ROUTE-01
  - ROUTE-02
  - ROUTE-03
evidence:
  - 12-harden-website-qa-broker-first-hit-rate-01-SUMMARY.md
  - 12-harden-website-qa-broker-first-hit-rate-02-SUMMARY.md
---

# Phase 12 Verification

## Result

`passed`

## Goal Check

Phase goal: 让明显的 `website QA` 请求在真实宿主里更稳定地跨过 coarse broker-first boundary，同时减少误路由与无意义 fallback。

Verdict: 达成。明显 website QA paraphrase 与 mixed-language QA discovery 话术现在能稳定进入 broker-first / discovery lane，page-level near miss 会 fail closed；同时 `doctor` 已经直接输出 website QA 的 routing evidence，不需要 maintainer 手工拼 trace。

## Requirement Traceability

- `ROUTE-01`: `src/broker/query-compiler.ts`、`tests/core/request-normalization.test.ts`、`tests/e2e/phase2-coarse-boundary-eval.test.ts` 共同证明支持宿主能把清晰的 website QA 请求归到 `broker_first`，而普通请求仍留在 `handle_normally` / `clarify_before_broker`。
- `ROUTE-02`: `tests/broker/query-compiler.test.ts`、`tests/core/request-normalization.test.ts` 与 `tests/e2e/host-auto-routing-smoke.test.ts` 共同证明 QA install-help 与 page-level near miss 被 cleanly 区分，没有被粗暴吞进 hero lane。
- `ROUTE-03`: `src/broker/trace.ts`、`src/shared-home/doctor.ts`、`src/shared-home/format.ts` 与 `tests/shared-home/doctor.test.ts` 共同证明 repo 现在有 website QA 命中 / 误路由 / fallback / host-skip 的 repo-owned evidence surface。

## Automated Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/broker/query-compiler.test.ts tests/core/request-normalization.test.ts tests/broker/trace.test.ts tests/shared-home/doctor.test.ts tests/e2e/phase2-coarse-boundary-eval.test.ts tests/e2e/host-auto-routing-smoke.test.ts`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Must-Haves

- Hosts still make only coarse broker-first decisions: passed
- Clear website QA asks route more reliably while nearby non-QA phrasing stays fail-closed: passed
- Repo now exposes website QA routing evidence without ad hoc session notes: passed
- Phase 12 regressions fail closed in tests / eval rails: passed

## Gaps

无。

## Verification Notes

- 本轮 verification 直接在当前工作树重跑了 Phase 12 相关 6 个 test files，结果为 `74` 个 tests 全绿。
