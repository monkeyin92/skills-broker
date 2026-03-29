# skills-broker Host Auto-Router Design

Date: 2026-03-28
Status: Drafted after CEO review
Supersedes: ad-hoc "improve Claude skill description" fixes

## Summary

`skills-broker` should stop behaving like a single-scenario Claude skill prompt and become a host-agnostic auto-router built on one shared broker contract.

The first version should not attempt to route every possible request. It should:

- accept a shared broker envelope from hosts
- let hosts stay thin
- keep request understanding inside the shared broker runtime
- auto-route only when the user is clearly asking for an external capability
- sit in front of host-native external actions instead of fighting them with trigger words
- support a small first lake of high-value routed lanes

This is the first step from "one hard-coded prompt for webpage to markdown" toward "install once, route capability requests across hosts."

## Problem Statement

The current Claude integration fails for two different reasons:

1. automatic invocation is weak because the installed `SKILL.md` is generic
2. even when `/skills-broker` is explicitly invoked, Claude still handles the task itself instead of calling the broker runner

This is not just a trigger-word problem.

The deeper issue is architectural:

- the host shell does not define a clear execution contract
- the broker core only understands one exact task string
- request understanding is split awkwardly between host prompt wording and broker code

If we keep patching `SKILL.md` descriptions one scenario at a time, the product will become a pile of host-specific trigger hacks.

## Product Goal

Users should be able to write normal requests in Claude Code, Codex, and later OpenCode, and have the host decide:

- this is a normal model-native request, so handle it directly
- this is an external capability request, so route it through `skills-broker`

The long-term product is not "the webpage-to-markdown skill."

The long-term product is:

- one shared broker runtime
- multiple thin host shells
- one shared request contract
- expanding capability support without rewriting each host integration
- one pre-tool routing layer that gets first refusal before the host reaches for external capability tools

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Claude host shell exists
  Broker home exists
  Broker runtime only supports one exact intent
  Host skill prompt is generic and non-executable
  /skills-broker loads the skill, but Claude still chooses WebFetch

THIS PLAN
  Define a shared broker envelope
  Make hosts forward raw user requests plus safe hints
  Move interpretation into shared broker runtime
  Restrict auto-routing to clearly external capability requests
  Treat broker as the pre-tool router for host-native external actions
  Support 2 primary routed lanes plus 1 secondary discovery lane in v1

12-MONTH IDEAL
  Claude / Codex / OpenCode all use the same broker contract
  Hosts remain thin
  Broker grows into the capability-routing brain
  New capability families are added in broker core, not by host prompt surgery
```

## Chosen Approach

The selected approach is:

- shared broker envelope
- thin host shells
- host runners extract only non-ambiguous hints
- broker runtime owns semantic understanding

Rejected approaches:

- host-specific prompt engineering as the main solution
- pure raw-text forwarding with zero hints
- host-side semantic classification before broker handoff

## Scope

### In Scope

- define a shared broker request envelope
- define the host/runner/broker responsibility boundary
- specify first-version auto-routing rules for Claude
- expand broker understanding from one hard-coded task to 2 primary routed lanes plus 1 secondary discovery lane
- design for Claude first, with Codex and OpenCode compatibility in mind

### Not In Scope

- routing all user requests through the broker
- replacing Claude's native tools in general
- making hosts perform their own semantic classification
- building a full marketplace or plugin installation system in this spec
- supporting arbitrary summarization, generic writing, or open-ended transformation tasks

## First-Version Routed Lanes

The first version should support exactly these internal families:

1. primary lane: `web_content_to_markdown`
2. primary lane: `social_post_to_markdown`
3. secondary lane: `capability_discovery_or_install`

Why this set:

- it proves the broker is not single-scenario
- it covers both "bring external content into the workflow" and "recover by finding new capability when current tools are not enough"
- it avoids overlapping too broadly with the model's native reasoning or summarization strengths

Important product distinction:

- the two markdown lanes are first-class auto-routed work
- `capability_discovery_or_install` is not a peer "catch-all assistant intent"
- it should be used for explicit user requests to find/install capability, or as a broker-selected follow-up path after `NO_CANDIDATE`

## Auto-Routing Boundary

Hosts should auto-route only when the request is clearly asking for an external capability.

In practice, the most durable trigger is not "did the user use the perfect keyword" but:

- is the host about to use a native external-content tool such as `WebFetch`
- is the host about to search for, install, or reach for an external capability

The broker should sit in front of those decisions.

Examples that should route:

- "turn this webpage into markdown"
- "save this URL as markdown"
- "convert this tweet/X post into markdown"
- "find a skill for saving webpages"
- "install an MCP or skill that can do this"

Examples that should not route by default:

- "summarize this idea"
- "explain this code"
- "draft a reply"
- "help me think through this design"

Principle:

The broker should handle requests that are about fetching, converting, discovering, or installing capabilities.
It should not steal ordinary model-native work.

This is a pre-tool router, not a general language router.

## Shared Broker Envelope

The host should send one shared request envelope into the broker runtime.

Suggested shape:

```json
{
  "requestText": "turn this webpage into markdown: https://www.baidu.com",
  "host": "claude-code",
  "invocationMode": "auto",
  "cwd": "/Users/example/project",
  "urls": ["https://www.baidu.com"],
  "attachments": [],
  "metadata": {
    "hostCommand": "/skills-broker"
  }
}
```

Required fields:

- `requestText`
- `host`

Optional fields:

- `invocationMode`
- `cwd`
- `urls`
- `attachments`
- `metadata`

This envelope is host-agnostic. Claude, Codex, and OpenCode should all be able to produce it.

## Host / Runner / Broker Responsibility Split

### Host shell

Responsibilities:

- decide whether a request looks like an external capability request
- decide whether the host is about to use a native external-content or capability-acquisition tool
- forward the raw user request to the local runner
- explain to the host model when to use the broker and when not to
- follow the broker's structured degradation contract when no handoff is produced

Non-responsibilities:

- semantic intent classification
- candidate ranking
- host-specific business logic for each capability family

### Runner

Responsibilities:

- receive raw user request text
- extract only low-risk, non-ambiguous hints
- package the broker envelope
- invoke the shared broker runtime

Allowed hints:

- `urls[]`
- `cwd`
- explicit command arguments
- known local attachment paths

Non-responsibilities:

- deciding whether the request means `web_content_to_markdown` or `social_post_to_markdown`
- interpreting user intent beyond obvious mechanical facts

### Shared broker runtime

Responsibilities:

- normalize the request into an internal intent
- discover candidates
- rank candidates
- prepare handoff
- update shared cache and routing history

This is where semantic understanding belongs.

## Claude-Specific Design

Claude's `SKILL.md` should stop being a generic "use this skill when skills-broker should choose" note.

It should become a routing policy plus execution guide:

- route only external capability requests
- do not route normal chat or coding requests
- forward raw user wording to the runner
- do not independently substitute `WebFetch` when the broker should decide

This means the Claude skill must do two jobs:

1. make auto-routing legible to Claude
2. make broker execution explicit once the skill is loaded

And one more boundary must stay explicit:

- when Claude is about to use `WebFetch` or capability-search/install behavior for one of the supported lanes, broker gets first refusal
- when broker returns a structured non-handoff result, Claude degrades according to the returned host action instead of guessing

The core mistake to avoid is relying on frontmatter keywords alone.

## Codex and OpenCode Compatibility

This design intentionally avoids Claude-only semantics.

Because the host shell only forwards:

- raw user request text
- safe hints

the same broker envelope can be generated by:

- Claude Code skill shell
- Codex skill shell
- OpenCode skill shell

OpenCode is out of scope for first implementation, but the envelope is designed so OpenCode does not require a second rewrite.

## Broker Core Changes Required

The current broker request shape:

```json
{
  "task": "turn this webpage into markdown",
  "url": "https://..."
}
```

must be replaced or wrapped by the new broker envelope.

The broker core must add:

- envelope parsing
- intent normalization from free text plus hints
- support for the 3 first-version intent families
- structured failure codes for "unsupported request", "ambiguous request", and "no candidate"

It should stop depending on one exact literal task string.

## Error Model

The first version should distinguish:

- `UNSUPPORTED_REQUEST`
  - broker understands the envelope but this request does not belong to the supported intent set
- `AMBIGUOUS_REQUEST`
  - request likely belongs to broker space but cannot be normalized confidently
- `NO_CANDIDATE`
  - request normalized correctly but no available skill or MCP matches
- `HANDOFF_READY`
  - winner selected and ready to execute

The broker should also provide a host-facing degradation recommendation:

- `continue_normally`
  - for `UNSUPPORTED_REQUEST`
- `ask_clarifying_question`
  - for `AMBIGUOUS_REQUEST`
- `offer_capability_discovery`
  - typically for `NO_CANDIDATE`

Hosts should not improvise this mapping on their own.

## Observability

This design must add visibility on both sides of the host boundary.

At minimum, we need to know:

- was the host skill loaded
- did the host choose broker auto-routing or not
- what envelope was produced
- what intent was normalized
- why the broker rejected or accepted the request
- what host action was recommended after rejection
- whether the final outcome was `HANDOFF_READY` or a structured failure

At minimum, the structured outcome should expose:

- `normalizedIntent`
- `decisionReason`
- `hostAction`

Without this, every future "why didn't broker trigger?" issue becomes guesswork.

## Testing Strategy

### Required tests

- host runner builds the same envelope shape across hosts
- Claude host shell forwards raw request text plus extracted hints
- broker normalizes representative requests for the 2 primary routed lanes plus the explicit discovery lane
- unsupported and ambiguous requests produce structured failures
- auto-routing boundary does not capture normal non-capability requests
- existing cache and handoff flows still work with normalized intents

### Required regression tests

- explicit `/skills-broker` invocation should not regress into host-native direct handling once the skill is loaded
- a request with one URL and extra prose still normalizes correctly
- social content URLs do not fall through to generic web content unintentionally

## Rollout Plan

Phase 1:

- introduce envelope support behind the shared runner path
- keep old single-intent path available only as a temporary compatibility shim if needed

Phase 2:

- upgrade Claude host shell to the new auto-router contract
- verify explicit invocation and automatic invocation separately
- verify Claude gives broker first refusal before native external-content behavior on supported lanes

Phase 3:

- adapt Codex shell to emit the same envelope
- verify shared broker history remains host-agnostic
- verify discovery/install can be reached both explicitly and as a broker follow-up after `NO_CANDIDATE`

## TODOs Unlocked By This Spec

- add OpenCode shell support using the same envelope
- expand the internal intent taxonomy after the first 3 categories are stable
- add richer attachment-aware normalization
- add broker-side clarifying-question support for ambiguous requests

## Success Criteria

This spec is successful when:

1. Claude host shells no longer need one-off prompt surgery per capability
2. broker runtime, not host prompt wording, owns intent normalization
3. first-version users can see that `skills-broker` is more than a single webpage utility
4. the broker sits in front of host-native external actions instead of competing with them via keyword hacks
5. Codex and later OpenCode can adopt the same contract with minimal shell-specific logic
