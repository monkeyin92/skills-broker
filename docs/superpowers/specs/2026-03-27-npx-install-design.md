# skills-broker npx Install Design

Date: 2026-03-27
Status: Draft accepted in conversation

## Summary

`skills-broker` should move from repo-local install scripts to a real user-facing installation flow centered on:

```bash
npx skills-broker update
```

The command should initialize a shared broker home once, detect supported hosts, install thin host shells into those hosts, and preserve the broker's shared knowledge across hosts.

The first release of this flow targets:

- Claude Code
- Codex

## Product Goal

Users should not need to:

- clone the repository
- install the broker separately for each host
- remember where a previous winning skill was first discovered
- manually pass host directories for the common case

The desired user experience is:

1. run `npx skills-broker update`
2. let the broker initialize shared state
3. let the broker detect supported hosts
4. let the broker install or update thin host shells
5. reuse shared capability knowledge across Claude Code and Codex

## Primary Command

The primary command is:

```bash
npx skills-broker update
```

This is the single default entrypoint for installation and maintenance.

The first version should be zero-argument by default.

## Command Behavior

Running `npx skills-broker update` should:

1. initialize `~/.skills-broker` if missing
2. install or refresh the shared broker runtime
3. detect supported hosts
4. write thin host shells into the default host directories
5. preserve cache, capability history, and successful routing records
6. print a clear summary of what happened

If no supported hosts are detected, the command should still succeed after initializing the shared broker home and print guidance.

## Shared Broker Home

The shared broker root is fixed at:

```text
~/.skills-broker/
```

Suggested layout:

```text
~/.skills-broker/
  dist/
  bin/
  config/
  state/
  manifests/
```

Responsibilities:

- `dist/`: broker runtime
- `bin/`: shared executable entrypoints
- `config/`: default config and seed data
- `state/`: cache, routing history, successful routes
- `manifests/`: shared metadata about host attachments

## Host Scope

The first version only auto-detects:

- Claude Code
- Codex

OpenCode and other hosts are explicitly deferred.

## Host Shell Model

Each supported host gets a thin shell, not a second broker installation.

Thin shell responsibilities:

- host-specific manifest or `SKILL.md`
- a runner that points to the shared broker home
- an ownership manifest

The thin shell does not own:

- shared cache
- routing history
- capability cards
- broker runtime logic

## Ownership Model

Each host shell directory should contain a small ownership manifest that identifies it as broker-managed.

Example shape:

```json
{
  "managedBy": "skills-broker",
  "host": "codex",
  "version": "0.1.0",
  "brokerHome": "/Users/you/.skills-broker"
}
```

This allows the updater to distinguish:

- broker-managed directories that are safe to update
- unrelated user-owned directories that should not be overwritten

## Conflict Policy

`skills-broker update` should:

- update directories it already manages
- skip unrelated same-name directories it does not own
- print a clear conflict message when it skips
- never overwrite unrelated host content silently

This is a product rule, not just an implementation detail.

## Detection Rules

For each supported host, detection should classify the host as:

- detected and writable
- detected but not writable
- not detected

Behavior:

- detected and writable: install or update the thin shell
- detected but not writable: leave untouched and print the reason
- not detected: skip without failing the whole command

## Failure Strategy

The command should prefer partial success over all-or-nothing failure.

Rules:

- shared broker home initialization failure: command fails
- single host shell failure: command continues and reports that host as failed
- no host detected: command succeeds with a warning-style summary
- ownership conflict: skip the conflicting host and continue

In short:

- shared layer failure = real failure
- individual host failure = degraded success

## Output Contract

The command should print a compact summary that includes:

- shared broker home path
- detected hosts
- install/update result per host
- whether cache/history were preserved
- any conflicts or skipped hosts

Example shape:

```text
skills-broker updated

Shared home:
  ~/.skills-broker

Hosts:
  Claude Code: installed
  Codex: already up to date
  OpenCode: not detected

State:
  cache preserved
  history preserved

Warnings:
  none
```

## Implementation Boundaries

The work should be split into four clear units:

1. published CLI entrypoint
2. shared-home updater
3. host detectors
4. host shell installers

This keeps host-specific behavior at the edges and preserves one shared broker core.

### Published CLI entrypoint

Owns:

- exposing `skills-broker update`
- argument parsing
- user-facing output

### Shared-home updater

Owns:

- initialization of `~/.skills-broker`
- updating shared runtime assets
- coordinating detectors and installers

### Host detectors

Own:

- discovering default host directories
- checking existence and writability

### Host shell installers

Own:

- writing thin shells
- writing ownership manifests
- keeping host-specific wrappers minimal

## Testing Requirements

Minimum required coverage:

- zero-argument update initializes shared home
- update succeeds when no supported hosts are detected
- Claude Code shell installs into its default host directory
- Codex shell installs into its default host directory
- ownership conflicts are detected and skipped
- rerunning update is idempotent
- capability history remains shared across Claude Code and Codex

## Non-Goals

This design does not yet specify:

- the final npm package publishing workflow
- OpenCode support
- rich interactive prompts
- broad open-domain task coverage

## Next Step

After this spec is accepted, the next artifact should be an implementation plan that turns the shared-home update flow into a published `npx skills-broker update` product command.
