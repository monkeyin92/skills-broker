---
phase: 13-prove-website-qa-repeat-usage-loop
status: passed
verified: 2026-04-23
requirements:
  - REUSE-01
  - REUSE-02
  - REUSE-03
evidence:
  - 13-prove-website-qa-repeat-usage-loop-01-SUMMARY.md
  - 13-prove-website-qa-repeat-usage-loop-02-SUMMARY.md
---

# Phase 13 Verification

## Result

`passed`

## Goal Check

Phase goal: 把 `website QA` 的 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse -> repeat usage` 收成更强的 repo-owned proof loop，避免默认入口只剩“一次 demo 成功”。

Verdict: 达成。integration proof 现在明确覆盖三宿主 shared-home reuse，acquisition memory 记录了 repeat-usage 证据；`doctor` 也能区分 repeat usage 与 cross-host reuse，并指出当前还缺哪一步 proof。

## Requirement Traceability

- `REUSE-01`: `tests/integration/broker-flow.test.ts` 证明 `website QA` 的 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse` loop 可以在 Claude Code / Codex / OpenCode 三宿主 surface 上成立。
- `REUSE-02`: `tests/integration/broker-flow.test.ts` 通过第三次成功路由与 acquisition memory assert，证明 QA-first 不是一次成功的 demo，而是可重复复用的路径。
- `REUSE-03`: `src/shared-home/doctor.ts`、`src/shared-home/format.ts`、`tests/shared-home/doctor.test.ts` 与 `tests/cli/lifecycle-cli.test.ts` 共同证明 `doctor`、acquisition memory 与 verified downstream manifests 现在会讲同一份 repeat-usage / cross-host reuse truth。

## Automated Verification

- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/doctor.test.ts tests/integration/broker-flow.test.ts tests/e2e/shared-home-smoke.test.ts tests/cli/lifecycle-cli.test.ts`

## Must-Haves

- Canonical website QA proof covers install / verify / cross-host reuse on the three-host surface: passed
- Repeat usage is proven beyond a one-time install demo: passed
- Doctor points to the next missing proof and distinguishes repeat usage from cross-host reuse: passed
- CLI / shared-home surfaces consume the same proof contract: passed

## Gaps

无。

## Verification Notes

- 本轮 targeted verification 覆盖了 4 个 test files、`112` 个 tests，全绿。
- 另外还重跑了 Phase 12 回归套件，确认 Phase 13 的 doctor/proof 语义细化没有打破 QA-first routing evidence。
