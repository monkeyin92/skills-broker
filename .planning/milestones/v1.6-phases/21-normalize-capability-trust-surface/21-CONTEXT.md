# Phase 21: Normalize Capability Trust Surface - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Normalize the broker candidate trust surface so operators and maintainers can inspect source provenance, eligibility/degradation, trust metadata, and precedence before acquisition proof is generalized in Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Provenance Labels
- Use stable provenance labels for installed local skills, verified downstream manifests, MCP registry advisory candidates, broker-owned workflows, acquisition memory, host catalog available candidates, and unknown candidates.
- Keep labels broker-owned and deterministic; do not let host shells infer or choose winners.
- Expose labels through broker explanation and a repo-owned trust inspection utility.

### Trust Metadata
- MCP registry candidates require source, version, transport, endpoint count, validation, and query coverage metadata.
- Downstream manifest replay candidates require verified host and verified manifest timestamp metadata.
- Missing or contradictory metadata is degraded/fail-closed rather than silently accepted.

### Precedence Guardrail
- Verified installed local/workflow candidates must not be displaced by advisory MCP registry candidates without proof.
- Keep existing source precedence and installed-first duplicate behavior intact.
- Add tests at the trust surface level rather than broadening maintained-family schema.

### the agent's Discretion
Use existing discovery, MCP registry, downstream manifest, and explanation patterns. Avoid docs-wide wording work until Phase 23.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/sources/mcp-registry.ts` already validates registry remotes and query coverage.
- `src/broker/downstream-manifest-source.ts` already writes/loads verified downstream `.skills-broker.json` manifests.
- `src/broker/discover.ts` already merges source batches with installed-first duplicate precedence.
- `src/broker/explain.ts` already exposes route explanations and MCP registry evidence.

### Established Patterns
- Tests live under `tests/broker`, `tests/sources`, and `tests/integration` with Vitest.
- Repo-owned checks are implemented as `src/dev/*` modules plus scripts in `scripts/*.mjs` and npm scripts.

### Integration Points
- Add a trust inspection module under `src/broker` for reusable provenance/eligibility logic.
- Add a repo-owned `ci:capability-trust` script for deterministic metadata/precedence checks.
- Preserve existing `website QA` and family-loop routing behavior.

</code_context>

<specifics>
## Specific Ideas

CAP-01 / CAP-02 / CAP-03 should be satisfied by code-level provenance labels, explanation output, deterministic metadata checks, and a runnable repo-owned trust command.

</specifics>

<deferred>
## Deferred Ideas

Operator-facing docs, installed shell copy, status wording, and CI narrative parity for capability growth are deferred to Phase 23.

</deferred>
