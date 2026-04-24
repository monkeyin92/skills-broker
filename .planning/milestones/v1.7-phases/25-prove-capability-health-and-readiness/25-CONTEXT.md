# Phase 25: Prove Capability Health And Readiness - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** Autonomous smart discuss (accepted defaults)

<domain>
## Phase Boundary

Expose the demand-backed capability growth backlog as shared-home / doctor health, including freshness, blocked next action, promotion readiness, and reuse state.

</domain>

<decisions>
## Implementation Decisions

### Health Packet
- Surface health through `doctorSharedBrokerHome()` as `capabilityGrowthHealth`.
- Render text output with status, counts, next action, and top opportunity details.
- Keep stale-to-fresh / blocked-to-ready transitions deterministic and based on timestamps plus acquisition memory.
- Preserve website QA adoption and QA-first family-loop health behavior.

### the agent's Discretion
Follow existing doctor output and format conventions; no new telemetry files.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `doctorSharedBrokerHome()` already owns shared-home proof packet aggregation.
- `formatLifecycleResult()` already renders doctor proof packets.
- Doctor tests already create routing trace and acquisition memory fixtures.

### Established Patterns
- JSON output mirrors doctor result object exactly.
- Text output includes concise summary lines plus per-item detail lines.

### Integration Points
- Add `capabilityGrowthHealth` to `DoctorLifecycleResult` and render text lines in `src/shared-home/format.ts`.

</code_context>

<specifics>
## Specific Ideas

No user overrides — use roadmap requirements HEALTH-01 through HEALTH-03.

</specifics>

<deferred>
## Deferred Ideas

Promotion execution remains out of scope; v1.7 only surfaces readiness.

</deferred>
