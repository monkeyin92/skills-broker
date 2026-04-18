# skills-broker Semantic Resolver + Web Markdown Proof Design

Date: 2026-04-18
Status: Drafted after release review
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-31-broker-first-capability-scaling-design.md`

## Summary

`skills-broker` has now proven one default-entry loop well enough to publish:

- host sends broker-first requests to the broker
- broker can return `INSTALL_REQUIRED`
- install can be verified
- verified winners can be reused across hosts
- `doctor` can prove that loop to operators

That is necessary, but not sufficient.

If the product keeps growing by adding more maintained request families plus more wording variants, it will remain a controlled enum with better phrasing instead of becoming a real capability broker.

The next packet should move one layer upward:

- keep the current install / verify / reuse / doctor machinery
- keep hosts coarse and thin
- add a broker-owned semantic resolver that can rank capability candidates with explicit confidence
- promote `web_content_to_markdown` into the second fully proven family
- replace the hard-coded website-QA-only proof summary with a reusable family-proof surface

This packet is intentionally not "open-domain capability routing."
It is the smallest architecture step that upgrades the broker from maintained-family routing toward explainable semantic capability matching without breaking the proof rails that make the current product trustworthy.

## Product Truth

The user's critique is correct:

- today's system is not exact-string matching
- but it is still strongly bounded by maintained request families
- and unsupported requests do not yet become general semantic capability search

That means the product currently proves:

- cross-host capability execution can be installed, verified, and reused
- operators can inspect that truth through `doctor`
- the broker can own capability truth better than host prompts can

It does not yet prove:

- arbitrary user goals can be mapped to downstream capabilities
- low-confidence requests can be clarified consistently
- new capabilities can join the router through semantic metadata instead of lane-specific logic

This packet should close that second gap without weakening the first.

## Problem Statement

If the next phase is implemented as "add more lanes and more wording variants," three structural problems remain:

1. routing quality still scales with handwritten family logic
2. new families still require schema growth before metadata can help
3. the broker remains only partially responsible for semantic matching

If the next phase instead lets each host model freely interpret requests and search for tools on its own, a different failure set appears:

1. host-to-host routing behavior drifts
2. candidate choice becomes hard to explain and audit
3. `doctor`, strict gates, and cross-host reuse lose a single source of truth

The product therefore needs a middle path:

- semantic matching must move further into the broker
- but execution proof must remain broker-owned and deterministic

## Product Goal

The next shipped packet should make these statements true:

1. `web_content_to_markdown` is proven like `website QA`:
   - install-required observed
   - verify confirmed
   - cross-host reuse confirmed
2. the broker can perform one layer of semantic candidate matching without inventing new maintained lanes first
3. operators can inspect family-level proof state through one reusable JSON/text surface instead of one-off website-QA-only fields
4. unsupported requests still fail closed rather than pretending to be semantically understood

## Non-Goals

This packet does not attempt to:

- solve arbitrary open-domain capability search
- add vector embeddings or external retrieval infrastructure
- turn `capability_discovery_or_install` into autonomous execution
- remove maintained-family logic entirely
- add a third host shell

## Chosen Approach

The chosen approach is a hybrid resolver:

1. keep maintained-family compilation for high-confidence, already-proven families
2. add a broker-owned semantic resolver that can score candidates using explicit metadata
3. start that resolver with one family only: `web_content_to_markdown`
4. generalize `doctor` proof reporting from one hard-coded loop to a family-proof abstraction

This keeps the system explainable.
Every successful route still ends in the same prepare / install / verify / reuse machinery that already works.
The new layer only improves how candidate families are chosen before execution.

## Rejected Approaches

### 1. Keep scaling by maintained-family enums only

Reject because:

- this continues the current ceiling
- every new capability surface requires router surgery
- it proves the install engine but not the matching architecture

### 2. Let hosts do semantic capability search themselves

Reject because:

- it fractures capability truth across hosts
- it makes behavior prompt-shaped instead of product-shaped
- it weakens reuse and doctor observability

### 3. Add embeddings immediately

Reject for this packet because:

- there is not yet enough capability metadata to justify it
- deterministic lexical + structural scoring is easier to validate first
- proof rails should evolve one abstraction at a time

## Architecture

### Current Architecture

Today the high-confidence path is:

- host decides broker-first
- broker compiler normalizes request into one maintained family
- retrieval returns candidates
- ranking chooses a winner
- prepare / install / verify / reuse handles execution truth
- `doctor` exposes one family-specific proof loop for website QA

### New Architecture

The packet should insert one new broker stage and one new operator abstraction:

- `maintained-family compiler`
- `semantic resolver`
- `ranking`
- `prepare / install / verify / reuse`
- `family proof summary`

The compiler remains first because proven families should still take the most explicit path.
The semantic resolver runs when the compiler either cannot decide confidently or when ranking needs more metadata than `compatibilityIntent` alone.

## Semantic Resolver Design

### Inputs

The resolver consumes:

- raw request text
- any structured `capabilityQuery` already present
- discovered capability cards
- current host

### Output

The resolver returns:

- `verdict`
  - `direct_route`
  - `clarify`
  - `unsupported`
- ranked candidate matches
- top-match confidence
- structured reasons

### Scoring Model

The first packet should use a deterministic hybrid score made from:

- query target overlap
- artifact overlap
- job-family overlap
- lexical keyword overlap
- example/alias overlap
- installed/verified preference
- current-host support
- historical successful-route preference

The score should stay fully explainable in code and in traces.

### Confidence Policy

- high confidence -> continue to ranking/prepare
- medium confidence -> return `AMBIGUOUS_REQUEST`
- low confidence -> return `UNSUPPORTED_REQUEST`

This packet should not invent a new host outcome.
It should keep the current broker decline contract and improve the reasons behind it.

## Capability Metadata Changes

The current `CapabilityCard.query` metadata is not rich enough for general semantic matching.

This packet should expand capability metadata with fields shaped for retrieval:

- `summary`
- `keywords`
- `antiKeywords`
- `jobFamilies`
- `targetTypes`
- `artifacts`
- `examples`
- `confidenceHints`
- `proofFamily`

These fields should live in broker-owned types and be populated from the host skill catalog and MCP sources.

The important rule is:

- maintained-family routing remains a compatibility/proof concept
- semantic matching uses capability metadata, not only `intent`

## Family Proof Summary

The current `doctor` implementation contains a dedicated `websiteQaLoop` structure.
That was the right local optimization for the first default-entry packet.
It is now the wrong abstraction for the next phase.

This packet should replace it with a reusable surface such as:

- `familyProofs.website_qa`
- `familyProofs.web_content_to_markdown`

Each family proof summary should expose:

- `installRequiredObserved`
- `verifyConfirmed`
- `crossHostReuseConfirmed`
- `replayReady`
- `phase`
- `verdict`
- `nextAction`

The website-QA proof loop should be re-expressed through this abstraction rather than kept as a one-off special case.

## Why Web Markdown Is The Right Second Family

`web_content_to_markdown` is the best second packet because:

- it already exists in routing, ranking, and discovery
- it already shares the same install / verify / reuse machinery
- it is narrower and less subjective than requirements or investigation
- it is close enough to the website-QA entry path to reuse proof concepts
- it is different enough to prove the broker is not only a QA router

That makes it the right family to promote first.

## Scope Of The First Packet

### In Scope

- add broker-owned semantic resolver infrastructure
- enrich capability metadata for matching
- wire resolver output into ranking for `web_content_to_markdown`
- generalize website-QA proof reporting into family proofs
- add a second family-proof summary for web markdown
- update `doctor --json` and text output accordingly

### Out Of Scope

- semantic resolver support for every family
- OpenCode host support
- automated clarification loops beyond existing ambiguous/unsupported outcomes
- embedding-backed retrieval

## File-Level Design

### New

- `src/broker/semantic-resolver.ts`
  - deterministic semantic scoring
  - confidence verdict derivation
  - top-match explanation helpers

### Modify

- `src/core/types.ts`
  - add semantic verdict and family-proof summary types
- `src/core/capability-card.ts`
  - expand capability metadata used by matching
- `src/sources/host-skill-catalog.ts`
  - validate and load richer matching metadata
- `config/host-skills.seed.json`
  - annotate web markdown entries with semantic metadata and proof family
- `src/broker/rank.ts`
  - incorporate semantic score before fallback intent-only ordering
- `src/broker/run.ts`
  - route through semantic resolver and persist proof-family-aware traces
- `src/shared-home/doctor.ts`
  - replace `websiteQaLoop` hard-coding with reusable family proof summaries
- `src/shared-home/format.ts`
  - render generic family-proof text plus default-family callouts
- `README.md`
  - explain that web markdown is the second proven family
- `README.zh-CN.md`
  - mirror the same product truth

## Data And Trace Design

Routing traces should gain enough data to answer:

- was this route chosen by maintained-family compilation or semantic resolution?
- what was the top candidate confidence?
- which proof family does this route contribute to?

This packet should prefer adding small explicit trace fields rather than storing opaque reasoning text.

## Testing Strategy

### Unit

- semantic resolver score behavior
- confidence thresholds
- metadata loading and validation
- family-proof phase derivation

### Integration

- web markdown `INSTALL_REQUIRED -> verify -> reuse`
- semantic matching still failing closed on unsupported requests
- maintained-family high-confidence paths still outranking weaker semantic guesses

### CLI / Operator

- `doctor --json` emits family proofs for website QA and web markdown
- strict gates remain blocked on unreadable proof rails
- text output remains concise and actionable

## Rollout Plan

### Phase 1

- keep website QA behavior unchanged in product meaning
- re-express website QA proof via family-proof abstraction

### Phase 2

- add semantic resolver and richer metadata
- use it for web markdown only

### Phase 3

- publish web markdown as the second proven loop
- update docs to explain the product as "controlled semantic matching with proof rails," not "open-domain routing"

## Risks

### 1. Fake semantic intelligence

If scores are too loose, the broker will look smarter in demos and worse in reality.
Mitigation: keep strict thresholds and prefer ambiguous/unsupported over weak guesses.

### 2. Proof abstraction regression

If website QA proof behavior changes while being generalized, the current shipped truth could regress.
Mitigation: port website QA first and lock behavior with tests before adding web markdown.

### 3. Metadata sprawl

If metadata becomes too free-form, catalog maintenance cost rises quickly.
Mitigation: keep the first schema small and directly tied to scoring behavior.

## Success Criteria

The packet succeeds when:

1. website QA proof reporting is preserved under a generic family-proof abstraction
2. web markdown has an operator-visible proof loop equivalent to website QA
3. web markdown routing quality improves without adding a new maintained-family enum
4. unsupported requests still fail closed
5. hosts remain thin and unchanged in responsibility

## Open Questions Resolved In This Design

### Should semantic matching live in the host or the broker?

Broker.

### Should this packet add embeddings?

No.

### Should this packet broaden to many families at once?

No.
The second proven family should be web markdown only.
