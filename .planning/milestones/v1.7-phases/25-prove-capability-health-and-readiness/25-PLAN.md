# Phase 25 Plan: Prove Capability Health And Readiness

## Goal

Expose demand-guided capability growth health through doctor JSON/text output and prove stale/blocked transitions.

## Tasks

1. Add `capabilityGrowthHealth` to `DoctorLifecycleResult`.
2. Feed routing traces and acquisition entries into the demand summary.
3. Render summary and top opportunities in doctor text output.
4. Add doctor tests for blocked and stale health states.

## Verification

- `npm test -- --run tests/broker/capability-demand.test.ts tests/shared-home/doctor.test.ts`
