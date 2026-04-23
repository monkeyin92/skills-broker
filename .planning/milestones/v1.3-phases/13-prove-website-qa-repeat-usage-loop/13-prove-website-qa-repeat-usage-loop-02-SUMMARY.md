---
phase: 13-prove-website-qa-repeat-usage-loop
plan: 02
subsystem: doctor-repeat-usage-proof-surface
tags: [website-qa, doctor, format, cli]
requires:
  - phase: 13-prove-website-qa-repeat-usage-loop
    plan: 01
    provides: canonical website QA repeat-usage proof loop
provides:
  - Distinct repeat-usage and cross-host reuse proof states in doctor JSON/text
  - Website QA acquisition proof wording aligned with doctor semantics
  - Regression coverage for same-host repeat usage vs cross-host reuse
affects: [phase-13, doctor, cli, proof-rail]
tech-stack:
  added: []
  patterns: [repeat-usage-pending-phase, same-host-repeat-vs-cross-host-proof, doctor-proof-alignment]
key-files:
  created:
    - .planning/milestones/v1.3-phases/13-prove-website-qa-repeat-usage-loop/13-prove-website-qa-repeat-usage-loop-02-SUMMARY.md
  modified:
    - src/shared-home/doctor.ts
    - src/shared-home/format.ts
    - tests/shared-home/doctor.test.ts
    - tests/cli/lifecycle-cli.test.ts
key-decisions:
  - "`DoctorFamilyProofPhase` 新增 `repeat_usage_pending`，避免把‘verify 已 confirmed 但还没 repeat’误说成已经到了 cross-host reuse 阶段。"
  - "`repeatUsageState` 与 `crossHostReuseState` 分开呈现；`crossHostReuseRecorded` 只由 `verifiedHosts.length > 1` 驱动。"
  - "`doctor` text output 直接输出 `repeat-usage proof`、`cross-host reuse proof` 与 `Website QA acquisition proof`，让 operator 不再从 `firstReuseAt` 猜语义。"
patterns-established:
  - "当 acquisition memory 同时承载 repeat usage 与 cross-host reuse 时，doctor 必须把两者拆成独立 proof rails，并为 same-host repeat 场景保留回归测试。"
requirements-completed: [REUSE-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 13 Plan 02 Summary

**Phase 13 的第二部分把 `doctor` proof surface 讲清楚了。现在 repeat usage 和 cross-host reuse 不再混成一个状态，`doctor` 会明确告诉 maintainer：当前缺的是再跑一次，还是换一个宿主再跑一次。**

## Accomplishments

- `src/shared-home/doctor.ts` 把 `reuseRecorded` 固定为 repeat usage，新增 `crossHostReuseRecorded`、`repeatUsageState`、`repeatUsageConfirmed`，并引入 `repeat_usage_pending` phase。
- `src/shared-home/format.ts` 现在会在 text surface 上输出 repeat-usage proof、cross-host reuse proof、website QA acquisition proof，并把 acquisition memory 文案改成 `website_qa_repeat_usage`。
- `tests/shared-home/doctor.test.ts` 新增 same-host repeat usage 但未跨宿主的 coverage，锁住 `repeatUsageState=confirmed` / `crossHostReuseState=pending` 的中间态。
- `tests/cli/lifecycle-cli.test.ts` 同步了 `doctor --json` proof shape，避免 CLI consumer 因新增 proof 字段回归。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Deviations

- 没有修改 acquisition memory 文件 schema；repeat usage / cross-host reuse 仍旧复用现有 `firstReuseAt` 与 `verifiedHosts`，本轮只把 doctor/operator 语义讲清楚。

## Next Readiness

- runtime proof loop 和 doctor proof surface 已经对齐，下一步可以把 README / host shell / STATUS / TODOS 的 QA-first wording 一起锁住。
