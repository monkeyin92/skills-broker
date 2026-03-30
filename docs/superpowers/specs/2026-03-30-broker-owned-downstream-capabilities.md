# skills-broker Broker-Owned Downstream Capabilities Design

Date: 2026-03-30
Status: Drafted after runtime validation
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-28-broker-auto-router-design.md`
Related: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-host-auto-routing-hit-rate-design.md`

## Summary

The current broker-first hit-rate problem is not mainly a wording problem.

It is a surface-area problem.

Today, the host can see both:

- the abstract router: `skills-broker`
- the concrete downstream capability: for example `baoyu-url-to-markdown`

When the user's request strongly matches a concrete skill, the host picks that concrete skill before the broker ever receives first refusal.

This spec changes that model.

The host should expose a single external-capability entrypoint:

- `skills-broker`

Concrete downstream skills and MCP-backed capabilities should remain usable, but they should become broker-owned downstream candidates rather than host-visible peer skills.

## Problem Statement

Recent runtime verification in Claude Code showed:

- a user requested: `将这个页面转为markdown文件：https://docs.antom.com/ac/cashierpay_zh-cn/element`
- Claude chose `baoyu-url-to-markdown` directly
- the request succeeded functionally
- `skills-broker` was never loaded and never got routing authority

This is not a bug in the broker runtime.

It is a product-structure conflict:

- the host is currently allowed to choose between the router and the routed capability at the same decision layer
- the more concrete skill naturally wins
- the broker therefore cannot become the stable cross-host decision point

As long as downstream capabilities remain directly visible to the host, broker-first behavior will remain fragile.

## Product Goal

For host-native external capability work, the user should experience:

- one visible router entrypoint
- one stable decision layer
- many downstream capabilities hidden behind that layer

The target user feeling is:

- "I asked for an external capability"
- "the host handed that request to the broker"
- "the broker chose the right implementation"
- "I did not have to know which concrete skill or MCP actually did the work"

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Broker home exists
  Claude Code + Codex shells exist
  Auto-router contract exists
  Concrete downstream skills are still host-visible peers
  Broker-first hit rate is therefore structurally limited

THIS PLAN
  Make skills-broker the host-visible entrypoint
  Move concrete skills behind the broker as downstream candidates
  Keep host shells thin and broker-owned
  Keep capability selection in the shared broker runtime

12-MONTH IDEAL
  Claude Code, Codex, and OpenCode expose one broker entrypoint
  Downstream skills/MCPs are broker-owned capability implementations
  New lanes can be added without adding new host-visible peer skills
  The broker becomes the durable cross-host capability brain
```

## Chosen Approach

The chosen approach is:

- expose `skills-broker` as the host-visible entrypoint for external-capability work
- stop relying on host-visible peer skills for routed lanes that should be broker-first
- represent concrete skills and MCP-backed tools as broker-owned downstream candidates
- let the broker choose and prepare those candidates after it receives the raw request

Rejected approaches:

- keep concrete downstream skills host-visible and keep tuning router wording
- rely on prompt wording alone to make the broker beat more specific skills
- let each host invent its own direct-skill bypasses for the same routed lanes

## Scope

### In Scope

- define which downstream capabilities should stop being host-visible peers
- define the broker-owned downstream capability model
- define how hosts expose only the broker for broker-first lanes
- define how the broker prepares a handoff to a concrete skill or MCP-backed implementation
- define the migration path for existing Claude Code and Codex installations

### Not In Scope

- redesigning the shared broker envelope
- introducing OpenCode-specific host behavior in this phase
- building a marketplace UI
- auto-installing arbitrary third-party skills from the internet

## Core Product Principle

For broker-first lanes, the host should not decide between:

- router
- concrete skill
- MCP tool

The host should only decide:

- "is this external capability work that belongs to the broker?"

If yes, the host gives the request to the broker.

The broker then decides:

- which downstream capability class applies
- which concrete implementation wins
- whether a routed handoff is ready
- whether the host should degrade gracefully

This is the key architectural correction.

## Host Surface Model

### Host-visible layer

The host-visible layer should contain:

- `skills-broker`

This layer is allowed to include:

- the broker shell
- the broker runner
- host-specific instructions for when broker-first routing applies

This layer should not include peer skills that directly compete with broker-first lanes.

### Broker-owned downstream layer

The broker-owned downstream layer should contain:

- concrete local skills
- MCP-backed capability implementations
- future internally managed wrappers or adapters

Examples:

- `baoyu-url-to-markdown`
- `baoyu-danger-x-to-markdown`
- future `skill-discovery` or `mcp-discovery` capability handlers

These implementations remain real capabilities, but they are no longer part of the host's first routing decision surface.

## Downstream Capability Taxonomy

The broker should treat downstream capabilities as implementations, not as first-class host-visible products.

Each downstream capability should describe:

- `capabilityId`
- `kind`
- `intentFamily`
- `implementationType`
- `invocationContract`
- `hostCompatibility`
- `preconditions`
- `riskNotes`

Example mental model:

```text
capabilityId: baoyu.url_to_markdown
kind: local_skill
intentFamily: web_content_to_markdown
implementationType: claude_skill_wrapper
```

The key change is:

- host chooses broker
- broker chooses capability implementation

## First Migration Targets

The first downstream capabilities to migrate behind the broker should be:

- `baoyu-url-to-markdown`
- `baoyu-danger-x-to-markdown`

Reason:

- both directly compete with the broker's current highest-value lanes
- both are specific enough that the host will otherwise keep selecting them directly
- both are strong proof that broker-owned downstream capabilities are the right model

## Host Behavior Contract

### Before this change

The host can see:

- `skills-broker`
- `baoyu-url-to-markdown`
- other direct skills

Result:

- the host often chooses the most concrete peer skill
- broker-first routing becomes inconsistent

### After this change

For broker-first lanes, the host should see only:

- `skills-broker`

Result:

- the host no longer has a peer-skill shortcut to bypass the broker
- broker-first becomes the default path for those lanes

## Broker Responsibilities

The broker must:

- accept the raw request and safe hints from the host shell
- normalize the request into a broker-supported intent family
- match candidate downstream implementations
- select a winner
- prepare a routed handoff or a structured decline

The broker must not assume the host has already chosen a concrete implementation.

That assumption is exactly what this change removes.

## Handoff Model

The handoff result should continue to be host-consumable, but it now represents:

- a broker-owned choice of downstream implementation

Example outcome shape:

```text
HANDOFF_READY
  chosenImplementation: baoyu.url_to_markdown
  invocationType: local_skill
  invocationPayload: ...
```

This keeps the host thin:

- the host does not know the catalog
- the host does not rank candidates
- the host only executes the prepared handoff path or follows a decline action

## Structured Decline Contract

This spec does not change the existing decline families.

The broker should still return:

- `UNSUPPORTED_REQUEST`
- `AMBIGUOUS_REQUEST`
- `NO_CANDIDATE`
- `PREPARE_FAILED`

What changes is where those outcomes come from:

- they now come after the broker has had true first refusal over the downstream surface

This makes decline behavior more meaningful, because a direct peer skill can no longer silently steal the request first.

## Migration Plan

### Phase 1

- keep current broker runtime contract
- mark direct content-conversion skills as broker-owned downstream candidates in broker metadata
- stop installing those skills as host-visible peers in broker-first host environments

### Phase 2

- teach the broker how to invoke those downstream capabilities through stable wrappers
- ensure Claude Code and Codex only expose `skills-broker` for these lanes

### Phase 3

- extend the same model to discovery/install handlers
- prepare the same surface model for OpenCode

## Acceptance Criteria

This spec is successful when all of the following are true:

- a clear webpage-to-markdown request in Claude Code reaches `skills-broker` before any concrete peer skill
- a clear social-post-to-markdown request reaches `skills-broker` before any concrete peer skill
- the broker can still route to the same concrete downstream implementations
- the user still gets a successful outcome without needing to know the downstream implementation name
- host logs show broker-first invocation where direct-skill invocation previously happened

## Risks

### Risk: temporary reduction in direct-skill convenience

Mitigation:

- this is intentional for broker-first lanes
- the product goal is stable routing, not preserving old direct-skill shortcuts

### Risk: broker catalog quality now matters more

Mitigation:

- this is acceptable and desirable
- quality should concentrate in the broker, not remain fragmented across host-visible peer skills

### Risk: migration confusion for users who manually invoke old skills

Mitigation:

- document the broker-first model clearly
- keep manual escape hatches possible during transition
- avoid silently deleting user-owned skills; only stop broker-managed installations from exposing competing peers

## Open Questions

- should broker-owned downstream skills remain physically installed in host-specific directories but hidden from host routing, or should they move to broker-home-owned storage entirely?
- what is the cleanest wrapper format for broker invocation of local skills across Claude Code, Codex, and future OpenCode?
- should downstream capability metadata live entirely in broker seeds/registry, or partially alongside each implementation?

## Recommendation

Proceed with broker-owned downstream capabilities as the next architectural step.

Do not continue trying to beat concrete peer skills with more shell wording alone.

The router can only become the durable product center if the routed capabilities move behind it.
