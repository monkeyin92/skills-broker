# Shared Broker Home For Multi-Host Adapters

Date: 2026-03-27
Status: Accepted architecture direction

## Decision

`skills-broker` should move from a per-host install model to a shared-home model:

- install once
- keep the shared broker home at `~/.skills-broker/`
- let Claude Code, Codex, OpenCode, and future hosts attach through thin host shells
- reuse the same broker runtime, capability cache, and successful routing history across hosts

## Why This Changed

The original Claude Code-first v0 proved that the broker contract can work end to end, but a per-host install model creates the wrong product behavior:

- users would need to install the broker separately for each host
- discovered winners would be fragmented by host
- switching hosts could degrade result quality because discovery would restart from scratch
- the product would still feel like "many isolated host integrations" instead of "one broker with many entry points"

That conflicts with the core promise of the project:

> users should not have to remember skill names, host-specific copies, or where a good capability was first discovered

## Shared Root

The shared broker root is fixed as:

```text
~/.skills-broker/
```

This is intentionally not host-specific.

## What Lives In The Shared Broker Home

The shared home should eventually own:

- broker runtime
- capability cards
- successful routing history
- cache metadata
- discovery seed/config
- future shared install manifests
- shared update state

This data is global because it represents broker knowledge, not host glue.

## What Remains Host-Local

Each host still needs a thin shell that adapts the host to the shared broker home.

Examples:

- Claude Code skill/plugin wrapper files
- Codex skill wrapper files
- host-specific manifest or entry metadata
- host-specific handoff glue

These shells should stay deliberately thin. Their job is not to own discovery, ranking, or cache policy.

## Behavioral Model

### Initial install

The long-term model is:

1. install `skills-broker` once
2. initialize `~/.skills-broker/`
3. detect known hosts already present on the machine
4. install thin shells for detected hosts

### Later host changes

If a user installs a new host after `skills-broker` is already present, they should not need to reinstall everything.

The maintenance command is:

```bash
skills-broker update
```

Its intended behavior:

- update the shared runtime and config in `~/.skills-broker/`
- rescan supported hosts
- install thin shells for newly discovered hosts
- repair missing or broken shells
- preserve cache, capability cards, and successful routing records by default

This command should not act like a destructive reset.

## Implications For Codex Adapter

The Codex adapter should no longer be scoped as "another independent installer."

Instead, it should be the second thin host shell on top of the shared broker home:

- it should call the same broker runtime already used by Claude Code
- it should read the same shared capability knowledge
- it should benefit from successful discoveries made in Claude Code
- it should not create a second isolated capability store under a Codex-only directory

This is the right portability test:

not just "can the code compile for another host"

but:

"can another host reuse the same broker knowledge without fragmenting the product"

## Current Reality vs Next Step

Current shipped v0:

- Claude Code-first
- one workflow: `webpage -> markdown`
- relocatable Claude Code install package

Next architectural step:

- shared broker home at `~/.skills-broker/`
- `skills-broker update` as the shared maintenance entrypoint
- Codex thin host shell on top of the shared home

## Non-Goals For This Decision

This decision does not yet specify:

- the final published `npm` distribution shape
- the exact on-disk schema under `~/.skills-broker/`
- whether future hosts need additional authentication helpers
- whether host detection should be fully automatic or partially configurable

Those remain implementation details for the next phase.
