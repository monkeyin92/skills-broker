# Roadmap: v1.6 Registry-Ready Capability Growth Loop

**Project:** skills-broker
**Status:** active_milestone
**Milestone:** v1.6 Registry-Ready Capability Growth Loop
**Started:** 2026-04-24
**Phase numbering:** continued from v1.5; next active phase is 21

## Goal

Let `skills-broker` grow capability coverage through registry/downstream manifest trust and acquisition proof without weakening the `website QA` default entry or the host coarse broker-first boundary.

## Guardrails

- `website QA` remains the only first-step hero lane; `web markdown` and `social markdown` remain post-QA proven loops.
- Host shells only decide `broker_first` / `handle_normally` / `clarify_before_broker`; concrete winners are broker-owned.
- MCP registry and downstream manifest sources are allowed to improve discovery and explanation, but advisory candidates must not outrank verified installed/local winners without proof.
- All operator-facing wording changes must be checked across README, README.zh-CN, generated host shell, `STATUS.md`, `TODOS.md`, `doctor`, and CI/parity rails.

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 21 | Normalize Capability Trust Surface | Make candidate provenance, registry/downstream metadata, and fail-closed trust eligibility inspectable. | CAP-01, CAP-02, CAP-03 | Complete |
| 22 | Prove Capability Acquisition Loop | Turn advisory → install-required → verified → reused capability growth into shared-home proof. | ACQ-01, ACQ-02, ACQ-03 | 4 |
| 23 | Lock Capability Growth Operator Truth | Align docs, host shell, `doctor`, status, and CI/parity rails around one coarse-boundary capability growth story. | TRUST-01, TRUST-02, TRUST-03 | 4 |


## Phase Completion Checklist

- [x] Phase 21: Normalize Capability Trust Surface
- [ ] Phase 22: Prove Capability Acquisition Loop
- [ ] Phase 23: Lock Capability Growth Operator Truth

## Phase Details

### Phase 21: Normalize Capability Trust Surface

**Goal:** Make the broker's candidate trust surface explicit enough that operators can understand source provenance, eligibility, degradation, and precedence before any acquisition loop is promoted.

**Requirements:** CAP-01, CAP-02, CAP-03

**Status:** completed

**Verification:** `.planning/phases/21-normalize-capability-trust-surface/21-VERIFICATION.md`

**Success criteria:**
1. Candidate explanation output distinguishes installed local skills, verified downstream manifests, MCP registry advisory candidates, and broker-owned workflows using stable provenance labels.
2. Registry/downstream candidates expose eligibility or degraded/rejected reasons from deterministic metadata such as source, version, transport, installability, verification status, and query coverage.
3. A repo-owned check fails closed when candidate metadata is missing, stale, contradictory, or allows advisory registry candidates to outrank verified installed winners without proof.
4. Existing QA-first family hierarchy remains unchanged in routing, `doctor`, and operator-facing copy while trust metadata expands.

**Notes:** This phase should start from existing MCP discovery metadata, verified downstream manifests, and precedence tests instead of introducing schema generalization beyond the milestone need.

### Phase 22: Prove Capability Acquisition Loop

**Goal:** Convert capability growth from a routing result into an auditable shared-home loop that shows install, verification, repeat usage, cross-host reuse, and degraded acquisition outcomes.

**Requirements:** ACQ-01, ACQ-02, ACQ-03

**Success criteria:**
1. Operator can follow one capability growth story from advisory candidate to `INSTALL_REQUIRED`, install/verify, and later reuse without reading raw routing traces.
2. Shared broker home records first install, verification success, repeat usage, cross-host reuse, and degraded/failed acquisition as distinct outcomes.
3. Broker result payloads and `doctor` report the correct next action: install, verify, rerun, refresh metadata, or prefer an already verified local/downstream winner.
4. Existing `website QA` repeat-usage and family-loop proof remains green while acquisition proof generalizes to capability growth.

**Notes:** Reuse existing acquisition memory and family proof packet patterns where possible; avoid creating a second telemetry model.

### Phase 23: Lock Capability Growth Operator Truth

**Goal:** Make capability growth a canonical product story across docs, installed host shell, `doctor`, status, backlog, and CI/parity rails while preserving coarse broker-first boundaries.

**Requirements:** TRUST-01, TRUST-02, TRUST-03

**Success criteria:**
1. README, README.zh-CN, generated host shell copy, `STATUS.md`, and `TODOS.md` use the same canonical capability growth wording and next-action guidance.
2. Narrative parity and CI trust rails fail on drift in capability growth wording, candidate counts, provenance labels, health states, or next actions.
3. Host shell tests prove capability growth requests only enter through `broker_first` / `handle_normally` / `clarify_before_broker` and never choose concrete skills, packages, MCP candidates, or workflows at the host layer.
4. `release:gate` / repo verification consumes the same capability growth truth without reopening release-promotion mechanics.

**Notes:** This phase should close operator trust, not broaden capability families or add a fourth host.

## Coverage Validation

| Requirement | Phase | Coverage |
|-------------|-------|----------|
| CAP-01 | 21 | Candidate provenance labels |
| CAP-02 | 21 | Eligibility/degraded/rejected metadata explanations |
| CAP-03 | 21 | Fail-closed repo-owned trust check |
| ACQ-01 | 22 | Advisory-to-reuse operator story |
| ACQ-02 | 22 | Distinct shared-home acquisition outcomes |
| ACQ-03 | 22 | Broker/doctor next-action guidance |
| TRUST-01 | 23 | Canonical docs/status/shell story |
| TRUST-02 | 23 | Narrative parity and CI drift rails |
| TRUST-03 | 23 | Host coarse-boundary tests |

**Coverage:** 9 / 9 requirements mapped exactly once.

## Next Up

**Phase 22: Prove Capability Acquisition Loop** — Turn advisory → install-required → verified → reused capability growth into shared-home proof.

Run:

`$gsd-discuss-phase 22`

Also available:

`$gsd-plan-phase 22`

---
*Last updated: 2026-04-24 after completing Phase 21*
