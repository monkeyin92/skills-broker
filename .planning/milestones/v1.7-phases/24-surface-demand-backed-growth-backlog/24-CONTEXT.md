# Phase 24: Surface Demand-Backed Growth Backlog - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** Autonomous smart discuss (accepted defaults)

<domain>
## Phase Boundary

Aggregate real capability-growth demand from existing routing traces and acquisition memory, then classify deterministic demand states for operator inspection. This phase must stay inside broker-owned logic and must not move winner selection into host shells.

</domain>

<decisions>
## Implementation Decisions

### Demand Evidence
- Reuse routing traces for `INSTALL_REQUIRED`, `NO_CANDIDATE`, and successful handoff evidence.
- Reuse acquisition memory for verified, repeated, cross-host, degraded, and failed outcomes.
- Deduplicate by selected capability / winner / acquisition-memory leaf capability instead of package-only identity.
- Treat missing evidence as missing, old unresolved evidence as stale, and recent unresolved install-required evidence as blocked.

### the agent's Discretion
All implementation choices should remain deterministic, TypeScript-first, and consistent with existing doctor/adoption-health packet patterns.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/broker/trace.ts` exposes persisted routing trace shape and summary helpers.
- `src/broker/acquisition-memory.ts` stores install/verify/reuse/cross-host/degraded/failed acquisition outcomes.
- `src/shared-home/doctor.ts` already joins routing traces, acquisition memory, verified manifests, family-loop packets, and adoption health.

### Established Patterns
- Doctor surfaces use typed summary objects plus text rendering in `src/shared-home/format.ts`.
- Existing proof packets avoid external telemetry and derive state from repo-owned files.

### Integration Points
- Add a broker-owned demand summary module and expose it through `doctorSharedBrokerHome()`.

</code_context>

<specifics>
## Specific Ideas

No user overrides — use roadmap requirements DEMAND-01 through DEMAND-03.

</specifics>

<deferred>
## Deferred Ideas

Real registry update/publish feedback loops remain out of scope until demand health proves promotion pressure.

</deferred>
