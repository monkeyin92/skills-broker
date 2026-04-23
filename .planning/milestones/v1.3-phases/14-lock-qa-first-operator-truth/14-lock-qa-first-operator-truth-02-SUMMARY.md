---
phase: 14-lock-qa-first-operator-truth
plan: 02
subsystem: qa-first-operator-truth-guardrails
tags: [website-qa, parity, ci, guardrail]
requires:
  - phase: 14-lock-qa-first-operator-truth
    plan: 01
    provides: aligned QA-first operator wording across docs and host shells
provides:
  - Parity tests that lock the new coarse-boundary and QA proof wording
  - STATUS-board coverage for Phase 12 and Phase 13 QA-first confidence packets
  - CI trust snippets that fail closed when the new operator story drifts
affects: [phase-14, tests, ci, parity]
tech-stack:
  added: []
  patterns: [qa-first-status-board-proof, docs-snippet-ci-guardrail, host-shell-boundary-parity]
key-files:
  created:
    - .planning/milestones/v1.3-phases/14-lock-qa-first-operator-truth/14-lock-qa-first-operator-truth-02-SUMMARY.md
  modified:
    - tests/shared-home/operator-truth-parity.test.ts
    - tests/hosts/host-shell-install.test.ts
    - tests/e2e/shared-home-smoke.test.ts
    - src/dev/ci-trust.ts
key-decisions:
  - "operator-truth parity suite 不再只锁 support matrix / lifecycle commands，还要锁 coarse boundary 与 website QA proof-surface wording。"
  - "`STATUS.md` canonical board 新增 Phase 12 / Phase 13 packet items，避免 QA-first confidence 只留在 human summary。"
  - "CI trust 继续复用 narrative parity / blind-spot rail，本轮只扩 canonical snippets，不引入平行 checker。"
patterns-established:
  - "当 docs/status/todos 需要反映新的 runtime truth 时，要同步扩 parity suite、host-shell wording assert、shared-home smoke 与 CI snippet guardrail。"
requirements-completed: [TRUTH-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 14 Plan 02 Summary

**Phase 14 的第二部分把 QA-first wording 变成了 fail-closed contract。现在如果 README、README.zh-CN、TODOS、STATUS、generated host shell 或 CI snippet 忘了 coarse boundary / website QA proof story，parity rail 会直接变红。**

## Accomplishments

- `tests/shared-home/operator-truth-parity.test.ts` 现在会检查 coarse-boundary 句子、website QA proof-surface 句子，以及 `STATUS.md` 里新增的 Phase 12 / Phase 13 packet items。
- `tests/hosts/host-shell-install.test.ts` 与 `tests/e2e/shared-home-smoke.test.ts` 同步锁住 generated host shell 对 canonical coarse-boundary 句子的复用。
- `src/dev/ci-trust.ts` 的 docs snippets 现在把 coarse-boundary 与 website QA proof surface 也纳入 narrative parity / blind-spot rail。
- `STATUS.md` 新增 Phase 12 / Phase 13 QA-first confidence packets，使 repo-native proof board 能追踪当前 milestone 的 landed truth。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts tests/shared-home/status.test.ts tests/dev/release-truth.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/ci-trust-report.mjs`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Deviations

- 这轮没有新增单独的 docs checker；guardrail 继续挂在现有 parity suite 和 ci-trust rail 上。

## Next Readiness

- v1.3 的全部 product requirements 已满足，milestone 现在可以进入 audit / archive / cleanup。
