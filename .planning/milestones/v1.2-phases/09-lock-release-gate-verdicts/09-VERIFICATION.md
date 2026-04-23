---
phase: 09-lock-release-gate-verdicts
status: passed
verified: 2026-04-23
requirements:
  - REL-01
  - REL-02
  - REL-03
evidence:
  - 09-lock-release-gate-verdicts-01-SUMMARY.md
  - 09-lock-release-gate-verdicts-02-SUMMARY.md
---

# Phase 9 Verification

## Result

`passed`

## Goal Check

Phase goal: 把现有 CI trust rails 收口成 ship/release 可直接消费的 canonical gate。

Verdict: 达成。repo 现在有了显式的 `release:gate` surface，它直接复用 blind-spot report、focused narrative parity suite 与 strict repo-scoped doctor，并输出 failing rail、shipping ref 与 remote freshness。`verify:local` 也继续保持 contributor 本地预检职责，没有被误包装成 shipping proof。

## Requirement Traceability

- `REL-01`: `src/dev/release-truth.ts`、`scripts/release-truth.mjs`、`package.json` 共同证明 ship/release automation 可以消费同一条 repo-owned gate，而不是再手工拼三条 rail。
- `REL-02`: `src/dev/release-truth.ts`、`tests/dev/release-truth.test.ts`、`README.md`、`README.zh-CN.md` 共同证明 verdict 会直接暴露 failing rail、shipping ref 与 remote freshness。
- `REL-03`: `tests/dev/release-truth.test.ts`、`README.md`、`README.zh-CN.md` 共同证明 `verify:local` 仍然只承担本地预检职责。

## Automated Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/release-truth.mjs gate --json`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Must-Haves

- Existing CI rails are consumed as one canonical release gate: passed
- Verdict surfaces failing rail, shipping ref, and remote freshness: passed
- `verify:local` remains local-only and outside shipping proof: passed
- Missing/broken gate input fails closed before publish: passed

## Gaps

无。

## Verification Notes

- 在当前脏工作树上，真实 `release:gate` 会因为 strict doctor red 而返回失败；这不是 gate 实现问题，而是 repo truth 在 Phase 5 / Phase 8 以及本轮未提交改动上本来就存在 local-only / invalid proof blocker。Phase 9 的价值正是把这些 blocker 直接 surfaced 成 canonical verdict，而不是让 maintainer 回头翻多个 workflow log。
