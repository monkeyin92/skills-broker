# Host Auto-Routing Hit-Rate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the real host auto-routing hit rate of `skills-broker` in Claude Code and Codex, so obvious external-capability requests reach the broker first, structured declines degrade cleanly, and host-in-the-loop smoke tests become the confidence signal.

**Architecture:** Do not expand the lane surface in this phase. Keep the broker envelope and current first-version lanes intact. Tighten host-shell routing instructions, make host fallback behavior explicit for every broker outcome, add hit-rate-oriented observability, and verify behavior through real host-facing smoke tests instead of relying only on pure broker tests.

**Tech Stack:** Node.js, TypeScript, shell-installed host wrappers, JSON broker outcomes, Vitest

---

## File Structure

### Existing files to modify

- [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
  - tighten Claude shell wording so the broker-first boundary is clearer and less generic
- [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
  - align Codex shell wording with the same broker-first boundary and decline behavior
- [`src/hosts/claude-code/adapter.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/adapter.ts)
  - ensure Claude-facing adapter behavior preserves structured broker outcomes without silent native fallback
- [`src/hosts/codex/adapter.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/adapter.ts)
  - keep Codex aligned with the same structured fallback contract
- [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
  - make decline messages and host-action guidance more explicit and stable for host use
- [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts)
  - preserve host-facing outcome shape and, if needed, add light routing diagnostics without changing the envelope contract
- [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
  - stabilize any host-facing outcome/debug types needed for this phase
- [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
  - assert the installed shells communicate the broker-first contract clearly
- [`tests/e2e/claude-code-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts)
  - extend smoke coverage beyond the single markdown happy path
- [`tests/e2e/shared-home-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts)
  - verify shared-home-installed shells preserve broker-first behavior across hosts
- [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)
  - lock in the host-action mapping for every structured broker decline
- [`tests/cli/cli-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/cli-contract.test.ts)
  - keep the CLI outcome contract stable for host runners
- [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
  - document this phase's real product focus: hit rate and broker-first behavior
- [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
  - sync the same scope and expectations in Chinese
- [`TODOS.md`](/Users/monkeyin/projects/skills-broker/TODOS.md)
  - mark this phase accurately once implementation lands

### New files to create

- [`tests/e2e/host-auto-routing-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/host-auto-routing-smoke.test.ts)
  - dedicated smoke coverage for broker-first host behavior and decline handling
- [`tests/hosts/host-decline-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-decline-contract.test.ts)
  - focused tests for host-visible behavior on `UNSUPPORTED_REQUEST`, `AMBIGUOUS_REQUEST`, `NO_CANDIDATE`, and `PREPARE_FAILED`

### Files intentionally left alone

- [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
  - lifecycle CLI is already shipped; this phase should not re-open install/update design
- [`src/shared-home/doctor.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts)
  - host detection is not the bottleneck in this phase
- [`config/host-skills.seed.json`](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json)
  - lane surface stays fixed in this phase
- [`config/mcp-registry.seed.json`](/Users/monkeyin/projects/skills-broker/config/mcp-registry.seed.json)
  - discovery breadth is not the focus yet

### Branch hygiene note

The working tree currently contains new design docs for this phase. Keep document-only changes separate from later implementation commits where possible.

## Task 1: Tighten The Host Shell Broker-First Contract

**Files:**
- Modify: [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
- Modify: [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
- Test: [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)

- [ ] **Step 1: Write failing shell-install assertions for broker-first behavior**

Add assertions that installed `SKILL.md` text makes these behaviors explicit:

- broker-first for obvious external-capability requests
- no silent substitution of host-native fetch/install tools when broker routing should decide
- clear instruction for what to do when the broker declines

- [ ] **Step 2: Run the targeted host-shell test and verify the current wording is too weak or incomplete**

Run: `npx vitest run tests/hosts/host-shell-install.test.ts`

Expected: FAIL on missing wording about structured decline behavior or broker-first routing specificity

- [ ] **Step 3: Tighten Claude and Codex shell wording**

Update generated shell content so each host shell clearly says:

- what kinds of requests should go to the broker first
- that the runner must receive the raw user request plus safe hints
- that the host should obey broker decline outcomes instead of silently bypassing them

- [ ] **Step 4: Re-run the targeted host-shell test**

Run: `npx vitest run tests/hosts/host-shell-install.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hosts/claude-code/install.ts src/hosts/codex/install.ts tests/hosts/host-shell-install.test.ts
git commit -m "feat: tighten host shell broker-first contract"
```

## Task 2: Make Host Decline Behavior Explicit And Stable

**Files:**
- Modify: [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
- Modify: [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
- Modify: [`src/hosts/claude-code/adapter.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/adapter.ts)
- Modify: [`src/hosts/codex/adapter.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/adapter.ts)
- Create: [`tests/hosts/host-decline-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-decline-contract.test.ts)
- Modify: [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)

- [ ] **Step 1: Write failing tests for host-visible decline behavior**

Cover these cases:

- ordinary request -> `UNSUPPORTED_REQUEST` + `continue_normally`
- underspecified external request -> `AMBIGUOUS_REQUEST` + `ask_clarifying_question`
- supported lane with no candidate -> `NO_CANDIDATE` + `offer_capability_discovery`
- runtime preparation failure -> `PREPARE_FAILED` with a graceful host-visible action

- [ ] **Step 2: Run the targeted decline tests and verify any gaps**

Run: `npx vitest run tests/hosts/host-decline-contract.test.ts tests/integration/broker-flow.test.ts`

Expected: FAIL if messages, host actions, or adapter behavior are incomplete or inconsistent

- [ ] **Step 3: Normalize and stabilize the decline contract**

Ensure:

- each outcome has one stable host action
- each outcome message is understandable to a host prompt author, not only to a TypeScript reader
- adapters do not silently "upgrade" a broker decline into invisible host-native behavior

- [ ] **Step 4: Re-run the targeted decline tests**

Run: `npx vitest run tests/hosts/host-decline-contract.test.ts tests/integration/broker-flow.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/run.ts src/core/types.ts src/hosts/claude-code/adapter.ts src/hosts/codex/adapter.ts tests/hosts/host-decline-contract.test.ts tests/integration/broker-flow.test.ts
git commit -m "feat: stabilize host decline routing contract"
```

## Task 3: Add Hit-Rate-Oriented Routing Diagnostics

**Files:**
- Modify: [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
- Modify: [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts)
- Modify: [`tests/cli/cli-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/cli-contract.test.ts)

- [ ] **Step 1: Write failing CLI assertions for minimal routing diagnostics**

The diagnostics should stay lightweight and host-safe. Examples:

- whether the request was broker-routed or declined
- which host action was selected
- whether a handoff was produced

Do not turn this into a telemetry platform in this phase.

- [ ] **Step 2: Run the targeted CLI contract test and confirm the missing diagnostic surface**

Run: `npx vitest run tests/cli/cli-contract.test.ts`

Expected: FAIL because the desired diagnostic fields are not yet present or not stable

- [ ] **Step 3: Add minimal routing diagnostics**

Keep the scope narrow:

- preserve backward-compatible result shape where possible
- add only the fields needed to debug broker-first behavior and decline handling
- avoid adding host-specific semantics into the broker envelope

- [ ] **Step 4: Re-run the targeted CLI contract test**

Run: `npx vitest run tests/cli/cli-contract.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/run.ts src/cli.ts tests/cli/cli-contract.test.ts
git commit -m "feat: add routing diagnostics for host hit-rate debugging"
```

## Task 4: Shift Confidence To Host-In-The-Loop Smoke Coverage

**Files:**
- Create: [`tests/e2e/host-auto-routing-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/host-auto-routing-smoke.test.ts)
- Modify: [`tests/e2e/claude-code-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts)
- Modify: [`tests/e2e/shared-home-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts)

- [ ] **Step 1: Write failing host-in-the-loop smoke tests**

Cover:

- obvious web markdown request -> broker handoff ready
- obvious social markdown request -> broker handoff ready
- explicit discovery request -> broker receives it first
- ordinary non-broker request -> broker declines cleanly and host action says continue normally

- [ ] **Step 2: Run the targeted smoke tests and verify current gaps**

Run: `npx vitest run tests/e2e/claude-code-smoke.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/host-auto-routing-smoke.test.ts`

Expected: FAIL where smoke coverage does not yet reflect the full broker-first contract

- [ ] **Step 3: Align tests and host wrappers with the hit-rate phase**

Do not fake the result by loosening assertions.

The point of this task is to make real host-facing confidence stronger than pure unit confidence.

- [ ] **Step 4: Re-run the targeted smoke tests**

Run: `npx vitest run tests/e2e/claude-code-smoke.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/host-auto-routing-smoke.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/host-auto-routing-smoke.test.ts tests/e2e/claude-code-smoke.test.ts tests/e2e/shared-home-smoke.test.ts
git commit -m "test: add host auto-routing smoke coverage"
```

## Task 5: Document The New Product Standard

**Files:**
- Modify: [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
- Modify: [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
- Modify: [`TODOS.md`](/Users/monkeyin/projects/skills-broker/TODOS.md)

- [ ] **Step 1: Update docs to describe the real standard for this phase**

The docs should say clearly:

- the broker is already installed and shared
- the current phase is about making hosts ask it first for obvious external-capability work
- success is judged by real host behavior, not by adding lanes first

- [ ] **Step 2: Reconcile roadmap language**

Once the implementation lands:

- mark the hit-rate phase accurately in `TODOS.md`
- keep lane expansion and discovery flywheel as later work

- [ ] **Step 3: Commit**

```bash
git add README.md README.zh-CN.md TODOS.md
git commit -m "docs: describe broker-first hit-rate phase"
```

## Task 6: Full Verification And Review Gate

**Files:**
- No new product files; this is the verification gate

- [ ] **Step 1: Run targeted verification**

Run:

```bash
npx vitest run \
  tests/hosts/host-shell-install.test.ts \
  tests/hosts/host-decline-contract.test.ts \
  tests/cli/cli-contract.test.ts \
  tests/integration/broker-flow.test.ts \
  tests/e2e/claude-code-smoke.test.ts \
  tests/e2e/shared-home-smoke.test.ts \
  tests/e2e/host-auto-routing-smoke.test.ts
```

Expected: PASS

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run build
npx vitest run
```

Expected: PASS

- [ ] **Step 3: Run review before merge**

Run the normal pre-landing review flow after implementation. The review should specifically check:

- whether host shells still overclaim what the broker can do
- whether adapters can silently bypass broker declines
- whether the smoke tests actually validate host behavior instead of merely replaying broker unit assumptions

- [ ] **Step 4: Ship**

Only after the review is clean should this phase be opened as a PR.

## Acceptance Checklist

- [ ] Host shells clearly define broker-first behavior for obvious external-capability requests
- [ ] Every structured broker decline maps to one stable host action
- [ ] Host adapters do not silently bypass broker declines
- [ ] Minimal routing diagnostics exist for hit-rate debugging
- [ ] Host-in-the-loop smoke coverage exists for broker-first routing and clean bypass
- [ ] `npm run build` passes
- [ ] `npx vitest run` passes
- [ ] Docs reflect the hit-rate phase accurately
