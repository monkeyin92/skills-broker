# skills-broker npx Install Design

Date: 2026-03-28
Status: Revised after CEO review

## Summary

`skills-broker` should move from repo-local install scripts to a real user-facing installation and maintenance flow centered on:

```bash
npx skills-broker update
```

But the product surface should not stop at a single install command. The first public CLI should present a trustworthy lifecycle:

- `update` to initialize and sync
- `update --dry-run` to preview changes
- `doctor` to diagnose environment problems
- `remove` to detach managed host shells safely
- `--json` on all lifecycle commands for automation

The command surface should initialize a shared broker home once, detect supported hosts, install thin host shells into those hosts, preserve shared broker knowledge across hosts, and remain safe to inspect, troubleshoot, and reverse.

The first release of this flow targets:

- Claude Code
- Codex

## Product Goal

Users should not need to:

- clone the repository
- install the broker separately for each host
- remember where a previous winning skill was first discovered
- manually pass host directories for the common case
- guess what the tool is about to modify
- manually clean up the system if they stop using it

The desired user experience is:

1. run `npx skills-broker update`
2. let the broker initialize shared state in `~/.skills-broker`
3. let the broker detect supported hosts
4. let the broker install or update thin host shells
5. let Claude Code and Codex reuse one shared broker knowledge base
6. optionally preview with `--dry-run`, diagnose with `doctor`, and roll back managed shells with `remove`

## Primary Command Surface

The primary user-facing CLI should be:

```bash
npx skills-broker update
npx skills-broker update --dry-run
npx skills-broker doctor
npx skills-broker remove
```

This is a single product, not a loose collection of scripts.

The first version should be zero-argument by default for the common case, while still supporting explicit escape hatches for advanced environments.

## Package Name Strategy

The product goal is to ship the canonical entrypoint:

```bash
npx skills-broker update
```

However, npm package naming is an external dependency and should not be left implicit.

The spec should assume:

- preferred package name: `skills-broker`
- fallback if unavailable: a scoped package, while preserving `skills-broker` as the long-term product goal

This prevents the entire launch plan from hinging on a last-minute package-name surprise.

## Command Behavior

### `update`

Running `npx skills-broker update` should:

1. initialize `~/.skills-broker` if missing
2. install or refresh the shared broker runtime
3. detect supported hosts
4. write thin host shells into the default host directories
5. preserve cache, capability history, and successful routing records
6. print a clear summary of what happened

If no supported hosts are detected, the command should still succeed after initializing the shared broker home and print guidance.

### `update --dry-run`

Running `npx skills-broker update --dry-run` should:

- perform the same detection and planning logic as `update`
- show what shared-home changes and host-shell writes would happen
- show conflicts, missing hosts, and unwritable directories
- make no filesystem changes

This is part of the first public trust surface, not a later nicety.

### `doctor`

Running `npx skills-broker doctor` should:

- read the current shared broker home state
- detect Claude Code and Codex
- check writability and ownership manifests
- explain why a host was not detected or not updated
- never modify the filesystem

This is the primary troubleshooting command.

### `remove`

Running `npx skills-broker remove` should by default:

- remove only `skills-broker`-managed host shells
- preserve `~/.skills-broker`
- print what was removed and what was preserved

An explicit destructive flag should be available for full cleanup of the shared broker home. The implemented flags are `--purge` and `--all` (alias), with `remove` remaining the safe default.

## Escape Hatches

The default path is zero-argument automation, but the first version should still include optional overrides for non-standard environments:

- `--broker-home`
- `--claude-dir`
- `--codex-dir`

These are not second-class features. They are the support burden reducers for high-agency users with custom setups.

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
- `manifests/`: shared metadata about host attachments and ownership

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

This allows the lifecycle commands to distinguish:

- broker-managed directories that are safe to update or remove
- unrelated user-owned directories that should not be overwritten

## Conflict Policy

Lifecycle commands should:

- update directories they already manage
- remove only directories they manage
- skip unrelated same-name directories they do not own
- print a clear conflict message when they skip
- never overwrite or delete unrelated host content silently

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

The command surface should prefer partial success over all-or-nothing failure.

Rules:

- shared broker home initialization failure: command fails
- single host shell failure: command continues and reports that host as failed
- no host detected: command succeeds with a warning-style summary
- ownership conflict: skip the conflicting host and continue
- `doctor`: should not fail merely because a host is missing; it should explain the state
- `remove`: should continue even if one host shell was already absent

In short:

- shared layer failure = real failure
- individual host failure = degraded success
- read-only diagnosis = success with findings

## Output Contract

The default output should be human-readable text summaries.

Each lifecycle command should also support `--json`.

Minimum JSON support:

- `update --json`
- `update --dry-run --json`
- `doctor --json`
- `remove --json`

Human-readable output should include:

- shared broker home path
- detected hosts
- install/update/remove result per host
- whether cache/history were preserved
- conflicts, unwritable paths, and skipped hosts

Example text shape:

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

Example JSON shape:

```json
{
  "command": "update",
  "sharedHome": "~/.skills-broker",
  "hosts": [
    {
      "name": "claude-code",
      "status": "installed"
    },
    {
      "name": "codex",
      "status": "up_to_date"
    }
  ],
  "warnings": []
}
```

## Implementation Boundaries

The work should be split into five clear units:

1. published CLI entrypoint
2. shared-home lifecycle manager
3. host detectors
4. host shell lifecycle handlers
5. output serializers

This keeps host-specific behavior at the edges and preserves one shared broker core.

### Published CLI entrypoint

Owns:

- exposing `skills-broker update`, `doctor`, and `remove`
- argument parsing
- selecting text vs JSON output

### Shared-home lifecycle manager

Owns:

- initialization of `~/.skills-broker`
- updating shared runtime assets
- coordinating lifecycle commands

### Host detectors

Own:

- discovering default host directories
- checking existence and writability
- reporting detection reasons

### Host shell lifecycle handlers

Own:

- writing thin shells
- writing ownership manifests
- removing managed shells
- keeping host-specific wrappers minimal

### Output serializers

Own:

- text summary rendering
- stable JSON output schemas

## Testing Requirements

Minimum required coverage:

- zero-argument update initializes shared home
- update succeeds when no supported hosts are detected
- `update --dry-run` performs no writes
- `doctor` explains missing or unwritable hosts
- `remove` removes only managed host shells by default
- destructive shared-home cleanup requires an explicit flag
- `--broker-home`, `--claude-dir`, and `--codex-dir` override defaults correctly
- `--json` emits stable machine-readable output for all lifecycle commands
- Claude Code shell installs into its default host directory
- Codex shell installs into its default host directory
- ownership conflicts are detected and skipped
- rerunning update is idempotent
- capability history remains shared across Claude Code and Codex

## Non-Goals

This design does not yet specify:

- exact npm publishing automation
- OpenCode support
- rich interactive prompts
- broad open-domain task coverage

## Next Step

After this revised spec is accepted, the next artifact should be an implementation plan that turns the current repo-local shared-home flow into a published `npx skills-broker update` product command with lifecycle commands and trust features.
