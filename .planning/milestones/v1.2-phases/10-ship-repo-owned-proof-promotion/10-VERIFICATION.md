---
phase: 10-ship-repo-owned-proof-promotion
status: passed
verified: 2026-04-23
requirements:
  - PROOF-01
  - PROOF-02
  - PROOF-03
evidence:
  - 10-ship-repo-owned-proof-promotion-01-SUMMARY.md
  - 10-ship-repo-owned-proof-promotion-02-SUMMARY.md
  - 10-ship-repo-owned-proof-promotion-03-SUMMARY.md
---

# Phase 10 Verification

## Result

`passed`

## Goal Check

Phase goal: 为 canonical `STATUS.md` truth 增加显式、repo-owned、fail-closed 的 shipped-proof promotion flow。

Verdict: 达成。repo 现在有显式的 `release:promote` surface，可以基于 shipping ref 与 remote refresh diagnostics 复评 canonical `STATUS.md` proof items，只升级 eligible 的 `shipped_local` truth，并且在 blocking issue 存在时不写文件。

## Requirement Traceability

- `PROOF-01`: `src/dev/release-truth.ts`、`package.json`、`tests/dev/release-truth.test.ts` 共同证明 repo 具备显式 `release:promote` flow，且会把 eligible item 升级成 `shipped_remote`。
- `PROOF-02`: `src/dev/release-truth.ts`、`tests/dev/release-truth.test.ts` 共同证明 ship ref / refresh / proof / mismatch blocker 会阻止写回。
- `PROOF-03`: `README.md`、`README.zh-CN.md`、`STATUS.md` 共同证明 proof promotion 已成为 repo-visible canonical truth 的一部分。

## Automated Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts tests/shared-home/status.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/release-truth.mjs promote --json`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Must-Haves

- Eligible `shipped_local` items can be promoted explicitly: passed
- Ship-ref/refresh/proof/mismatch blockers fail closed and do not rewrite files: passed
- Repo-visible wording now explains proof promotion: passed
- Canonical status truth remains in one `STATUS.md` seam: passed

## Gaps

无。

## Verification Notes

- 在当前脏工作树里，真实 `release:promote` 会正确列出 existing blockers，并拒绝 partial rewrite。这正是本 phase 想锁住的行为，而不是 regression。
