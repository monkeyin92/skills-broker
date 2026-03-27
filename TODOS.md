# TODOS

## Completed

### Added Codex as the second thin host shell on top of the shared broker home

**What:** Codex now plugs into the shared broker home at `~/.skills-broker/` instead of creating a second isolated install.

**Why:** This validates the install-once, use-across-hosts model. Claude Code and Codex can now reuse one shared runtime, one shared capability cache, and one shared routing history.

**Shipped:** shared broker home install/update modules, Codex thin-shell adapter + installer, cross-host cache reuse tests, and a repo-local `./scripts/update-shared-home.sh` flow.

## Next

### Promote the shared-home script into the real `skills-broker update` product command

**What:** Turn `./scripts/update-shared-home.sh` into the final user-facing update entrypoint.

**Why:** The architecture is now partially implemented, but the current flow is still repo-local. Users should eventually get the same behavior through a single stable product command.

**Context:** The core shared-home pieces are in place, but host auto-detection, final packaging, and user-facing distribution are still open.

**Effort:** M
**Priority:** P2
**Depends on:** packaging decisions for the published CLI and host detection rules
