---
phase: 12-harden-website-qa-broker-first-hit-rate
plan: 02
subsystem: qa-routing-evidence-surface
tags: [website-qa, routing, trace, doctor]
requires:
  - phase: 12-harden-website-qa-broker-first-hit-rate
    plan: 01
    provides: stable website QA broker-first normalization and three-host boundary fixtures
provides:
  - Trace-level hero-lane attribution via requested proof family
  - Doctor website QA routing summary with hit/misroute/fallback/host-skip evidence
  - Operator-visible website QA routing text output
affects: [phase-12, trace, doctor, proof-rail]
tech-stack:
  added: []
  patterns: [hero-lane-trace-attribution, doctor-routing-summary, host-skip-evidence]
key-files:
  created:
    - .planning/milestones/v1.3-phases/12-harden-website-qa-broker-first-hit-rate/12-harden-website-qa-broker-first-hit-rate-02-SUMMARY.md
  modified:
    - src/broker/trace.ts
    - src/shared-home/doctor.ts
    - src/shared-home/format.ts
    - tests/broker/trace.test.ts
    - tests/shared-home/doctor.test.ts
key-decisions:
  - "`requestedProofFamily` 作为 trace attribution，只服务 repo-owned hero-lane evidence，不重开 maintained-family schema 泛化。"
  - "`doctor` 直接输出 `websiteQaRouting` summary，让 maintainer 不需要手工读 raw jsonl trace。"
  - "host-skipped broker decisions 继续算在 website QA routing evidence 内，但与 broker-observed traces 分开统计。"
patterns-established:
  - "默认入口 hit-rate 的 operator proof 优先复用 trace + doctor 现有 rail，而不是临时截图、会话注释或平行 telemetry。"
requirements-completed: [ROUTE-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 12 Plan 02 Summary

**Phase 12 的第二部分把“website QA 是不是更稳了”变成了 repo-owned 证据，而不是 maintainer 手工读 trace。现在 trace 会标出 hero lane attribution，`doctor` 也会直接给出 website QA 的 routing summary 和下一步动作。**

## Accomplishments

- `src/broker/trace.ts` 新增 `requestedProofFamily`，让 direct QA、QA discovery、web/social markdown 请求都能在 trace schema 里留下 hero/proof lane attribution。
- `src/shared-home/doctor.ts` 新增 `websiteQaRouting` summary，直接汇总最近窗口里的 observed、host skips、hit、misroute、fallback 以及 per-host breakdown。
- `src/shared-home/format.ts` 现在把 `Website QA routing` summary 和 `routing next action` 输出到 `doctor` text surface。
- `tests/broker/trace.test.ts` 与 `tests/shared-home/doctor.test.ts` 覆盖了 hero-lane trace attribution、empty-state、misroute/fallback/host-skip summary 以及 JSON/text surface。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/broker/trace.test.ts tests/shared-home/doctor.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/host-auto-routing-smoke.test.ts`

## Deviations

- `doctor` proof surface 在 Phase 13 继续细化了 repeat usage 与 cross-host reuse 语义，但 website QA routing summary contract 保持兼容。

## Next Readiness

- 默认入口的命中率证据已经 repo-owned，下一步可以把 install / verify / reuse / repeat usage loop 做成更强的 shared-home proof。
