# Broker-First Phase 2 + Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Date: 2026-04-01
Status: Drafted from the broker-first capability-scaling roadmap
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-31-broker-first-capability-scaling-design.md`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-capability-query-router-design.md`

## Goal

Complete Phase 2 and Phase 3 of the broker-first capability-scaling roadmap:

- shrink Claude Code and Codex down to a coarse broker-first boundary
- move request understanding for broker-first work into a broker-owned raw-request query compiler
- reduce the remaining fixed-intent path to compatibility infrastructure instead of the growth surface

This should turn the current query-first direction into a durable product loop:

- host decides "broker-first, normal, or clarify"
- broker compiles raw request text into a structured capability query
- retrieval and ranking remain deterministic and testable inside the broker

## Non-Goals

- adding many new downstream families in the same slice
- redesigning the shared broker envelope
- building the discovery/install flywheel
- deleting all legacy intent compatibility in one breaking rewrite
- adding OpenCode

## Current State

The repo already has the hard foundations:

- query-led discovery across host catalog, MCP, and workflow sources
- query-first normalization for modern web / social / discovery requests
- `compatibilityIntent` internal routing labels
- shared-home routing traces plus `doctor` rollups
- maintained Phase 2 coarse-boundary eval harness and fixture
- host adapters and host-shell installers for Claude Code and Codex

The remaining bottlenecks are product-boundary bottlenecks:

1. host shell wording still carries too much family-shaped trigger responsibility
2. broker-first raw requests still do not go through a dedicated broker-owned compiler path
3. `BrokerIntent` still survives as the top boundary in `/Users/monkeyin/projects/skills-broker/src/core/request.ts` and `/Users/monkeyin/projects/skills-broker/src/core/types.ts`

## Architecture

Keep the split explicit:

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
BROKER QUERY COMPILER
   | structured capability query or structured decline
   v
RETRIEVAL + RANKING
   | winner or no-candidate / prepare-failed
   v
HANDOFF / DECLINE
```

Rules:

- hosts do not choose a family winner
- runners stay dumb and safe
- compiler is broker-owned and testable
- new families should prefer metadata + compiler evidence + evals, not new top-level `BrokerIntent` members

## File Structure

### Existing files to modify

- [`TODOS.md`](/Users/monkeyin/projects/skills-broker/TODOS.md)
  - keep the roadmap aligned once this phase lands
- [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
  - document the coarse broker-first boundary and compiler-first migration state
- [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
  - sync the same story in Chinese
- [`src/hosts/skill-markdown.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts)
  - make host shell guidance boundary-first instead of family-first
- [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
  - keep generated Claude host shells aligned with the coarse boundary contract
- [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
  - keep generated Codex host shells aligned with the same contract
- [`src/core/request.ts`](/Users/monkeyin/projects/skills-broker/src/core/request.ts)
  - shrink the legacy fixed-intent gate and bridge compiled queries into the broker request model
- [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
  - make `BrokerIntent` compatibility-only and stabilize compiler-facing request types
- [`src/core/capability-query.ts`](/Users/monkeyin/projects/skills-broker/src/core/capability-query.ts)
  - extend validation helpers if the compiler emits richer but still small query fields
- [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
  - route broker-first raw requests through the compiler path and preserve trace attribution
- [`src/broker/rank.ts`](/Users/monkeyin/projects/skills-broker/src/broker/rank.ts)
  - keep deterministic scoring aligned with compiler-emitted facets
- [`src/broker/trace.ts`](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts)
  - keep `normalizedBy`, miss-layer, and surface attribution explicit for compiler-driven paths
- [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
  - assert the generated host shell remains coarse-boundary-first
- [`tests/e2e/host-auto-routing-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/host-auto-routing-smoke.test.ts)
  - prove maintained broker-first families still route cleanly after the compiler path lands
- [`tests/e2e/phase2-coarse-boundary-eval.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/phase2-coarse-boundary-eval.test.ts)
  - keep Claude Code and Codex aligned on the maintained coarse-boundary eval set
- [`tests/fixtures/phase2-coarse-boundary-eval.json`](/Users/monkeyin/projects/skills-broker/tests/fixtures/phase2-coarse-boundary-eval.json)
  - keep the maintained boundary corpus current
- [`tests/core/request-normalization.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)
  - verify compatibility behavior and legacy-path shrinkage
- [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)
  - cover compiler-driven broker flow and trace persistence

### New files to create

- [`src/broker/query-compiler.ts`](/Users/monkeyin/projects/skills-broker/src/broker/query-compiler.ts)
  - broker-owned raw-request compiler for capability queries
- [`tests/broker/query-compiler.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/query-compiler.test.ts)
  - focused unit coverage for compiler behavior and visible failure modes
- [`tests/e2e/phase3-query-compiler-eval.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/phase3-query-compiler-eval.test.ts)
  - maintained bilingual eval proving at least one non-markdown family routes through the compiler path
- [`tests/fixtures/phase3-query-compiler-eval.json`](/Users/monkeyin/projects/skills-broker/tests/fixtures/phase3-query-compiler-eval.json)
  - eval corpus for Chinese and English raw broker-first phrasing

### Files intentionally left alone

- [`config/host-skills.seed.json`](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json)
  - do not add more families in this slice; use the current proof families
- [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
  - lifecycle CLI is not the bottleneck for this phase
- [`src/shared-home/remove.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/remove.ts)
  - removal semantics do not need to change
- [`src/shared-home/host-surface.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/host-surface.ts)
  - broker-owned downstream migration helpers already exist; this phase should consume that foundation, not redesign it

## Task 1: Lock Hosts To A Coarse Broker-First Boundary

**Files:**
- Modify: [`src/hosts/skill-markdown.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts)
- Modify: [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
- Modify: [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
- Modify: [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
- Modify: [`tests/e2e/phase2-coarse-boundary-eval.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/phase2-coarse-boundary-eval.test.ts)
- Modify: [`tests/fixtures/phase2-coarse-boundary-eval.json`](/Users/monkeyin/projects/skills-broker/tests/fixtures/phase2-coarse-boundary-eval.json)

- [ ] **Step 1: Write failing assertions for boundary-first host shells**

Assert that generated host shells:

- describe `broker_first`, `handle_normally`, and `clarify_before_broker` as the primary contract
- do not imply that the host is choosing the final family winner
- preserve the maintained bilingual examples only as boundary guidance

- [ ] **Step 2: Rewrite host shell wording around the coarse boundary**

Keep examples, but make the contract say clearly:

- hosts decide whether something looks broker-first
- runners pass raw text plus safe hints
- broker decides capability understanding and selection

- [ ] **Step 3: Tighten the maintained Phase 2 eval corpus**

Use the existing Phase 2 harness to cover:

- clear broker-first requests
- clear handle-normally requests
- clarify-before-broker requests
- identical expected decisions across Claude Code and Codex

- [ ] **Step 4: Re-run targeted tests**

Run:

```bash
npx vitest run \
  tests/hosts/host-shell-install.test.ts \
  tests/e2e/phase2-coarse-boundary-eval.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hosts/skill-markdown.ts src/hosts/claude-code/install.ts src/hosts/codex/install.ts tests/hosts/host-shell-install.test.ts tests/e2e/phase2-coarse-boundary-eval.test.ts tests/fixtures/phase2-coarse-boundary-eval.json
git commit -m "feat: tighten coarse broker-first host boundary"
```

## Task 2: Introduce A Broker-Owned Raw-Request Query Compiler

**Files:**
- Create: [`src/broker/query-compiler.ts`](/Users/monkeyin/projects/skills-broker/src/broker/query-compiler.ts)
- Modify: [`src/core/request.ts`](/Users/monkeyin/projects/skills-broker/src/core/request.ts)
- Modify: [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
- Modify: [`src/core/capability-query.ts`](/Users/monkeyin/projects/skills-broker/src/core/capability-query.ts)
- Modify: [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
- Create: [`tests/broker/query-compiler.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/query-compiler.test.ts)
- Modify: [`tests/core/request-normalization.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)
- Modify: [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)

- [ ] **Step 1: Write failing compiler tests**

Cover at least these raw broker-first requests:

- requirements analysis in Chinese
- website QA in Chinese and English
- investigation in English
- visible unsupported / ambiguous outcomes when the compiler lacks enough signal

- [ ] **Step 2: Add the compiler layer**

The compiler should:

- accept raw request text plus safe hints
- emit a small structured capability query when confidence is sufficient
- preserve visible failure modes when the query would be malformed or underfilled
- leave pre-structured `capabilityQuery` input untouched

- [ ] **Step 3: Bridge compiler output into the broker request path**

Do not delete compatibility behavior yet.

Instead:

- prefer structured query input when provided
- otherwise let broker-first raw requests flow through the compiler
- keep markdown / discovery legacy compatibility paths working during migration

- [ ] **Step 4: Re-run targeted tests**

Run:

```bash
npx vitest run \
  tests/broker/query-compiler.test.ts \
  tests/core/request-normalization.test.ts \
  tests/integration/broker-flow.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/query-compiler.ts src/core/request.ts src/core/types.ts src/core/capability-query.ts src/broker/run.ts tests/broker/query-compiler.test.ts tests/core/request-normalization.test.ts tests/integration/broker-flow.test.ts
git commit -m "feat: add broker-owned raw request query compiler"
```

## Task 3: Shrink `BrokerIntent` Into A Compatibility Wrapper

**Files:**
- Modify: [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
- Modify: [`src/core/request.ts`](/Users/monkeyin/projects/skills-broker/src/core/request.ts)
- Modify: [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
- Modify: [`src/broker/rank.ts`](/Users/monkeyin/projects/skills-broker/src/broker/rank.ts)
- Modify: [`tests/core/request-normalization.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)
- Modify: [`tests/e2e/host-auto-routing-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/host-auto-routing-smoke.test.ts)

- [ ] **Step 1: Write failing assertions that no new family needs a new top-level intent branch**

The key assertion is product-level:

- requirements analysis, QA, and investigation keep routing through compiler-backed capability queries
- no new `BrokerIntent` member is introduced for those families

- [ ] **Step 2: Reduce the legacy gate**

Make `BrokerIntent` compatibility-only by ensuring:

- existing markdown and discovery flows still derive compatibility intent when needed
- non-markdown professional workflows can route without adding new top-level intent branches
- traces and handoffs still expose enough compatibility context for existing consumers

- [ ] **Step 3: Re-run targeted tests**

Run:

```bash
npx vitest run \
  tests/core/request-normalization.test.ts \
  tests/e2e/host-auto-routing-smoke.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/core/types.ts src/core/request.ts src/broker/run.ts src/broker/rank.ts tests/core/request-normalization.test.ts tests/e2e/host-auto-routing-smoke.test.ts
git commit -m "refactor: shrink broker intent to compatibility shim"
```

## Task 4: Add The Maintained Bilingual Phase 3 Eval Set

**Files:**
- Create: [`tests/e2e/phase3-query-compiler-eval.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/phase3-query-compiler-eval.test.ts)
- Create: [`tests/fixtures/phase3-query-compiler-eval.json`](/Users/monkeyin/projects/skills-broker/tests/fixtures/phase3-query-compiler-eval.json)
- Modify: [`src/broker/trace.ts`](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts)
- Modify: [`tests/broker/trace.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/trace.test.ts)

- [ ] **Step 1: Write the bilingual eval corpus**

The corpus should cover:

- Chinese and English requirements-analysis asks
- Chinese and English website-QA asks
- English investigation asks
- markdown and discovery parity checks
- unsupported and ambiguous raw broker-first requests

- [ ] **Step 2: Make trace attribution explicit for compiler-driven routing**

The maintained eval output should let the team tell:

- host selected broker-first or not
- compiler normalized the request or not
- retrieval / prepare failed or not

- [ ] **Step 3: Re-run the Phase 2 and Phase 3 eval stack**

Run:

```bash
npx vitest run \
  tests/e2e/phase2-coarse-boundary-eval.test.ts \
  tests/e2e/phase3-query-compiler-eval.test.ts \
  tests/broker/trace.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/phase3-query-compiler-eval.test.ts tests/fixtures/phase3-query-compiler-eval.json src/broker/trace.ts tests/broker/trace.test.ts
git commit -m "test: add bilingual query compiler eval coverage"
```

## Task 5: Sync Docs And Migration Tracker

**Files:**
- Modify: [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
- Modify: [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
- Modify: [`TODOS.md`](/Users/monkeyin/projects/skills-broker/TODOS.md)
- Modify: [`CHANGELOG.md`](/Users/monkeyin/projects/skills-broker/CHANGELOG.md)

- [ ] **Step 1: Document the new product contract**

Docs should say clearly:

- hosts now own only the coarse broker-first boundary
- broker owns raw-request query compilation
- legacy `BrokerIntent` is compatibility-only

- [ ] **Step 2: Update the roadmap language**

Once implementation lands:

- mark Phase 2 and Phase 3 accurately in `TODOS.md`
- keep discovery/install flywheel and OpenCode as later work

- [ ] **Step 3: Commit**

```bash
git add README.md README.zh-CN.md TODOS.md CHANGELOG.md
git commit -m "docs: describe broker-first compiler migration"
```

## Task 6: Full Verification And Review Gate

**Files:**
- No new product files; verification only

- [ ] **Step 1: Run targeted verification**

Run:

```bash
npx vitest run \
  tests/hosts/host-shell-install.test.ts \
  tests/e2e/phase2-coarse-boundary-eval.test.ts \
  tests/broker/query-compiler.test.ts \
  tests/core/request-normalization.test.ts \
  tests/integration/broker-flow.test.ts \
  tests/e2e/host-auto-routing-smoke.test.ts \
  tests/e2e/phase3-query-compiler-eval.test.ts \
  tests/broker/trace.test.ts
```

Expected: PASS

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run build
npx vitest run
```

Expected: PASS

- [ ] **Step 3: Run pre-landing review**

The review should specifically check:

- host shells no longer overclaim per-family understanding
- compiler failure modes are visible and tested
- new family growth no longer depends on top-level `BrokerIntent` expansion
- evals actually prove bilingual compiler behavior instead of replaying hand-authored structured queries

- [ ] **Step 4: Land**

Create a PR only after the review is clean.

## Acceptance Checklist

- [ ] Host shells define `broker_first`, `handle_normally`, and `clarify_before_broker` as the coarse contract
- [ ] Claude Code and Codex stay aligned on the maintained Phase 2 coarse-boundary eval set
- [ ] A broker-owned raw-request compiler exists and is covered by focused unit tests
- [ ] At least one non-markdown family routes through the compiler path on a maintained bilingual eval set
- [ ] Markdown and discovery compatibility behavior still works without regression
- [ ] No new top-level `BrokerIntent` member is introduced for requirements, QA, or investigation
- [ ] Routing traces can distinguish host miss, compiler miss, retrieval miss, and prepare miss
- [ ] `npm run build` passes
- [ ] `npx vitest run` passes
- [ ] Docs and roadmap language match the migration state
