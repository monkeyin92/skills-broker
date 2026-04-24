# Phase 22: Prove Capability Acquisition Loop - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn capability growth into an auditable loop across broker result payloads, shared-home acquisition memory, and `doctor`: advisory/install-required candidates lead to install/verify, then verified handoff, repeat usage, cross-host reuse, or degraded/failed next actions.

</domain>

<decisions>
## Implementation Decisions

### Acquisition Stages
- Represent capability growth as stable stages: `install_required`, `verified_handoff`, `reused_capability`, and `degraded`.
- Attach next actions directly to result payloads: install, verify, rerun, refresh metadata, or prefer verified winner.
- Reuse Phase 21 trust provenance/eligibility rather than inventing a separate trust model.

### Shared-Home Outcome Memory
- Extend acquisition memory entries with derived outcome summaries while preserving backward compatibility for existing memory files.
- Treat `installedAt`, `verifiedAt`, `firstReuseAt`, and `verifiedHosts` as the source truth for first install, verification success, repeat usage, and cross-host reuse.
- Keep degraded/failed counters explicit for future acquisition repair paths even if Phase 22 does not yet introduce a full failure-event log.

### Doctor Surface
- Surface generalized capability acquisition outcome counts and next action through `doctor` text/JSON.
- Keep website QA-specific proof fields intact so v1.3-v1.5 adoption/family-loop truth stays green.

### the agent's Discretion
Use minimal additive types and tests. Do not broaden docs or installed shell wording until Phase 23.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/broker/acquisition-memory.ts` already records verified winners, repeat usage, and verified hosts.
- `src/broker/run.ts` already emits `INSTALL_REQUIRED` acquisition hints and persists verified handoff memory.
- `src/shared-home/doctor.ts` already summarizes acquisition memory and website QA proof.
- `src/shared-home/format.ts` already renders doctor text lines for acquisition memory.

### Established Patterns
- Backward-compatible memory reads fail open or derive missing fields.
- Broker result payloads are strongly typed in `src/broker/result.ts`.
- Integration coverage lives in `tests/integration/broker-flow.test.ts`; doctor text/JSON coverage lives in `tests/shared-home/doctor.test.ts`.

### Integration Points
- Add `src/broker/capability-growth.ts` for result payload stage/next-action summaries.
- Extend acquisition memory outcome summaries without invalidating existing files.
- Update doctor text and tests to expose generalized capability growth counts.

</code_context>

<specifics>
## Specific Ideas

ACQ-01 / ACQ-02 / ACQ-03 should be satisfied by broker result `capabilityGrowth`, acquisition memory `outcomes`, and doctor next-action summaries.

</specifics>

<deferred>
## Deferred Ideas

Canonical operator copy across README / host shell / STATUS / TODOS remains Phase 23 scope.

</deferred>
