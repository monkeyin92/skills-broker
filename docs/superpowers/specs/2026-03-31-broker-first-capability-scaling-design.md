# skills-broker Broker-First Capability Scaling Design

Date: 2026-03-31
Status: Drafted after CEO review
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-host-auto-routing-hit-rate-design.md`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-capability-query-router-design.md`

## Summary

`skills-broker` should stop trying to scale by adding more trigger wording to host shells.

That path works for a few top-of-funnel requests.
It breaks once the product needs to understand dozens of natural request shapes across languages and hosts.

The next phase should split the system more cleanly:

- hosts decide only whether a request looks broker-first
- runners pass raw request text plus safe hints
- the broker compiles that request into a structured capability query
- retrieval and ranking stay inside the broker

This is the path from "a few prompt-triggered intents" to "a durable cross-host capability router."

## Triggering Product Truth

The immediate forcing function came from a real user workflow on 2026-03-31:

- the user asked `测下这个网站的质量：https://www.baidu.com`
- the installed broker runner could route that request correctly when called directly
- the host still did not choose `skills-broker` first

That means the current bottleneck is not only broker routing quality.

It is the boundary between:

- host skill selection
- broker entry
- broker request understanding

Right now the project is in an unstable middle state:

- the broker core is already moving toward capability routing
- host entry still depends too much on shell wording and skill description phrasing

That is good enough for a first lake.
It is not a stable foundation for 50 to 100 intent families.

## Problem Statement

If the product continues scaling through host prompt examples alone, three bad things happen:

1. hit rate becomes a wording game
2. every new family adds more brittle host-specific phrasing
3. it becomes hard to tell whether a miss came from host selection or broker understanding

This is already visible today.

The broker can understand more than the host can reliably send it.
So the system underperforms even when the downstream capability is already implemented.

The real product risk is now:

- "can obvious broker-first requests reliably reach the broker?"
- "once they reach the broker, can the broker understand many natural phrasing variants without router surgery?"
- "can the team tell which layer failed when routing misses?"

## Product Goal

Users should be able to describe work in natural language without naming a skill.

Examples:

- `测下这个网站的质量`
- `帮我做需求分析`
- `帮我看看这个需求有没有漏洞`
- `把这个页面转成 markdown`
- `有没有现成技能能做这个`

The user should not need to know:

- whether the winner is a local skill, MCP, or broker-owned workflow
- which downstream package owns the implementation
- whether the host needed English examples, Chinese examples, or specific wording

The product feeling should be:

- "I described the job"
- "the host knew this should go to the broker first"
- "the broker understood the kind of work I wanted"
- "the broker either routed correctly or declined clearly"

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Host shells still carry too much trigger responsibility
  Broker can already route some structured capability queries
  Raw-request normalization exists but is still partly handwritten
  Real misses are hard to attribute across host vs broker

THIS PLAN
  Make hosts coarser and more explicit about broker-first boundaries
  Add observable routing traces and miss attribution
  Move request understanding into a broker-owned query compiler
  Grow capabilities through metadata and retrieval, not enum surgery

12-MONTH IDEAL
  Users ask for work, not skill names
  Hosts reliably send broker-first requests to the broker
  Most new capability families ship through metadata + examples + evals
  The broker becomes the cross-host capability brain
```

## Chosen Approach

The chosen approach is:

- keep host shells thin
- let hosts perform only coarse broker-first classification
- keep runners dumb and safe
- move natural-language understanding into the broker
- scale via capability metadata, query compilation, retrieval, and evals

This is a selective expansion strategy.

It does not try to build a full marketplace operating system in one jump.
It also does not keep pretending that more prompt examples will solve the scaling problem.

## Rejected Approaches

### 1. Keep adding trigger wording to `SKILL.md`

Reject because:

- it improves a few phrases but does not scale
- it is host-specific and language-fragile
- it hides the real boundary problem

### 2. Let the host choose the winning capability directly

Reject because:

- it duplicates broker logic into every host
- it makes cross-host behavior drift
- it turns retrieval and ranking into prompt behavior instead of product logic

### 3. Build the full capability OS now

Reject for this phase because:

- it is an ocean, not a lake
- it would bury the real bottleneck under too much new surface area
- the product still needs a clean broker-first entry contract before anything bigger

## Scope

### In Scope

- define a durable broker-first boundary for hosts
- make routing misses observable and attributable
- move toward broker-owned request understanding
- define a phased migration from handwritten normalization to broker query compilation
- define the immediate release work needed to improve live hit rate

### Not In Scope

- adding many new downstream capability families immediately
- full autonomous install flows
- a marketplace UX
- deleting all legacy intent paths in one rewrite
- making hosts semantically smart about every capability family

## Architecture Split

### Host shell

Responsibilities:

- decide whether the request crosses the broker-first threshold
- call the local broker runner with raw text plus safe hints
- obey the broker's structured decline contract

Non-responsibilities:

- fine-grained family classification
- final candidate ranking
- per-family request normalization logic

### Runner

Responsibilities:

- package raw request text
- include only low-risk hints such as URLs, cwd, invocation mode, and explicit attachments
- pass the envelope into the shared runtime

Non-responsibilities:

- intent inference
- fallback policy
- capability ranking

### Broker query compiler

Responsibilities:

- normalize raw request text into a structured capability query
- infer job family, target types, artifacts, and constraints when confident
- preserve structured decline behavior when the request is unsupported or ambiguous

Non-responsibilities:

- guessing capabilities that are not in the registry
- forcing a handoff when confidence is not there

### Broker retrieval and ranking

Responsibilities:

- retrieve candidates from capability metadata
- rank by job-family fit, target fit, artifact fit, examples, portability, and burden
- select the best handoff or produce a structured decline

### Feedback and observability

Responsibilities:

- expose why a request did or did not route
- distinguish host miss from broker miss
- support evaluation against real request phrasing

## Broker-First Boundary Table

The host coarse classifier must be simple, but it cannot be vague.

The rule is:

- if the user is asking for a specialized reusable workflow, capability lookup, or external capability execution, treat it as broker-first
- if the user is asking for ordinary model-native work, keep it in the host
- if the phrase is too underspecified to tell whether the user wants a reusable capability or just casual inspection, do not silently broker-first it

### Broker-first candidate examples

These should enter the broker first.

| User request | Expected host decision | Why |
|---|---|---|
| `测下这个网站的质量：https://www.baidu.com` | `broker_first` | explicit website QA request |
| `QA 这个网站 https://example.com` | `broker_first` | explicit QA workflow ask |
| `检查这个网站质量` | `broker_first` | specialized quality workflow, even without a URL yet |
| `帮我做需求分析并产出设计文档` | `broker_first` | structured analysis workflow, not ordinary chat |
| `帮我看看这个需求有没有漏洞` | `broker_first` | requirements-analysis style workflow |
| `把这个页面转成 markdown: https://example.com/a` | `broker_first` | explicit conversion workflow |
| `convert this webpage to markdown https://example.com/a` | `broker_first` | explicit conversion workflow |
| `find a skill or MCP for website QA` | `broker_first` | explicit capability discovery |
| `有没有现成 skill 能做这个网站 QA` | `broker_first` | explicit capability discovery |
| `investigate this site failure with a reusable workflow` | `broker_first` | specialized workflow ask rather than plain advice |

### Handle-normally examples

These should stay in the host's normal workflow.

| User request | Expected host decision | Why |
|---|---|---|
| `总结一下这个网页讲了什么` | `handle_normally` | summarization ask, not reusable capability routing |
| `Explain this TypeScript error` | `handle_normally` | ordinary coding help |
| `帮我翻译这段话` | `handle_normally` | ordinary model-native task |
| `写一封邮件回复客户` | `handle_normally` | drafting task, not broker-first |
| `这个网站怎么样` | `handle_normally` | too conversational, no workflow signal |
| `check this code` | `handle_normally` | generic coding request |
| `what is on this page` | `handle_normally` | plain reading/summarization |
| `save this webpage as pdf` | `handle_normally` | explicit non-broker output target in current roadmap |

### Clarify-before-broker examples

These should not silently route.

The host should either ask a short clarifying question first or keep the request in normal host flow until the user clarifies.

| User request | Expected host decision | Why |
|---|---|---|
| `check this page` | `clarify_before_broker` | too vague, high false-positive risk |
| `看下这个页面` | `clarify_before_broker` | could mean summarize, debug, or QA |
| `look at this url` | `clarify_before_broker` | not enough workflow signal |
| `检查一下这个链接` | `clarify_before_broker` | not enough to distinguish QA vs plain inspection |
| `test this` | `clarify_before_broker` | missing target and workflow shape |
| `帮我分析一下` | `clarify_before_broker` | missing artifact, target, and job family clues |

Important discipline:

- adding a new family must not require stuffing many more phrases into this table
- this table exists to define the boundary, not to become the classifier itself
- if a future family cannot be placed into one of these three buckets with plain examples, the top-level product boundary is still too fuzzy

## End-State Request Lifecycle

```text
USER REQUEST
   |
   v
HOST COARSE CLASSIFIER
   |
   +--> normal host work -------------------------> host handles normally
   |
   +--> broker-first candidate
           |
           v
        RUNNER
           |
           v
   RAW REQUEST + SAFE HINTS
           |
           v
   BROKER QUERY COMPILER
           |
           +--> UNSUPPORTED / AMBIGUOUS / INVALID
           |        |
           |        +----------------------------> structured decline
           |
           +--> STRUCTURED CAPABILITY QUERY
                     |
                     v
             RETRIEVAL + RANKING
                     |
                     +--> HANDOFF_READY
                     |
                     +--> NO_CANDIDATE / PREPARE_FAILED
```

## Data Model Direction

The long-term broker input should not depend primarily on a growing fixed enum.

The broker should accept and compile toward a structure like:

```json
{
  "kind": "capability_request",
  "requestText": "测下这个网站的质量",
  "goal": "evaluate the quality of a website",
  "jobFamilies": ["quality_assurance"],
  "targets": [
    {
      "type": "url",
      "value": "https://www.baidu.com"
    }
  ],
  "artifacts": ["qa_report"],
  "constraints": [],
  "preferredCapability": null,
  "host": "claude-code"
}
```

Important rule:

- hosts may provide structured queries when they have them
- the broker must also support compiling raw requests during migration
- the broker remains the source of truth for retrieval and ranking

## Legacy Intent Compatibility And Exit Criteria

The existing fixed `BrokerIntent` path in `/Users/monkeyin/projects/skills-broker/src/core/types.ts` and `/Users/monkeyin/projects/skills-broker/src/core/request.ts` should now be treated as compatibility infrastructure, not as the growth surface.

Rules effective immediately:

- no new top-level capability family should be introduced by adding a new `BrokerIntent` member
- new families such as requirements analysis, QA, investigation, and future broker-first workflows should enter through capability-query compilation and retrieval
- the legacy intent path may still carry already shipped markdown and discovery behavior during migration
- bug-fix branches on the legacy path are allowed, but feature expansion on that path is not

The legacy intent gate can only be retired after all of these are true:

1. at least one non-markdown family routes through the raw-request compiler path on a maintained bilingual eval set
2. the current markdown and discovery families achieve equivalent or better routing outcomes through capability-query retrieval
3. two consecutive releases ship without needing a new family-specific top-level intent branch
4. both Claude Code and Codex pass the maintained coarse-boundary eval set without new family-specific host-shell wording

Until those conditions are met:

- `BrokerIntent` remains a compatibility wrapper
- `capabilityQuery` is the preferred growth surface
- engineering review should reject any proposal that expands the router mainly by adding more enum members and more handwritten top-level branches

## Phased Roadmap

### Phase 1: Repair live broker entry and make misses visible

This phase is the next lake.

Goals:

- improve live broker-first hit rate for obvious requests
- stop guessing where misses come from
- fix tooling that currently reports misleading health

Work:

- move key trigger phrasing into host shell frontmatter `description`, not only body text
- add Chinese and English wording for high-value broker-first families such as website QA
- add minimal routing trace output so a miss can be attributed to host skip, broker decline, or prepare failure
- fix `doctor` false positives around host writability so install health can be trusted

Success criteria:

- a direct user phrase like `测下这个网站的质量：https://www.baidu.com` is demonstrably easier to diagnose
- `doctor` no longer reports `not_writable` on successfully managed host paths
- the team can tell whether a routing failure happened before or after broker entry

### Phase 2: Shrink hosts to coarse broker-first classification

Goals:

- stop making hosts carry family-specific logic
- make cross-host behavior more consistent

Work:

- define the broker-first threshold in host shells
- keep examples, but use them as boundary guidance rather than family routing logic
- instruct hosts to pass raw text and safe hints when a request looks like specialized external capability work

Success criteria:

- host shells no longer need new per-family examples to support every new broker capability
- Claude Code and Codex use the same coarse decision model

### Phase 3: Introduce a broker-owned query compiler

Goals:

- move real request understanding into the broker
- make new family support mostly additive

Work:

- add a compiler layer that turns raw text into structured capability queries
- keep current structured query support
- reduce direct dependence on handwritten fixed-intent normalization
- expand capability metadata so retrieval works on family, target, artifact, and examples

Success criteria:

- adding a new family usually means metadata + compiler examples + evals, not new top-level router branches
- broker ranking remains deterministic enough to test

### Phase 4: Expand families through metadata and feedback loops

Goals:

- grow beyond a handful of families without host-shell collapse
- let real usage teach the broker what users actually ask for

Work:

- add high-value families such as requirements analysis, QA, investigation, release, and design workflows
- capture misses and successful manual fallbacks as phrasing evidence
- use eval corpora to tune compiler behavior and ranking
- turn `NO_CANDIDATE` into a discovery or install opportunity when appropriate

Success criteria:

- the system supports many natural request shapes without constant host-prompt patching
- product confidence comes from evals and routing data, not anecdotes

## Routing Trace Contract

Phase 1 observability should be small, but it must be explicit.

The contract is:

- every runner-invoked broker execution should be able to emit one structured routing trace
- the host-in-the-loop eval harness should also be able to record a synthetic trace when the host never invoked the broker, so misses can still be attributed to `host_selection`
- the trace is for diagnosis and tests, not for building a full telemetry platform

Suggested shape:

```json
{
  "traceVersion": "2026-03-31",
  "requestText": "测下这个网站的质量：https://www.baidu.com",
  "host": "claude-code",
  "hostDecision": "broker_first",
  "resultCode": "HANDOFF_READY",
  "missLayer": null,
  "normalizedBy": "raw_request_fallback",
  "requestSurface": "raw_envelope",
  "hostAction": null,
  "candidateCount": 3,
  "winnerId": "website-qa",
  "winnerPackageId": "gstack",
  "timestamp": "2026-03-31T10:00:00Z"
}
```

When the host never invoked the broker during a maintained eval, the harness should record a trace like:

```json
{
  "traceVersion": "2026-03-31",
  "requestText": "测下这个网站的质量：https://www.baidu.com",
  "host": "claude-code",
  "hostDecision": "handle_normally",
  "resultCode": "HOST_SKIPPED_BROKER",
  "missLayer": "host_selection",
  "normalizedBy": null,
  "requestSurface": null,
  "hostAction": "continue_normally",
  "candidateCount": null,
  "winnerId": null,
  "winnerPackageId": null,
  "timestamp": "2026-03-31T10:00:00Z"
}
```

Required fields:

- `resultCode`: one of `HOST_SKIPPED_BROKER`, `UNSUPPORTED_REQUEST`, `AMBIGUOUS_REQUEST`, `NO_CANDIDATE`, `HANDOFF_READY`, `PREPARE_FAILED`
- `missLayer`: one of `host_selection`, `broker_normalization`, `retrieval`, `prepare`, `unknown`, or `null` on success
- `hostAction`: the structured host action chosen for the outcome, when relevant
- `normalizedBy`: one of `structured_query`, `raw_request_fallback`, `legacy_intent`, or `null`
- `candidateCount`
- `winnerId`

Primary consumers:

- `run-broker --debug` or equivalent CLI debug surface
- `tests/e2e/host-auto-routing-smoke.test.ts` and related host-facing smoke coverage
- release verification for routing regressions

This contract must stay small on purpose.

If the trace cannot answer "did the host skip broker, or did broker decline after entry?" then it is too weak.
If it turns into a full analytics platform, it is too big for this phase.

## Metrics And Acceptance Criteria

This plan should be judged by product behavior, not by how many docs or enums were added.

Primary metrics:

- broker-first hit rate
- false positive rate
- handoff-ready rate
- structured-decline clarity rate
- miss attribution rate

Definitions:

- broker-first hit rate: percentage of obvious broker-first requests that actually enter the broker
- false positive rate: percentage of normal host work incorrectly sent to the broker
- handoff-ready rate: percentage of broker-entered requests that produce a correct handoff
- structured-decline clarity rate: percentage of declines that are understandable and actionable
- miss attribution rate: percentage of misses where the team can say whether the host or broker failed

Phase gates:

### Phase 1 gate

- `doctor` false-positive rate for supported host writability checks is `0` in the maintained local test suite
- `100%` of runner-invoked broker paths emit a routing trace with a determinable `resultCode`
- the maintained Phase 1 website-QA eval set attributes `100%` of misses to either `host_selection`, `broker_normalization`, `retrieval`, or `prepare`
- diagnosis of a miss no longer requires ad hoc local debugging

### Phase 2 gate

- adding one new broker family requires changes in broker metadata, compiler, and evals, with `0` required edits to both host install files unless the top-level broker-first boundary itself changes
- Claude Code and Codex agree on at least `90%` of the maintained coarse-boundary eval set
- false-positive routing on the maintained negative eval set stays under `10%`

### Phase 3 gate

- at least one non-markdown family routes through broker query compilation without new host-specific logic
- compiler accuracy on the maintained bilingual eval set is at least `85%` for job-family plus target extraction
- ranking accuracy is at least `90%` on compiler-success cases in the maintained eval set

### Phase 4 gate

- at least three new families ship through metadata, compiler examples, and evals without introducing new `BrokerIntent` members
- adding a new family does not require editing host shell wording except for top-level broker-first positioning

## Evaluation Strategy

The team should maintain an eval set of real user phrasing, not only idealized examples.

At minimum, the eval corpus should include:

- Chinese and English website QA requests
- requirement-analysis requests with and without explicit output asks
- investigation-style requests
- ordinary non-broker requests that must not route
- ambiguous requests that should trigger clarification

Evaluation should happen at three layers:

1. host entry, did the host choose broker-first
2. broker compilation, did raw text become the right structured query
3. retrieval and ranking, did the right family and capability win

## Risks

### 1. Hosts may still overweight frontmatter and underweight body text

That is exactly why Phase 1 needs to move high-value phrasing into frontmatter description and observe the result.

### 2. Query compilation can become another handwritten rule pile

This is why the end state must be metadata-driven and eval-driven, not another giant `request.ts` if-tree.

### 3. Observability can bloat into premature telemetry infrastructure

Do not build a platform.
Add only the routing trace needed to answer "did the host skip broker, or did broker decline?"

### 4. Family expansion can happen before the boundary is stable

That would recreate today's problem at larger scale.
Do not add many new families before Phases 1 and 2 are credible.

## Immediate Next Release Candidate

The next release should be `0.1.7`.

It should focus on the smallest set of changes that improves live truth:

- tighten host shell frontmatter descriptions for broker-first phrasing, especially website QA in Chinese and English
- fix `doctor` host-writability false positives
- add lightweight routing trace or debug surface

This is not the whole roadmap.
It is the first step that makes the roadmap real.

## Likely Implementation Surfaces

These files are the likely starting points for the next engineering review:

- `/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts`
- `/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts`
- `/Users/monkeyin/projects/skills-broker/src/shared-home/detect.ts`
- `/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts`
- `/Users/monkeyin/projects/skills-broker/src/cli.ts`
- `/Users/monkeyin/projects/skills-broker/src/core/request.ts`
- `/Users/monkeyin/projects/skills-broker/src/core/types.ts`
- `/Users/monkeyin/projects/skills-broker/src/broker/run.ts`

Expected doc consumers:

- `/plan-eng-review`, to turn this architecture into a concrete execution plan
- implementation workers, to stage the work without mixing host-boundary repair with long-term broker refactors

## Decision

Do not keep scaling through prompt accretion.

Make hosts dumber.
Make broker entry observable.
Make broker understanding smarter.
Scale through metadata, query compilation, retrieval, and evals.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | No logged run in the last 7 days |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | CLEAR | 12 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | No UI review needed for this plan |

- **UNRESOLVED:** 0
- **VERDICT:** ENG CLEARED — ready to implement.
