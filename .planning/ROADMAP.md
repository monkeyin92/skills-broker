# Roadmap: v1.7 Demand-Guided Capability Growth Health

**Project:** skills-broker
**Milestone:** v1.7 Demand-Guided Capability Growth Health
**Status:** active
**Created:** 2026-04-24
**Phase numbering:** continues from v1.6; next phase is 24

## Goal

让 operator 不只看懂 capability candidates 是否可信，还能看懂哪些增长机会正在被真实请求、哪些已经 stale 或 blocked、以及哪些已经 ready for promotion。

## Guardrails

- `website QA` remains the single first-step hero lane; `web markdown` and `social markdown` remain post-QA proven loops.
- Host shells only decide `broker_first` / `handle_normally` / `clarify_before_broker`; concrete winners and promotion decisions remain broker-owned.
- Demand and health truth must reuse routing traces, `INSTALL_REQUIRED` outcomes, acquisition memory, verified manifests, registry/downstream metadata, `doctor`, `STATUS.md`, and CI/parity rails.
- Advisory registry candidates cannot outrank verified installed/local winners just because they have demand.
- Do not add fourth-host scope, new proven families/workflows, release-mechanics changes, query-native migration, package-vs-leaf identity migration, or maintained-family schema generalization.

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 24 | Surface Demand-Backed Growth Backlog | Aggregate real demand for capability growth from existing proof rails and classify demand states deterministically. | DEMAND-01, DEMAND-02, DEMAND-03 | Complete |
| 25 | Prove Capability Health And Readiness | Turn demanded capabilities into freshness, blocked-action, readiness, and reuse health surfaced through shared broker home and `doctor`. | HEALTH-01, HEALTH-02, HEALTH-03 | Complete |
| 26 | Lock Demand-Guided Operator Truth | Align docs, installed host shell wording, status, backlog, CI/parity, and release gate around one demand-guided capability growth story. | TRUST-01, TRUST-02, TRUST-03 | Complete |

## Phase Completion Checklist

- [x] Phase 24: Surface Demand-Backed Growth Backlog
- [x] Phase 25: Prove Capability Health And Readiness
- [x] Phase 26: Lock Demand-Guided Operator Truth

## Phase Details

### Phase 24: Surface Demand-Backed Growth Backlog

**Goal:** Aggregate real demand for capability growth from existing proof rails and classify which opportunities are proven, speculative, stale, blocked, or already satisfied.

**Requirements:** DEMAND-01, DEMAND-02, DEMAND-03

**Status:** completed

**Verification:** `.planning/phases/24-surface-demand-backed-growth-backlog/24-VERIFICATION.md`

**Success criteria:**
1. Operator can inspect a capability growth backlog derived from routing traces, `INSTALL_REQUIRED` outcomes, acquisition memory, and verified manifest misses.
2. Demand states distinguish proven demand, speculative/advisory candidates, blocked acquisition, stale metadata, duplicate evidence, and already-satisfied local winners.
3. Host shell boundary tests prove demand classification happens inside broker-owned logic, not in generated host shell entrypoints.
4. Deterministic tests fail closed on missing, stale, contradictory, or duplicate demand evidence.

**Notes:** Start from v1.6 capability trust and acquisition memory structures. Do not introduce external analytics or ML classification.

### Phase 25: Prove Capability Health And Readiness

**Goal:** Convert demanded capability opportunities into a `doctor`/shared-home health packet with freshness, blocked next actions, promotion readiness, and reuse state.

**Requirements:** HEALTH-01, HEALTH-02, HEALTH-03

**Status:** completed

**Verification:** `.planning/phases/25-prove-capability-health-and-readiness/25-VERIFICATION.md`

**Success criteria:**
1. `doctor` exposes a capability growth health packet with demanded capability freshness, blocked next actions, promotion readiness, and reuse status.
2. Refresh guidance reuses existing acquisition memory, verified manifests, routing traces, and registry/downstream metadata.
3. Tests prove stale-to-fresh and blocked-to-ready transitions without relying on manual trace inspection.
4. Existing `website QA` adoption and QA-first family-loop health stay green while capability growth health expands.

**Notes:** Reuse the family-loop and adoption-health packet patterns where possible; avoid a second telemetry model.

### Phase 26: Lock Demand-Guided Operator Truth

**Goal:** Make demand-guided capability growth health a canonical operator story across docs, installed host shell wording, status, backlog, and CI/release guardrails.

**Requirements:** TRUST-01, TRUST-02, TRUST-03

**Status:** completed

**Verification:** `.planning/phases/26-lock-demand-guided-operator-truth/26-VERIFICATION.md`

**Success criteria:**
1. README, README.zh-CN, generated host shell wording, `STATUS.md`, and `TODOS.md` explain the same demand-guided capability growth states and next actions.
2. Narrative parity and CI trust rails fail on drift in demand counts, health states, readiness wording, or host-boundary wording.
3. Host shell tests prove demand-guided growth requests only enter through `broker_first` / `handle_normally` / `clarify_before_broker` and never choose concrete winners at the host layer.
4. `release:gate` consumes the same demand-guided capability growth truth without reopening release-promotion mechanics.

**Notes:** This phase closes operator trust. It should not broaden capability families, add a fourth host, or change release mechanics.

## Coverage Validation

| Requirement | Phase | Coverage |
|-------------|-------|----------|
| DEMAND-01 | 24 | Demand-backed capability backlog |
| DEMAND-02 | 24 | Demand state classification and host-boundary preservation |
| DEMAND-03 | 24 | Deterministic demand aggregation tests |
| HEALTH-01 | 25 | Doctor capability growth health packet |
| HEALTH-02 | 25 | Refresh guidance from existing proof rails |
| HEALTH-03 | 25 | Stale/blocked transition proof with QA-first health preserved |
| TRUST-01 | 26 | Canonical docs/status/shell story |
| TRUST-02 | 26 | CI/parity drift rails |
| TRUST-03 | 26 | Release-gate consumption without release mechanics scope |

**Coverage:** 9 / 9 requirements mapped exactly once.

## Next Up

Start with Phase 24 to build the demand-backed capability growth backlog.

`$gsd-plan-phase 24`

---
*Created: 2026-04-24 via $gsd-new-milestone*
