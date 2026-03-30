# skills-broker Host Auto-Routing Hit-Rate Design

Date: 2026-03-30
Status: Drafted after CEO review
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-28-broker-auto-router-design.md`

## Summary

The next phase of `skills-broker` should not focus on adding more lanes first.

The highest-value problem now is:

- making Claude Code and Codex reliably hand obvious external-capability requests to the broker
- keeping the broker's refusal and fallback behavior predictable
- proving the broker is a real pre-tool router in host-native workflows, not just an installed shell

This spec defines the first hit-rate-focused iteration.

It assumes the current shared broker envelope, thin host shells, and first-version routed lanes already exist in `main`.

## Problem Statement

The project has already crossed the hardest infrastructure threshold:

- published lifecycle CLI exists
- shared broker home exists
- Claude Code and Codex thin shells exist
- broker auto-router contract exists

The bottleneck has changed.

The product risk is no longer:

- "can users install this?"
- "can hosts share the same runtime?"
- "can the broker technically route a request?"

The product risk is now:

- "does the host actually choose the broker often enough in real workflows?"
- "when the broker declines, does the host recover cleanly?"
- "does the user start trusting the broker as the first stop for external capability work?"

If the broker is only technically available but not regularly chosen, the system will remain a well-engineered demo.

## Product Goal

For clearly external-capability requests, the host should prefer `skills-broker` before reaching for host-native external tools.

The target user feeling is:

- "I asked for an external capability"
- "the host asked the broker first"
- "the broker either routed correctly or declined cleanly"
- "I did not have to think about which skill, tool, or MCP should be used"

This phase is not about adding many new abilities.

It is about proving the broker is the durable decision point in front of those abilities.

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Shared broker home is shipped
  Claude Code + Codex thin shells are shipped
  Broker envelope and first auto-router contract are shipped
  Three internal lanes exist
  Real host hit-rate is still not the product's strongest point

THIS PLAN
  Tighten host-side routing criteria
  Make broker entry more obvious and more consistent
  Make refusal/fallback behavior crisp and host-specific
  Add host-in-the-loop smoke coverage and hit-rate observability

12-MONTH IDEAL
  Hosts naturally ask the broker first for external capability work
  Broker rejection paths are trusted and predictable
  More lanes can be added without degrading host confidence
  The broker becomes the cross-host capability brain
```

## Chosen Approach

The chosen approach is:

- improve real host auto-routing hit rate before expanding the lane surface
- treat the broker as a pre-tool router in front of host-native external actions
- define explicit host fallback behavior for every structured broker decline
- measure success through host-in-the-loop smoke behavior, not only pure broker tests

Rejected approaches:

- add more lanes first and hope usage catches up later
- keep iterating on vague shell wording without measuring real host behavior
- make hosts more semantically "smart" instead of keeping understanding centered in the broker runtime

## Scope

### In Scope

- tighten host shell instructions for when the broker should be invoked
- define a more explicit routing decision hierarchy for Claude Code and Codex
- refine broker structured outcomes for host fallback behavior
- add host-in-the-loop smoke coverage for real auto-routing behavior
- define hit-rate-oriented observability and acceptance criteria

### Not In Scope

- adding OpenCode in this phase
- expanding the routed lane taxonomy beyond the current first-version families
- building a full capability marketplace or autonomous install loop
- routing ordinary chat, coding, or summarization through the broker

## What Counts As A Broker-First Request

The host should ask the broker first when the user is clearly requesting:

- web content retrieval and conversion to markdown
- social content retrieval and conversion to markdown
- explicit discovery or installation of external capability

The host should not ask the broker first for:

- general conversation
- code explanation
- ordinary summarization
- writing tasks
- design or strategy brainstorming

The practical standard is not keyword perfection.

The practical standard is:

- would the host otherwise reach for a native external-content tool?
- would the host otherwise try to find, install, or select an external capability?

If yes, the broker should get first refusal.

## Routing Decision Hierarchy

The host should follow this decision order:

```text
USER REQUEST
   |
   v
Does this look like ordinary model-native work?
   | yes
   +--------------------> Handle normally
   |
   no
   |
   v
Does this look like external capability work?
   | no
   +--------------------> Handle normally
   |
   yes
   |
   v
Call skills-broker runner with raw request + safe hints
   |
   v
BROKER OUTCOME
   |
   +--> HANDOFF_READY ------------------> execute routed capability path
   |
   +--> UNSUPPORTED_REQUEST -----------> host handles normally
   |
   +--> AMBIGUOUS_REQUEST -------------> host asks a clarifying question
   |
   +--> NO_CANDIDATE ------------------> host offers capability discovery path
   |
   +--> PREPARE_FAILED ----------------> host shows graceful failure and avoids silent fallback
```

This hierarchy is the key product contract of this phase.

## Host / Runner / Broker Responsibilities

### Host shell

Responsibilities:

- detect whether the request belongs to obvious external-capability work
- invoke the local broker runner before native external tools
- obey the broker's structured fallback contract
- avoid silently bypassing the broker once a request has crossed the broker-first threshold

Non-responsibilities:

- lane classification
- candidate discovery
- winner ranking

### Runner

Responsibilities:

- accept raw user request text
- collect only low-risk, non-ambiguous hints such as URLs, cwd, invocation mode, and explicit attachments
- pass the shared broker envelope into the shared runtime

Non-responsibilities:

- semantic interpretation
- fallback policy

### Broker runtime

Responsibilities:

- normalize request intent
- decide whether the request fits a supported broker lane
- produce either a handoff or a structured decline
- tell the host how to degrade cleanly

## Structured Decline Contract

This phase should make host fallback behavior explicit, not implicit.

The broker should always return one of:

- `HANDOFF_READY`
- `UNSUPPORTED_REQUEST`
- `AMBIGUOUS_REQUEST`
- `NO_CANDIDATE`
- `PREPARE_FAILED`

The host should map those outcomes to actions:

| Broker outcome | Host action | User experience goal |
|---|---|---|
| `HANDOFF_READY` | execute broker-selected path | the broker feels like the right router |
| `UNSUPPORTED_REQUEST` | continue normally | the broker declines cleanly without friction |
| `AMBIGUOUS_REQUEST` | ask a clarifying question | ambiguity is surfaced, not guessed |
| `NO_CANDIDATE` | offer capability discovery/install path | failure becomes a growth opportunity |
| `PREPARE_FAILED` | show a graceful error, do not silently bypass | trust is preserved through explicit failure |

The host should never silently turn a broker decline into an invisible native tool call if the user would reasonably assume the broker was used.

## Acceptance Criteria

This phase is successful when the following become true:

### Product-level success

- obvious web and social markdown requests are routed through the broker more reliably in real host sessions
- explicit discovery/install requests consistently reach the broker first
- broker declines feel understandable instead of mysterious

### Engineering-level success

- host shell wording and runner invocation are stable and thin
- broker refusal paths are fully covered by host-facing tests
- real-host smoke tests become the primary confidence signal for routing behavior

### Non-goals for this phase

- maximizing the absolute number of supported lane families
- making the broker the first step for all prompts

## Observability

This phase should add observability aimed at routing quality, not generic logging noise.

At minimum, capture:

- how often a host shell invokes the broker runner
- which structured outcomes are returned
- how often each host action path is taken
- whether the request was explicit or automatic

Useful first metrics:

- broker invocation count by host
- outcome count by host and outcome code
- ratio of `HANDOFF_READY` to all broker invocations
- ratio of `UNSUPPORTED_REQUEST` and `AMBIGUOUS_REQUEST`
- number of `NO_CANDIDATE` outcomes that lead to later successful discovery/install

## Test Strategy

This phase should shift confidence upward from pure broker-unit confidence to host-behavior confidence.

Required coverage:

- host shell install tests verifying the broker-first wording is specific and durable
- runner contract tests verifying raw request + hints are forwarded correctly
- broker integration tests for every structured decline outcome
- host-in-the-loop smoke tests for:
  - web content routing
  - social content routing
  - explicit discovery routing
  - normal requests correctly bypassing broker

If the host can still silently choose native tools for an obvious broker-first request, this phase is not complete.

## Rollout Strategy

This should ship as a tightening pass, not as a broad new-surface launch.

Recommended order:

1. tighten host shell wording and runner contract
2. make structured fallback behavior explicit
3. add host-in-the-loop smoke coverage
4. verify routing behavior in real local sessions
5. only after confidence rises, expand lane surface

## Why This Phase Matters

The project has already proven that a shared broker runtime can exist.

This phase determines whether that runtime becomes:

- a real product decision point

or:

- an installed abstraction that hosts usually ignore

The long-term moat is not just "we can route capabilities."

The long-term moat is:

- hosts ask the broker first
- the broker makes better decisions
- the shared home remembers what works
- new capability surface compounds on top of that trust
