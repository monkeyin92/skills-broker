# skills-broker Capability Query Router Implementation Plan

Date: 2026-03-30
Status: Drafted from capability-query router spec
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-capability-query-router-design.md`

## Goal

Replace the current fixed-intent request understanding path with a capability-query path that:

- lets hosts and host models describe the job the user wants done
- lets the broker retrieve and rank reusable capabilities for that job
- reduces router surgery when new capability families are added
- preserves backward compatibility during migration

## Non-Goals

- full marketplace UX
- autonomous installation without broker mediation
- removing the current intent path in one breaking PR
- making hosts pick the winning skill themselves

## Current Constraint

The current runtime still assumes:

- `BrokerIntent` is a small fixed enum in `/Users/monkeyin/projects/skills-broker/src/core/types.ts`
- request normalization is hardcoded in `/Users/monkeyin/projects/skills-broker/src/core/request.ts`
- capability cards match mostly by one `intent`

That means this work must be staged carefully.

## Implementation Strategy

Use an additive migration.

Do not delete the intent-based path first.

Instead:

1. introduce capability-query types alongside the current lane model
2. teach capability cards to describe job metadata
3. add broker retrieval/ranking based on query facets
4. add host-model normalization contract
5. migrate existing markdown/discovery lanes onto the new model
6. only then shrink the old fixed-intent path

## Architecture Delta

```text
CURRENT
  host shell
     -> runner
        -> envelope
           -> request.ts fixed-intent normalization
              -> capability cards with single intent
                 -> rank by exact intent
                    -> handoff

TARGET
  host shell
     -> runner
        -> envelope + structured capability query
           -> query validation
              -> capability retrieval over richer metadata
                 -> broker ranking and preparation
                    -> handoff / structured decline
```

## Task Breakdown

### Task 1: Introduce capability-query core types

Add new shared types without breaking the current codepath.

Files:

- `/Users/monkeyin/projects/skills-broker/src/core/types.ts`
- `/Users/monkeyin/projects/skills-broker/src/core/envelope.ts`
- new query-focused helper file if needed

Deliverables:

- `CapabilityQuery`
- query target/artifact/constraint types
- compatibility bridge types for current `BrokerRequest`

Acceptance:

- current build stays green
- existing broker tests still compile without migration

### Task 2: Evolve capability cards from single-intent to richer metadata

Teach capability cards to describe jobs, targets, outputs, and examples.

Files:

- `/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts`
- `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json`
- MCP registry shaping code if needed

Deliverables:

- capability cards support job families or equivalent query-match metadata
- example requests and target/output descriptors
- current markdown and discovery implementations represented in the new form

Acceptance:

- existing capabilities can still be resolved
- new metadata can represent analysis, QA, and similar future workflows without changing the core shape

### Task 3: Add broker-side query retrieval and ranking

Keep ranking in the broker, not in the LLM.

Files:

- `/Users/monkeyin/projects/skills-broker/src/broker/rank.ts`
- `/Users/monkeyin/projects/skills-broker/src/broker/run.ts`
- any retrieval helper added under `src/broker/`

Deliverables:

- rank by job-family match
- rank by target-type match
- rank by artifact match
- preserve current host support, burden, history, and portability signals

Acceptance:

- existing current-lane cases still route correctly
- new query fixtures for analysis and QA-style requests produce the expected candidate ordering

### Task 4: Introduce host-model normalization contract

Define how hosts hand the broker a structured capability query.

Files:

- `/Users/monkeyin/projects/skills-broker/src/core/request.ts`
- `/Users/monkeyin/projects/skills-broker/src/cli.ts`
- host-facing docs and examples

Deliverables:

- support a structured capability-query path in addition to legacy paths
- keep request validation strict
- keep structured decline contract intact

Acceptance:

- broker can accept structured capability queries without falling back to handwritten fixed-intent matching
- current envelope path still works during migration

### Task 5: Define host-shell prompt and runner contract for capability requests

Make hosts ask for structured normalization instead of assuming a tiny set of built-in intents.

Files:

- `/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts`
- `/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts`
- lifecycle output docs if needed

Deliverables:

- host shells describe capability-request threshold
- host shells tell the host model to pass normalized capability queries
- runners still collect safe low-risk hints only

Acceptance:

- Claude/Codex host shells remain thin
- broker-first contract stays intact
- peer-skill repair and downstream ownership assumptions still hold

### Task 6: Migrate existing routed lanes onto capability-query matching

Use the current first lake as migration proof, not as permanent architecture.

Files:

- `/Users/monkeyin/projects/skills-broker/src/core/request.ts`
- `/Users/monkeyin/projects/skills-broker/src/broker/run.ts`
- `/Users/monkeyin/projects/skills-broker/src/broker/handoff.ts`

Deliverables:

- `web_content_to_markdown` represented through query metadata
- `social_post_to_markdown` represented through query metadata
- `capability_discovery_or_install` represented as retrieval/follow-up capability path

Acceptance:

- old behavior preserved for shipping flows
- current lanes no longer depend primarily on exact intent equality

### Task 7: Add new high-value capability families as proof of architecture

Do not stop at content conversion.

Files:

- capability seeds and tests

Recommended first proofs:

- requirements analysis
- QA / web testing

Candidate downstream examples:

- `office-hours`
- `plan-ceo-review`
- `qa`

Acceptance:

- user can request these jobs without naming the skill
- broker can retrieve the right capability family from natural phrasing

### Task 8: Test, smoke, and migration safety

This is where the product either becomes real or stays a clever refactor.

Required tests:

- unit tests for query validation
- capability-card tests for new metadata
- ranking tests for query-based ordering
- CLI contract tests for structured capability query input
- integration tests for backward compatibility
- host-in-the-loop smoke for:
  - Chinese webpage-to-markdown request
  - requirements-analysis request
  - QA request

Acceptance:

- no regression in current published flows
- new capability-query path is proven through at least one non-markdown professional workflow

## Error and Decline Expectations

The migration must preserve the current structured decline model.

Still required:

- `UNSUPPORTED_REQUEST`
- `AMBIGUOUS_REQUEST`
- `NO_CANDIDATE`
- `PREPARE_FAILED`

New failure modes to plan for:

- malformed structured query
- partially filled query
- host emits a query with impossible targets/artifacts
- capability metadata too sparse to rank deterministically

These must fail visibly and predictably.

## Backward Compatibility

The existing published CLI and installed host shells cannot break abruptly.

During migration:

- legacy fixed-intent requests must still work
- existing envelope flows must still work
- lifecycle commands must keep working
- downstream ownership and host-surface repair behavior must stay intact

Only remove the old path after:

- current published flows are migrated
- host shells are updated
- compatibility tests are stable

## Risks

### Risk 1: query shape gets overdesigned

Mitigation:

- keep the first schema small
- only include fields the broker can really rank on

### Risk 2: LLM normalization drifts

Mitigation:

- strict schema validation
- representative fixtures
- broker-side deterministic scoring

### Risk 3: migration leaves permanent duplicated logic

Mitigation:

- explicitly track legacy path removal in TODOs
- add a migration checklist to the plan review before removing old code

## Suggested Delivery Sequence

```text
1. core query types
2. capability-card metadata
3. query ranking
4. structured query input path
5. host-shell normalization contract
6. migrate current lanes
7. add analysis + QA proof families
8. remove reliance on fixed-intent routing
```

## Definition of Done

This plan is done when:

- a user can ask for requirements analysis without naming `office-hours`
- a user can ask for QA without naming `/qa`
- a user can ask for webpage-to-markdown in Chinese and still route cleanly
- adding a new capability family mostly requires metadata and tests
- `request.ts` is no longer the place where every future action gets hardcoded
