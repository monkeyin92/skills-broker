# Phase 23: Lock Capability Growth Operator Truth - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Align capability growth wording and guardrails across docs, installed host shell, `doctor`, status, backlog, CI trust, and release-gate-adjacent repo verification without broadening host responsibilities or adding new capability families.

</domain>

<decisions>
## Implementation Decisions

### Canonical Wording
- Add capability growth proof and next-action wording to `OPERATOR_TRUTH_CONTRACT` so docs, host shell, parity tests, and CI trust consume the same strings.
- Keep wording explicit that next actions are broker-owned and host shell still only chooses the coarse boundary.

### Surface Alignment
- README, README.zh-CN, STATUS, TODOS, and generated host shell should all include the same capability growth packet and next-action guidance.
- `doctor` text already exposes generalized acquisition memory outcomes from Phase 22; Phase 23 locks that through CI trust snippets.

### CI / Release Rails
- Extend narrative parity and CI trust rails to fail on capability growth wording drift.
- Add `npm run ci:capability-trust` to CI so registry/downstream trust remains part of repo-owned verification without reopening release-promotion mechanics.

### the agent's Discretion
Do not add a fourth host, promote new families, or change host-shell winner selection. Phase 23 is a truth-rail closure phase.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/operator-truth.ts` is the canonical wording source.
- `src/hosts/skill-markdown.ts` renders installed host shell copy from operator truth helpers.
- `tests/shared-home/operator-truth-parity.test.ts` and `tests/hosts/host-shell-install.test.ts` lock docs and installed shell parity.
- `src/dev/ci-trust.ts` defines blind-spot surfaces consumed by `npm run ci:blind-spot` and `release:gate`'s CI rail.

### Established Patterns
- Operator-facing wording changes must touch README, README.zh-CN, STATUS, TODOS, generated shell tests, and CI trust snippets together.
- CI workflow runs trust gates before broad tests.

### Integration Points
- Add capability growth snippets to operator truth and CI trust.
- Update docs/status/backlog with exact canonical strings.
- Add `ci:capability-trust` to `.github/workflows/ci.yml`.

</code_context>

<specifics>
## Specific Ideas

TRUST-01 / TRUST-02 / TRUST-03 should be satisfied by canonical strings, parity tests, host-shell tests, CI trust checks, and the CI capability trust hook.

</specifics>

<deferred>
## Deferred Ideas

Adding more hosts or new proven families remains future scope.

</deferred>
