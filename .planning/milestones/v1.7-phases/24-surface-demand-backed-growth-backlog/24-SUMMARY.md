# Phase 24 Summary: Surface Demand-Backed Growth Backlog

**Status:** complete

## Delivered

- Added `src/broker/capability-demand.ts` to summarize demand-backed capability opportunities.
- Classified recent install-required evidence as blocked, historical unresolved evidence as stale, repeated/cross-host verified evidence as ready, and single verified winners as satisfied.
- Added focused tests for blocked, stale, ready, and deduplicated demand evidence.

## Verification

- Passed: `npm test -- --run tests/broker/capability-demand.test.ts tests/shared-home/doctor.test.ts`
