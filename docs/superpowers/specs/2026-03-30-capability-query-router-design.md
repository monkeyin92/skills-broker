# skills-broker Capability Query Router Design

Date: 2026-03-30
Status: Active design, partially implemented in `main`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-28-broker-auto-router-design.md`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-host-auto-routing-hit-rate-design.md`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-broker-owned-downstream-capabilities.md`

## Summary

`skills-broker` should stop growing as a fixed-intent router and become a capability-query router.

The core shift is:

- hosts still decide when a request looks like a capability request
- the host model normalizes that request into a structured capability query
- the broker retrieves and ranks the best matching skill, MCP, or broker workflow
- adding new capabilities should mostly mean adding metadata, not editing `request.ts`

This is the path from "route 3 known intents" to "help the user find the right capability even when they do not know the skill name."

## Implementation Status

As of 2026-03-30, the capability-query direction is no longer only a design doc.

The following pieces are already live in `main`:

- shared `capabilityQuery` types and envelope validation
- richer capability cards with `jobFamilies`, `targetTypes`, `artifacts`, and examples
- query-aware ranking instead of pure `intent === requestIntent`
- package-aware and leaf-aware identity on broker candidates and handoff
- proof families for requirements analysis and QA

The following constraint still exists:

- the broker still uses the legacy fixed `BrokerIntent` enum as the top-level lane boundary

So the current product state is:

- structured capability queries are real
- leaf-first capability matching is real
- fixed-intent routing is not fully deleted yet

## Problem Statement

The current broker contract has already proven that:

- thin host shells can invoke a shared broker runtime
- broker-first routing can happen before native host tools
- downstream capabilities can be owned by the broker instead of competing as peer host-visible skills

But the current request understanding model is still too narrow.

Today the shared runtime depends on:

- a small enum in `/Users/monkeyin/projects/skills-broker/src/core/types.ts`
- handwritten normalization rules in `/Users/monkeyin/projects/skills-broker/src/core/request.ts`
- capability cards that expose only one fixed `intent`

That was acceptable for the first lake.
It will not scale to the real product.

If every new capability family requires:

- adding another enum member
- adding more routing rules
- adding more brittle language matching

then the broker becomes a growing action dictionary instead of a capability brain.

This is especially bad for:

- cross-language requests
- natural phrasing
- users who do not know skill names
- high-level requests such as requirements analysis, design review, QA, release, or investigation

## Product Goal

Users should be able to describe the job they want done in normal language, and the broker should find the best capability for that job.

Examples:

- "帮我分析这个需求"
- "帮我做需求分析并产出设计文档"
- "QA 这个网站"
- "检查这个网站质量"
- "把这个页面转成 markdown"

The user should not need to know:

- the exact skill name
- whether the winner is a local skill, MCP, or broker workflow
- whether the best capability lives in gstack, superpowers, or another downstream package

The product feeling should be:

- "I described the work"
- "the broker understood the kind of capability I needed"
- "the broker found the best implementation"
- "I did not have to browse a skill catalog first"

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Hosts can invoke the broker first
  Broker understands a small fixed intent set
  Capability cards carry a single enum intent
  New capability families still require router code changes

THIS PLAN
  Introduce capability-query normalization
  Let the host model produce structured capability queries
  Move from fixed-intent matching to query-to-capability retrieval
  Keep final ranking and handoff under broker control

12-MONTH IDEAL
  Users ask for work, not skill names
  Most new capabilities enter via metadata and examples
  Query understanding works across languages and phrasing
  The broker becomes a reusable cross-host capability search and routing brain
```

## Chosen Approach

The selected approach is:

- use the host model for request understanding
- keep the host shell thin
- keep the runner lightweight
- let the broker own retrieval, ranking, and handoff
- replace single-intent matching with structured capability-query matching

Rejected approaches:

- keep expanding the fixed `intent` enum forever
- let the LLM choose the winning skill directly
- remove all structure and rely on pure free-text semantic search

## Scope

### In Scope

- define what a capability request is
- define a shared structured capability query
- define the host-model normalization step
- evolve capability cards beyond a single fixed intent
- define retrieval and ranking based on query facets
- keep backward compatibility for the current first lake during migration

### Not In Scope

- replacing host-native reasoning for ordinary chat
- making hosts perform ranking themselves
- full marketplace UX in this spec
- autonomous capability installation without broker confirmation
- deleting the current lane model in one breaking rewrite

## Capability Request Definition

A capability request is a user request whose best answer is a reusable skill, MCP, workflow, or structured toolchain.

This includes:

- requirements analysis
- product or strategy brainstorming when a dedicated workflow exists
- QA and site testing
- investigation and debugging workflows
- content retrieval and conversion
- explicit capability discovery and installation

This does not include ordinary model-native work such as:

- casual conversation
- generic summarization with no reusable capability requirement
- simple explanations
- pure drafting when no specialized workflow is needed

The key distinction is:

The user is not only asking for an answer.
The user is asking for a specialized way of working.

## Shared Capability Query

The host should normalize a capability request into a structured query.

Suggested shape:

```json
{
  "kind": "capability_request",
  "goal": "analyze a product requirement and produce a design doc",
  "host": "claude-code",
  "targets": [
    {
      "type": "url",
      "value": "https://example.com"
    }
  ],
  "artifacts": ["design_doc"],
  "constraints": ["needs_structured_output"],
  "preferredCapability": null,
  "requestText": "帮我做需求分析并产出设计文档"
}
```

Required fields:

- `kind`
- `goal`
- `host`
- `requestText`

Optional fields:

- `targets`
- `artifacts`
- `constraints`
- `preferredCapability`
- `metadata`

## Host / Model / Broker Split

### Host shell

Responsibilities:

- decide whether the request crosses the capability-request threshold
- call the runner before native external tooling when it does
- obey the broker's structured decline contract

Non-responsibilities:

- capability ranking
- skill selection
- host-specific copies of business logic for every capability family

### Host model normalization

Responsibilities:

- understand the user's request in natural language
- output a structured capability query
- include obvious targets, artifacts, and constraints when confident

Non-responsibilities:

- choosing the final winner
- inventing capabilities that do not exist in the broker registry

### Runner

Responsibilities:

- collect safe low-risk hints such as cwd, URLs, and attachments
- validate and forward the structured query

### Broker

Responsibilities:

- validate the query
- retrieve matching capabilities
- rank candidates
- prepare the chosen implementation
- return handoff or structured decline

## Capability Card Evolution

Capability cards should stop being defined only by one fixed `intent`.

They should evolve toward richer matching metadata, including:

- supported job families
- supported target types
- output artifacts
- execution surface
- portability
- install burden
- confidence hints

This has already started in `/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts`.

The current runtime now expects capability metadata to carry both:

- retrieval metadata for query matching
- identity metadata for package and leaf routing

That is now the real foundation, not a future abstraction.
- example requests

A future shape can look like:

```json
{
  "id": "office-hours",
  "kind": "skill",
  "label": "Office Hours",
  "jobFamilies": ["requirements_analysis", "idea_brainstorming"],
  "targetTypes": ["text", "problem_statement"],
  "artifacts": ["design_doc", "analysis"],
  "implementation": {
    "id": "gstack.office_hours",
    "type": "local_skill",
    "ownerSurface": "broker_owned_downstream"
  },
  "examples": [
    "帮我分析这个需求",
    "brainstorm this startup idea",
    "help me think through this product idea"
  ]
}
```

The exact field names can evolve during implementation.
The important product rule is:

Capabilities must describe what jobs they are good at, not only which enum they map to.

## Retrieval and Ranking Model

The broker should rank candidates using structured query matching, not only exact intent equality.

Ranking signals should include:

- goal-family match
- target-type match
- artifact match
- explicit capability mention
- current-host support
- preparation burden
- routing history
- portability

The LLM may help normalize the query.
The broker should still own the final scoring and winner selection.

This keeps the system:

- controllable
- debuggable
- explainable

## Why Not Let The LLM Pick The Winner

Because that would collapse understanding and execution policy into one opaque step.

That would make the system:

- harder to debug
- harder to test
- harder to reason about when two capabilities are close
- more likely to produce unstable routing from one prompt phrasing to another

The better split is:

- LLM decides what job the user is asking for
- broker decides which capability should do that job

## Migration Strategy

This should be an incremental migration, not a rewrite.

### Phase 1

- introduce capability query types alongside the current fixed-intent path
- allow existing lanes to be represented as query-friendly metadata

### Phase 2

- make host-model normalization the preferred entry path
- keep current lane-based routing as fallback compatibility

### Phase 3

- expand downstream capability metadata beyond markdown/discovery families
- onboard analysis, QA, and similar reusable workflows

### Phase 4

- reduce dependence on hardcoded request rules
- keep only policy gates, schema validation, and compatibility bridges in `request.ts`

## First High-Value Capability Families After Migration

The first expansion after this architectural shift should focus on clearly reusable professional workflows.

Recommended early families:

- requirements analysis
- product or strategy review
- QA and web testing
- investigation and debugging
- content acquisition and conversion
- capability discovery and installation

This is better than blindly expanding one-off intents.

It maps to the way users actually ask for help.

## Acceptance Criteria

The design is successful when:

- a user can ask for requirements analysis without naming `office-hours`
- a user can ask for QA without naming `/qa`
- a user can ask for webpage-to-markdown in Chinese or English and still route correctly
- adding a new reusable capability usually requires metadata and tests, not router surgery
- `request.ts` stops growing as the universal action dictionary

## Risks

### Risk: the host model emits noisy queries

Mitigation:

- constrain the schema
- validate fields strictly
- keep broker-side ranking deterministic

### Risk: capability metadata becomes too loose

Mitigation:

- require examples
- require artifacts and target-type declarations
- test retrieval quality with representative query fixtures

### Risk: migration creates two routing systems forever

Mitigation:

- make the compatibility bridge explicitly temporary
- track the remaining fixed-intent callers in TODOs and implementation plan

## What This Changes Strategically

This spec changes the product from:

- a broker that knows a few built-in request types

to:

- a broker that helps the user find the right capability for the job they described

That is a much bigger product.
It is also the one that matches the user's real mental model.
