# Broker-Owned Downstream Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `skills-broker` the host-visible external-capability entrypoint for broker-first lanes, and move concrete routed abilities behind the broker as downstream implementations rather than host-visible peer skills.

**Architecture:** Do not redesign the shared broker envelope. Keep hosts thin. Change the internal capability model so the broker chooses a downstream implementation, not just a generic candidate. Then add host-surface management so broker-managed installations stop exposing peer skills that compete with broker-first lanes.

**Tech Stack:** Node.js, TypeScript, JSON seed catalogs, shell-installed host wrappers, Vitest

---

## File Structure

### Existing files to modify

- [`src/core/capability-card.ts`](/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts)
  - extend the capability model from generic candidate cards to broker-owned downstream implementation cards
- [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
  - add stable broker-facing implementation metadata types where needed
- [`src/broker/handoff.ts`](/Users/monkeyin/projects/skills-broker/src/broker/handoff.ts)
  - expose the chosen downstream implementation in the handoff envelope
- [`src/broker/prepare.ts`](/Users/monkeyin/projects/skills-broker/src/broker/prepare.ts)
  - preserve downstream implementation metadata through preparation
- [`src/sources/host-skill-catalog.ts`](/Users/monkeyin/projects/skills-broker/src/sources/host-skill-catalog.ts)
  - load richer broker-owned downstream capability metadata from seed catalogs
- [`config/host-skills.seed.json`](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json)
  - represent concrete local skills as downstream implementations rather than generic host-visible skills
- [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
  - prepare for managing broker-visible shells separately from downstream implementations
- [`src/shared-home/remove.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/remove.ts)
  - keep removal semantics aligned once broker-managed host surface changes
- [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
  - document that the Claude host surface should expose the broker entrypoint, not peer routed skills
- [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
  - align Codex wording with the same single-entrypoint model
- [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
  - explain the broker-owned downstream capability model once behavior lands
- [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
  - sync the same model in Chinese
- [`TODOS.md`](/Users/monkeyin/projects/skills-broker/TODOS.md)
  - update roadmap phrasing after the first migration slice lands

### New files to create

- [`tests/broker/downstream-capabilities.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/downstream-capabilities.test.ts)
  - focused tests for broker-owned downstream capability metadata and handoff representation
- [`tests/shared-home/host-surface-management.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/host-surface-management.test.ts)
  - verify broker-managed host surfaces only expose the broker entrypoint for broker-first lanes

### Files intentionally left alone

- [`src/core/request.ts`](/Users/monkeyin/projects/skills-broker/src/core/request.ts)
  - request normalization is already in place; this phase is about capability ownership and host surface, not new lanes
- [`config/mcp-registry.seed.json`](/Users/monkeyin/projects/skills-broker/config/mcp-registry.seed.json)
  - downstream MCP modeling can follow after the local-skill migration slice
- [`src/bin/skills-broker.ts`](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts)
  - lifecycle CLI does not need new commands in the first migration slice

## Task 1: Model Concrete Capabilities As Broker-Owned Implementations

**Files:**
- Modify: [`src/core/capability-card.ts`](/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts)
- Modify: [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
- Modify: [`src/sources/host-skill-catalog.ts`](/Users/monkeyin/projects/skills-broker/src/sources/host-skill-catalog.ts)
- Modify: [`config/host-skills.seed.json`](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json)
- Create: [`tests/broker/downstream-capabilities.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/downstream-capabilities.test.ts)
- Modify: [`tests/core/capability-card.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/capability-card.test.ts)

- [ ] **Step 1: Write failing tests for downstream implementation metadata**

Cover:

- a web-content candidate exposes a stable downstream implementation id
- a social-post candidate exposes a stable downstream implementation id
- the capability card distinguishes broker-owned downstream implementations from generic host-visible skills

- [ ] **Step 2: Extend the capability model**

Add fields that represent:

- downstream implementation id
- implementation type
- ownership surface (`broker_owned_downstream` vs host-visible)

Do not yet change the shared broker envelope.

- [ ] **Step 3: Re-seed the host catalog with real downstream capability identities**

Use explicit implementation-oriented ids such as:

- `baoyu.url_to_markdown`
- `baoyu.x_post_to_markdown`
- `skills_broker.capability_discovery`

- [ ] **Step 4: Re-run targeted tests**

Run: `npx vitest run tests/core/capability-card.test.ts tests/broker/downstream-capabilities.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/capability-card.ts src/core/types.ts src/sources/host-skill-catalog.ts config/host-skills.seed.json tests/core/capability-card.test.ts tests/broker/downstream-capabilities.test.ts
git commit -m "feat: model broker-owned downstream capabilities"
```

## Task 2: Make Handoffs Explicitly Implementation-Oriented

**Files:**
- Modify: [`src/broker/handoff.ts`](/Users/monkeyin/projects/skills-broker/src/broker/handoff.ts)
- Modify: [`src/broker/prepare.ts`](/Users/monkeyin/projects/skills-broker/src/broker/prepare.ts)
- Modify: [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
- Modify: [`tests/broker/handoff.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/handoff.test.ts)
- Modify: [`tests/broker/prepare.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/prepare.test.ts)
- Modify: [`tests/cli/cli-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/cli-contract.test.ts)

- [ ] **Step 1: Write failing tests for implementation-oriented handoff**

Assert that a successful handoff exposes:

- the chosen downstream implementation id
- the implementation type
- the normalized broker request

- [ ] **Step 2: Change handoff shape**

Keep host consumption simple, but make the handoff clearly say:

- which implementation the broker chose
- that the choice came from the broker, not from the host

- [ ] **Step 3: Re-run targeted tests**

Run: `npx vitest run tests/broker/handoff.test.ts tests/broker/prepare.test.ts tests/cli/cli-contract.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/broker/handoff.ts src/broker/prepare.ts src/broker/run.ts tests/broker/handoff.test.ts tests/broker/prepare.test.ts tests/cli/cli-contract.test.ts
git commit -m "feat: expose downstream implementation in broker handoffs"
```

## Task 3: Manage The Host Surface So Broker-First Lanes Stop Competing With Peer Skills

**Files:**
- Modify: [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
- Modify: [`src/shared-home/remove.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/remove.ts)
- Modify: [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
- Modify: [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
- Create: [`tests/shared-home/host-surface-management.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/host-surface-management.test.ts)
- Modify: [`tests/shared-home/update-lifecycle.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/update-lifecycle.test.ts)

- [ ] **Step 1: Write failing tests for host surface management**

Cover:

- broker-managed installs expose `skills-broker` as the broker-first entrypoint
- broker-managed lifecycle logic does not need to expose downstream peer skills for these lanes
- removal still cleans only broker-managed assets

- [ ] **Step 2: Add broker-managed host-surface rules**

The first migration slice should ensure that broker-managed host installs do not introduce peer skills that compete with broker-first lanes.

It is acceptable in this phase to manage only broker-owned installs and leave user-owned direct skills untouched.

- [ ] **Step 3: Re-run targeted tests**

Run: `npx vitest run tests/shared-home/host-surface-management.test.ts tests/shared-home/update-lifecycle.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared-home/update.ts src/shared-home/remove.ts src/hosts/claude-code/install.ts src/hosts/codex/install.ts tests/shared-home/host-surface-management.test.ts tests/shared-home/update-lifecycle.test.ts
git commit -m "feat: manage broker-first host surface"
```

## Task 4: Document The Broker-Owned Capability Model

**Files:**
- Modify: [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
- Modify: [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
- Modify: [`TODOS.md`](/Users/monkeyin/projects/skills-broker/TODOS.md)

- [ ] **Step 1: Update docs**

Document clearly that:

- the broker is the host-visible entrypoint
- downstream capabilities are chosen behind the broker
- users should not need to know downstream implementation names for broker-first lanes

- [ ] **Step 2: Reconcile roadmap language**

Move the roadmap away from "more wording" and toward:

- broker-owned capability migration
- host-surface consolidation
- cross-host downstream capability reuse

- [ ] **Step 3: Commit**

```bash
git add README.md README.zh-CN.md TODOS.md
git commit -m "docs: describe broker-owned downstream capability model"
```

## Task 5: Full Verification And Review Gate

**Files:**
- No new product files; verification only

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npx vitest run tests/core/capability-card.test.ts tests/broker/downstream-capabilities.test.ts tests/broker/handoff.test.ts tests/broker/prepare.test.ts tests/cli/cli-contract.test.ts tests/shared-home/host-surface-management.test.ts tests/shared-home/update-lifecycle.test.ts
```

Expected: PASS

- [ ] **Step 2: Run full build and full tests**

Run:

```bash
npm run build
npx vitest run
```

Expected: PASS, or clearly isolated pre-existing environment issues only

- [ ] **Step 3: Run final review**

Use the normal review workflow and ensure the key risk is addressed:

- the broker now owns the routed downstream capability choice
- the host surface no longer frames routed lanes as peer-skill competition

- [ ] **Step 4: Land**

Create PR, merge after review, then update npm release if the user wants to validate the new runtime in real hosts.
