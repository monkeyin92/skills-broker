# Phase 24 Plan: Surface Demand-Backed Growth Backlog

## Goal

Aggregate demand-backed capability growth opportunities from existing proof rails and classify demand states deterministically.

## Tasks

1. Add a broker-owned `capability-demand` summary module.
2. Derive opportunity keys from routing traces and acquisition memory.
3. Classify opportunities as proven, speculative, blocked, stale, ready, or satisfied.
4. Cover blocked, stale, ready, and dedupe behavior with focused tests.

## Verification

- `npm test -- --run tests/broker/capability-demand.test.ts tests/shared-home/doctor.test.ts`
