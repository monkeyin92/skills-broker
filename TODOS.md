# TODOS

## Host Adapters

### Add Codex adapter after Claude Code v0 stabilizes

**What:** Add a Codex host adapter after the Claude Code-first v0 broker flow is stable.

**Why:** This validates that the broker core is truly host-agnostic rather than accidentally coupled to the first host adapter.

**Context:** The eng review locked v0 to a single first host adapter and the user changed that first host from Codex to Claude Code because the local Codex environment already has too many installed skills for clean testing. Once the Claude Code adapter proves the install flow, capability-card normalization, cache strategy, and handoff boundary, Codex becomes the next best host to verify portability.

**Effort:** M
**Priority:** P2
**Depends on:** Claude Code v0 broker flow is stable end-to-end

## Completed
