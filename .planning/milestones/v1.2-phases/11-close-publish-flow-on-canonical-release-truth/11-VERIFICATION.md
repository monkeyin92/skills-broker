---
phase: 11-close-publish-flow-on-canonical-release-truth
status: passed
verified: 2026-04-23
requirements:
  - SHIP-01
  - SHIP-02
evidence:
  - 11-close-publish-flow-on-canonical-release-truth-01-SUMMARY.md
  - 11-close-publish-flow-on-canonical-release-truth-02-SUMMARY.md
---

# Phase 11 Verification

## Result

`passed`

## Goal Check

Phase goal: 让 publish/release automation 直接复用 canonical status/doctor truth，并把 `shipped_local` / `shipped_remote` 与 lifecycle wording 锁成单一 operator story。

Verdict: 达成。publish workflow 现在会在 publish 前运行 canonical release gate、在 publish 后运行 proof promotion 并回推 `STATUS.md`、最后再用同一条 release gate 做 closeout。README 双语、STATUS 与 TODOS 也对齐了 repo-local release truth 与 published lifecycle commands 的职责边界。

## Requirement Traceability

- `SHIP-01`: `.github/workflows/publish-npm.yml`、`tests/dev/release-truth.test.ts` 共同证明 publish automation 直接复用了 `release:gate` / `release:promote`，没有新增 release-only evaluator。
- `SHIP-02`: `README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md` 共同证明 operator-facing wording 继续对齐 `shipped_local` / `shipped_remote`、published lifecycle commands 与 canonical release truth。

## Automated Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`
- `rg -n "release:gate|release:promote|git push origin" .github/workflows/publish-npm.yml`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Must-Haves

- Publish automation reuses canonical release truth pre and post publish: passed
- Published lifecycle wording remains distinct from repo-local release helpers: passed
- STATUS / TODOS / README surfaces now tell one shipping story: passed
- Release truth closeout does not invent a second verifier: passed

## Gaps

无。

## Verification Notes

- 本轮没有在本地直接执行 `publish-npm.yml`，因为那会真的触发 npm publish。验证方式是 repo-native tests、workflow wiring assert、TypeScript 编译以及 real `release-truth` CLI smoke。
