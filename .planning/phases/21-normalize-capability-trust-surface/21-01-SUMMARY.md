---
phase: 21-normalize-capability-trust-surface
plan: 01
status: completed
completed: 2026-04-24
requirements:
  - CAP-01
  - CAP-02
  - CAP-03
---

# Phase 21 Plan 01 Summary

## Completed

- Added `src/broker/capability-trust.ts` with stable provenance labels, eligibility summaries, metadata validation, stale manifest checks, source contradiction checks, and advisory-over-verified guardrails.
- Added capability trust evidence to `src/broker/explain.ts` so broker explanations expose provenance, eligibility, install state, install requirement, and trust reasons.
- Marked MCP registry candidates with `discoverySource: mcp_registry` and verified downstream replay candidates with `verifiedDownstreamManifestAt`.
- Added `src/dev/capability-trust-check.ts`, `scripts/capability-trust-check.mjs`, and `npm run ci:capability-trust` as the repo-owned deterministic trust check.
- Added `tests/broker/capability-trust.test.ts` plus tightened MCP registry metadata assertions.

## Verification

- `npm test -- --run tests/broker/capability-trust.test.ts tests/sources/mcp-registry.test.ts tests/broker/discover.test.ts tests/broker/rank.test.ts tests/integration/broker-flow.test.ts`
- `npm run build`
- `npm run ci:capability-trust`
