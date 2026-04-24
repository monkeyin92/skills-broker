# Phase 26: Lock Demand-Guided Operator Truth - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** Autonomous smart discuss (accepted defaults)

<domain>
## Phase Boundary

Make demand-guided capability growth health a canonical operator story across docs, installed host shell wording, STATUS/TODOS, and CI/parity rails while preserving coarse broker-first boundaries.

</domain>

<decisions>
## Implementation Decisions

### Operator Truth
- Add one canonical demand-guided capability growth sentence to the operator truth contract.
- Mirror the sentence in README, README.zh-CN, STATUS, TODOS, and generated host shell markdown.
- Extend CI trust and parity tests to require the new wording and `capabilityGrowthHealth` packet.
- Do not alter release mechanics; only let release/CI rails consume the existing truth.

### the agent's Discretion
Use existing operator-truth and narrative-parity patterns.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/operator-truth.ts` centralizes canonical bilingual wording.
- `src/hosts/skill-markdown.ts` renders installed shell instructions from operator truth helpers.
- `src/dev/ci-trust.ts` defines fail-closed narrative and doctor proof rails.
- `tests/shared-home/operator-truth-parity.test.ts` and `tests/hosts/host-shell-install.test.ts` enforce cross-surface wording parity.

### Established Patterns
- STATUS canonical block records shipped-local proof packets before release promotion.
- README and README.zh-CN must repeat operator-facing wording exactly.

### Integration Points
- Add demand-guided wording helper and wire it into docs, shells, CI trust specs, and tests.

</code_context>

<specifics>
## Specific Ideas

No user overrides — use roadmap requirements TRUST-01 through TRUST-03.

</specifics>

<deferred>
## Deferred Ideas

No release mechanics, fourth host, or new capability family scope.

</deferred>
