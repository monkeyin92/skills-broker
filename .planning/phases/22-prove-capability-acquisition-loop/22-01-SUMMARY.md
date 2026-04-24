---
phase: 22-prove-capability-acquisition-loop
plan: 01
status: completed
completed: 2026-04-24
requirements:
  - ACQ-01
  - ACQ-02
  - ACQ-03
---

# Phase 22 Plan 01 Summary

## Completed

- Added `src/broker/capability-growth.ts` and result payload `capabilityGrowth` for install-required, verified handoff, reused capability, and degraded stages.
- Extended acquisition memory with explicit outcome summaries while deriving them for existing memory entries.
- Updated broker run flow so install-required and successful handoff results carry acquisition stage and next-action proof.
- Extended `doctor` acquisition memory summaries and text output with verification successes, repeat usage, degraded/failed counts, and next action.
- Updated acquisition memory, broker integration, and doctor tests.

## Verification

- `npm test -- --run tests/broker/acquisition-memory.test.ts tests/integration/broker-flow.test.ts tests/shared-home/doctor.test.ts tests/broker/capability-trust.test.ts`
- `npm run build`
- `npm run ci:capability-trust`
