---
phase: 09-lock-release-gate-verdicts
plan: 01
subsystem: repo-owned-release-gate
tags: [release, gate, ci-truth, repo-truth]
requires:
  - phase: 08-install-ci-trust-guardrails
    plan: 01
    provides: blind-spot report and trust-job wiring
  - phase: 08-install-ci-trust-guardrails
    plan: 02
    provides: focused narrative parity suite and clear local-vs-ci boundary
provides:
  - Repo-local canonical release gate command
  - One verdict over blind-spot, narrative parity, and strict doctor rails
  - Explicit npm script surface for ship/publish reuse
affects: [phase-9, release-truth, repo-truth]
tech-stack:
  added: [src/dev/release-truth.ts]
  patterns: [repo-owned-release-orchestration, existing-rail-reuse, text-json-verdict]
key-files:
  created:
    - .planning/milestones/v1.2-phases/09-lock-release-gate-verdicts/09-lock-release-gate-verdicts-01-SUMMARY.md
    - src/dev/release-truth.ts
    - scripts/release-truth.mjs
    - tests/dev/release-truth.test.ts
  modified:
    - package.json
key-decisions:
  - "`release:gate` 直接 shell 到现有 `ci:blind-spot`、focused narrative parity suite 与 strict repo-scoped doctor，而不是复制 evaluator 逻辑。"
  - "release truth 保持 repo-local surface，不扩大 published lifecycle CLI beyond `update / doctor / remove`。"
  - "`verify:local` 明确不进入 release gate；它继续只回答 contributor 机器是否能跑 baseline build/test。"
patterns-established:
  - "ship/publish 想消费 repo truth 时，应优先把已有 CI rails 收成一个 canonical verdict，而不是再造 release-only gate。"
  - "repo-owned release helpers 应优先走 `src/dev/*.ts` + `scripts/*.mjs` + `package.json`，避免污染 published lifecycle contract。"
requirements-completed: [REL-01, REL-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 9 Plan 01 Summary

**Phase 9 先把现有三条 CI trust rail 收口成了一条 repo-owned release gate。maintainer 现在可以直接运行 `npm run release:gate`，而不必手工去拼 blind-spot report、narrative parity suite 和 strict repo doctor 的三个输出。**

## Accomplishments

- 新增 `src/dev/release-truth.ts` 与 `scripts/release-truth.mjs`，把 release truth 做成一个 repo-local CLI。
- `package.json` 新增 `release:gate`，供 ship/publish flow 直接复用。
- release gate 复用三条既有 rail：
  - `npm run ci:blind-spot`
  - `npm run test:ci:narrative-parity`
  - strict repo-scoped `skills-broker doctor`
- `tests/dev/release-truth.test.ts` 锁住了 rail aggregation、failing rail surfaced、以及 `verify:local` 不会被误当 shipping proof。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/release-truth.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/release-truth.mjs gate --json`

## Deviations

- 没有把 release gate 塞进 published lifecycle CLI。它仍然是 repo-owned flow，不是 `npx skills-broker` 的对外 contract。
- 没有让 `verify:local` 参加 gate，这样 contributor preflight 与 repo shipping truth 继续分层。

## Next Readiness

- release gate 已经提供 canonical verdict surface，下一步可以在同一模块里补显式 proof promotion flow。
