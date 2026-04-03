# Broker-First Phase 2 + Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Date: 2026-04-01
Status: Drafted from the broker-first capability-scaling roadmap
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-31-broker-first-capability-scaling-design.md`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-capability-query-router-design.md`

## Goal

Complete Phase 2 and Phase 3 of the broker-first capability-scaling roadmap, but do it in four sequential slices instead of one oversized rewrite.

The product outcome stays the same:

- the host only decides `broker_first`, `handle_normally`, or `clarify_before_broker`
- broker-first raw requests become compiler-backed structured capability queries
- maintained families share one source of truth for evals, gates, and diagnostics
- peer-surface hardening becomes auditable and reversible, not a spooky side effect

```text
USER REQUEST
   |
   v
HOST COARSE BOUNDARY
   | broker_first / handle_normally / clarify_before_broker
   v
RUNNER
   | raw request text + safe hints
   v
BROKER COMPILER + MAINTAINED FAMILY CONTRACT
   | structured capability query / fail-closed decline
   v
RETRIEVAL + RANKING
   | winner / no-candidate / prepare-failed
   v
HANDOFF / DECLINE / DIAGNOSTICS
```

## What Already Exists

The plan is not starting from zero. These pieces already solve part of the problem and should be reused:

- `src/hosts/skill-markdown.ts`, `src/hosts/claude-code/install.ts`, and `src/hosts/codex/install.ts` already generate the coarse broker-first boundary wording.
- `src/core/request.ts` already contains the hidden request-to-capability compiler logic for markdown, discovery, requirements analysis, QA, and investigation.
- `src/broker/run.ts` already supports structured `capabilityQuery` requests and broad discovery.
- `src/broker/rank.ts` already scores candidates deterministically from query facets.
- `src/broker/trace.ts` already distinguishes `normalizedBy`, `requestSurface`, and `missLayer`.
- `src/shared-home/status.ts` already has fail-closed issue handling and partial-truth reporting.
- `src/shared-home/update.ts` and `src/shared-home/host-surface.ts` already detect and migrate competing peer skills.
- `src/shared-home/json-file.ts` already gives us atomic single-file JSON writes for sticky marker state.
- `src/broker/workflow-session-store.ts` already proves the repo's lock-file + stale-lock + heartbeat pattern, so Slice D should reuse that shape instead of inventing a new concurrency model.
- `tests/hosts/host-shell-install.test.ts`, `tests/core/request-normalization.test.ts`, `tests/integration/broker-flow.test.ts`, `tests/e2e/phase2-coarse-boundary-eval.test.ts`, and `tests/e2e/host-auto-routing-smoke.test.ts` already cover the current routing spine.

## NOT in Scope

- Adding more families in the same slice, that just fattens the diff without proving the loop.
- Redesigning the shared broker envelope, because the existing envelope is already good enough for this phase.
- Building the discovery/install flywheel, because that is the next product token, not this one.
- Adding OpenCode, because the current two-host contract needs to be solid before a third host enters.
- Rewriting `doctor`, `status`, or the shared-home lifecycle CLI, because they are consumers, not the bottleneck.
- Deleting all legacy intent compatibility in one pass, because that turns a migration into a rewrite.
- Adding root-audit reset, ledger quarantine repair, or any broader audit-destruction flows, because Slice D is only about peer-surface repair and clear.
- Automatic ledger rotation or compaction, because the peer-surface ledger is low-frequency audit state, not a background log pipeline.
- README, roadmap, TODO, or changelog edits before the repair contract and tests are green, because docs should describe the shipped behavior, not the intended one.

## Slice Plan

### Slice A, maintained-family source of truth + host boundary/eval tightening

This is the first slice. It should land before anything else.

Goal:

- add a single maintained-family contract file as the source of truth for the families we are actively proving
- keep the host shells coarse and explicit about what they are and are not deciding
- tighten the maintained Phase 2 eval set so both Claude Code and Codex stay aligned
- do not change the discovery/install story yet

Files:

- `config/maintained-broker-first-families.json`
- `src/hosts/skill-markdown.ts`
- `src/hosts/claude-code/install.ts`
- `src/hosts/codex/install.ts`
- `tests/hosts/host-shell-install.test.ts`
- `tests/e2e/phase2-coarse-boundary-eval.test.ts`
- `tests/fixtures/phase2-coarse-boundary-eval.json`

Why this comes first:

- the maintained-family list is the source of truth for what this plan is actually proving
- the boundary wording needs to stop pretending the host is making family decisions
- without this slice, every later gate or diagnostics improvement is built on a fuzzy set of families

### Slice B, broker-owned compiler seam

Goal:

- extract the existing request-to-capability logic into a broker-owned compiler seam
- keep compatibility behavior intact while the compiler becomes the preferred path for broker-first raw requests
- make `BrokerIntent` shrink toward compatibility only, not growth surface

Files:

- `src/broker/query-compiler.ts`
- `src/core/request.ts`
- `src/core/types.ts`
- `src/core/capability-query.ts`
- `src/broker/run.ts`
- `tests/broker/query-compiler.test.ts`
- `tests/core/request-normalization.test.ts`
- `tests/integration/broker-flow.test.ts`

### Slice C, gate + diagnostics

Goal:

- make the maintained-family contract drive gate artifacts, freshness checks, and miss diagnostics
- keep `doctor --strict` and CI fail-closed when the gate is missing or stale
- add explicit layer/family/proof diagnostics so a miss says where it failed, not just that it failed

Files:

- `src/shared-home/status.ts`
- `src/broker/trace.ts`
- `src/broker/trace-store.ts`
- `tests/broker/trace.test.ts`
- `tests/cli/lifecycle-cli.test.ts`
- `tests/shared-home/status.test.ts`

### Slice D, peer-surface hardening + manual recovery clear path

Goal:

- harden the peer-surface repair path so every mutation is host-scoped, auditable, and reversible
- add an explicit manual recovery clear path that validates current host state before unblocking
- defer README / roadmap / changelog edits until the repair contract is stable and tested

Files:

- `src/shared-home/peer-surface-audit.ts`
- `src/shared-home/update.ts`
- `src/shared-home/host-surface.ts`
- `src/shared-home/doctor.ts`
- `src/shared-home/format.ts`
- `src/bin/skills-broker.ts`
- `tests/shared-home/update-lifecycle.test.ts`
- `tests/shared-home/host-surface-management.test.ts`
- `tests/cli/lifecycle-cli.test.ts`

Execution shape:

```text
REPAIR
update --repair-host-surface
  -> acquire host lock
  -> machine-check current host surface
  -> refuse if manual-recovery marker already exists
  -> move competing peers behind broker home
  -> append typed repair event to ledger
     -> append fails
        -> rollback moved peers
           -> rollback succeeds => fail closed, no marker cleared
           -> rollback fails    => write sticky manual-recovery marker, fail hard
  -> return migrated peers

CLEAR
update --clear-manual-recovery --host <host> --marker-id <id> ...
  -> acquire same host lock
  -> read marker, verify markerId
  -> machine-check current host surface
  -> refuse unless host is in one canonical healthy state
  -> append typed clear event to ledger
  -> delete marker
```

## Test Matrix

| Slice | Unit tests | Integration tests | E2E / eval | What it proves |
|------|------------|-------------------|------------|----------------|
| A | host shell wording assertions | - | Phase 2 coarse-boundary eval | Hosts are coarse only, and both hosts stay aligned on the maintained family set |
| B | query compiler behavior | broker flow normalization | bilingual compiler eval | Raw broker-first requests compile without expanding the top-level intent surface |
| C | trace summarization and gate helpers | lifecycle CLI strict behavior | maintained gate freshness checks | Gates fail closed and diagnostics explain the failure layer |
| D | peer-surface audit helpers | update lifecycle + lifecycle CLI | repair transaction + manual recovery clear flow | Peer mutations are auditable, rollback-safe, and recoverable without widening the host surface contract |

## Failure Modes

- Maintained-family contract missing or malformed, fail closed instead of silently drifting.
- Compiler underfills a query, return a visible unsupported or ambiguous result instead of inventing certainty.
- Gate artifact stale or missing, `doctor --strict` and CI must fail closed.
- Peer-surface repair fails halfway, rollback must restore the host surface or enter manual recovery.
- Manual recovery clear path sees the wrong marker id or a dirty host surface, refuse the clear.
- Ledger read or append fails, treat the host as blocked instead of silently dropping audit history.

## Parallelization

Sequential implementation, no parallelization opportunity across the code slices until Slice A lands. Slice A is the contract that defines the truth set for the rest of the work.

## Slice A Checklist

- [x] Create `config/maintained-broker-first-families.json` as the single maintained-family source of truth.
- [x] Update host shell wording so it only states the coarse boundary and does not imply family selection.
- [x] Tighten the maintained Phase 2 eval corpus so Claude Code and Codex stay aligned.
- [x] Add failing tests before changing the host wording or eval fixture.
- [x] Re-run the targeted host-shell and Phase 2 eval tests.

## Slice B Checklist

- [x] Extract the compiler seam from `src/core/request.ts` into `src/broker/query-compiler.ts`.
- [x] Keep compatibility behavior intact while broker-first raw requests go through the broker-owned compiler path.
- [x] Add focused compiler unit tests for supported, unsupported, and ambiguous inputs.
- [x] Re-run request-normalization and broker-flow tests.

## Slice C Checklist

- [x] Route maintained-family contract data into gate freshness and diagnostics.
- [x] Make miss diagnostics explicit by layer and family.
- [x] Add or update trace tests so compiler misses and retrieval misses are distinguishable.
- [x] Re-run CLI strict-mode and trace tests.

## Slice D Checklist

- [x] Add one small peer-surface audit helper that owns ledger paths, marker paths, append/read helpers, and the host-scope lock.
- [x] Keep `src/shared-home/host-surface.ts` focused on detection plus move/rollback primitives, not CLI parsing or report formatting.
- [x] Reuse one shared host-state machine-check across `doctor`, repair, and clear so the CLI does not invent three slightly different definitions of "healthy".
- [x] Make `update --repair-host-surface` transactional: detect -> move peers -> append ledger -> rollback on any failure -> write sticky manual recovery marker only when rollback itself fails.
- [x] Add an explicit clear path that requires `--clear-manual-recovery`, `--host`, `--marker-id`, and structured evidence, then re-checks the current host surface before deleting the marker.
- [x] Surface manual recovery state in `doctor` and text/JSON formatting so operators can see the blocker and the next command.
- [x] Keep ledger reads typed and fail-closed. Unknown version, unknown event type, or malformed line must block trust in the history instead of being skipped.
- [x] Re-run shared-home lifecycle, host-surface management, and lifecycle CLI tests before touching docs.

## Architecture

Keep the split explicit:

```text
Slice A -> Slice B -> Slice C -> Slice D
   |         |         |         |
   v         v         v         v
contract  compiler   gate     repair
truth     seam       surface   + audit
```

Rules:

- hosts do not choose a family winner
- Slice A must land before any compiler or gate work starts
- compiler logic stays broker-owned and testable
- new families should prefer contract data + compiler evidence + evals, not new top-level `BrokerIntent` members
- Slice D should add exactly one new helper module, `src/shared-home/peer-surface-audit.ts`, and keep all other changes inside existing lifecycle consumers.
- Slice D should reuse the existing lock-file pattern from workflow session storage, but must not modify workflow persistence just to share code.

## What the slices mean for execution

Slice A is the forcing function. It defines the maintained family set and locks the host boundary wording before the compiler work starts.
Slice B can then extract the existing compiler seam without inventing a second compiler.
Slice C can wire the maintained contract into gates and diagnostics.
Slice D should first harden peer-surface mutation with one host-scoped audit contract.
Only after that lands should docs and roadmap language be updated.

That order matters. If we skip it, the plan becomes a pile of features with no stable truth source.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 2 | ISSUES OPEN | 12 proposals, 12 accepted, 0 deferred |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 7 | CLEAN | mode: SCOPE_REDUCED, 11 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

- **UNRESOLVED:** 0
- **VERDICT:** ENG CLEARED. CEO review still carries optional product follow-ups, but this implementation plan is now ready to execute in the reduced Slice D shape.
