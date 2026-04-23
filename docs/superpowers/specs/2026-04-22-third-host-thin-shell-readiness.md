# Third Host Thin-Shell Readiness Contract

**Date:** 2026-04-22  
**Status:** active design contract  
**Scope:** define the minimum bar for adding a third thin host shell such as OpenCode without forking runtime truth

## Purpose

OpenCode is still deferred. This document exists so "add the third host" stops being a vague backlog wish and becomes an explicit contract the repo can reference, test, and defend.

The goal is not to promise OpenCode implementation in this phase. The goal is to lock the conditions that must already be true before a third host is allowed to land.

## Non-Goals

- implement OpenCode in this document
- create an OpenCode-only runtime
- split the shared broker home by host
- move package, workflow, skill, or MCP choice back into the host entry surface

## Hard Requirements

### 1. Shared broker contract

The third host must emit the same broker envelope and raw request handoff contract already used by Claude Code and Codex.

Required:

- preserve raw request text
- stay at the coarse broker boundary
- choose only `broker_first`, `handle_normally`, or `clarify_before_broker`
- do not choose downstream package, workflow family, skill, or MCP at the host layer

### 2. Shared broker home

The third host must reuse the same shared broker home.

Required:

- one shared broker home under the same install model
- one relocatable runtime
- no host-specific cache fork
- no host-specific capability-memory fork
- no duplicate runtime maintained only for OpenCode

### 3. Thin host shell

The third host must remain a thin host shell.

Required:

- the host shell explains the same coarse boundary as Claude Code and Codex
- the host shell reuses the same operator truth for supported hosts, hero lane, second proven family, and lifecycle wording
- the host shell does not grow a family picker or tool chooser to compensate for future-host work

### 4. Lifecycle parity

The third host must fit the existing published lifecycle surface:

- `npx skills-broker update`
- `npx skills-broker doctor`
- `npx skills-broker remove`

Required:

- `update` can install or repair the third host shell without changing the operator-facing contract for the existing hosts
- `doctor` can report third-host health using the same shared broker home truth
- `remove` can detach the managed host shell without forcing destructive runtime cleanup

### 5. Operator truth parity

The third host must expose the same operator-facing proof surfaces already used elsewhere.

Required:

- `adoptionHealth`
- `familyProofs`
- manual-recovery truth and unblock path
- shared repo truth across `README.md`, `README.zh-CN.md`, `TODOS.md`, `STATUS.md`, and installed shell copy

The new host cannot ship behind a private implementation story that is absent from repo truth.

### 6. Proof/reuse state reuse

The third host must reuse the same proof/reuse state.

Required:

- acquisition/reuse state stays shared
- verified downstream replay state stays shared
- cross-host reuse remains a product goal, not a per-host local maximum
- no OpenCode-only proof rail fork

## Minimum Verification Bar

Before a third thin host shell is considered ready to merge, the repo should have:

1. install or repair coverage proving the new shell can attach through `npx skills-broker update`
2. `doctor` coverage proving the same shared broker home truth remains readable
3. smoke coverage proving installed shell copy still matches the coarse broker boundary
4. parity coverage proving README / README.zh-CN / TODOS / STATUS do not overclaim support
5. proof that existing Claude Code and Codex behavior does not regress

## Readiness Checklist

- [ ] The new host emits the same broker envelope contract
- [ ] The new host reuses the same shared broker home
- [ ] The new host remains a thin host shell
- [ ] `npx skills-broker update` / `doctor` / `remove` keep lifecycle parity
- [ ] `adoptionHealth`, `familyProofs`, and manual-recovery truth stay coherent
- [ ] proof/reuse state stays shared instead of being copied or forked
- [ ] install, smoke, and parity regressions are locked in tests
- [ ] repo docs still say only Claude Code and Codex are supported until the new host actually ships

## Phase Boundary

For Phase 4, the only acceptable outcome is an explicit readiness contract. OpenCode remains deferred until this checklist is satisfied by a later implementation phase.
