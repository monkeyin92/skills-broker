# TODOS

## Completed

### Added Codex as the second thin host shell on top of the shared broker home

**What:** Codex now plugs into the shared broker home at `~/.skills-broker/` instead of creating a second isolated install.

**Why:** This validates the install-once, use-across-hosts model. Claude Code and Codex can now reuse one shared runtime, one shared capability cache, and one shared routing history.

**Shipped:** shared broker home install/update modules, Codex thin-shell adapter + installer, and cross-host cache reuse tests.

### Promoted shared-home lifecycle into the published `skills-broker` CLI

**What:** The repo-local shared-home flow was promoted into the user-facing lifecycle CLI.

**Why:** Users should be able to install and maintain the broker through one stable product command instead of cloning the repository first.

**Shipped:** published `npx skills-broker update`, `doctor`, `remove`, JSON output support, official host path detection, and npm package distribution.

### Shipped the first host-agnostic broker auto-router contract

**What:** `skills-broker` now behaves like a thin-host, shared-runtime pre-tool router instead of a single hard-coded webpage-to-markdown prompt.

**Why:** This is the architectural shift that turns the project from a one-off tool into a reusable capability-routing layer across hosts.

**Shipped:** shared broker envelope, structured broker outcomes, host degradation actions, and first-version routed lanes for:
- `web_content_to_markdown`
- `social_post_to_markdown`
- `capability_discovery_or_install`

## Next

### Improve real host auto-routing hit rate

**What:** Make Claude Code and Codex more reliably route obvious external-capability requests through `skills-broker` before they fall back to native tools.

**Why:** The install and runtime skeleton is done. The next product bottleneck is whether the broker is actually chosen in real workflows often enough to matter.

**Context:** The auto-router contract is in `main`, but real-world host prompting, lane detection quality, and structured fallback behavior still need product polishing.

**Effort:** M
**Priority:** P0
**Depends on:** host-shell wording, broker normalization quality, and more real host-in-the-loop smoke coverage

### Expand the set of high-value routed lanes

**What:** Add more clearly external-capability request families beyond the current markdown and discovery lanes.

**Why:** The architecture is no longer the limiting factor. Product value now depends on whether the broker covers enough high-frequency workflows to become a habit.

**Context:** The current three-lane set proves the model works, but it is still too narrow to establish `skills-broker` as the default external-capability brain.

**Effort:** M
**Priority:** P1
**Depends on:** stable shared envelope, durable lane taxonomy, and host auto-routing boundaries staying tight

### Turn discovery and install into a real flywheel

**What:** Evolve `capability_discovery_or_install` from a secondary fallback path into a stronger acquisition loop that can discover, install, and reuse new capabilities across hosts.

**Why:** This is the long-term moat. A broker becomes strategically valuable when it can expand its own reachable capability surface and remember what worked.

**Context:** Shared home, shared cache, and cross-host reuse are already in place. What is still missing is a fuller discovery/acquisition loop that compounds over time.

**Effort:** L
**Priority:** P1
**Depends on:** stronger discovery sources, install flow refinement, and clear post-install persistence semantics

### Add OpenCode as the third thin host shell

**What:** Extend the same shared broker contract to OpenCode without splitting the runtime or capability memory.

**Why:** This validates that the current host-agnostic design is real, not just "Claude plus Codex with some duplication."

**Context:** OpenCode is now the most natural next host once Claude Code and Codex share the same broker home and envelope.

**Effort:** M
**Priority:** P2
**Depends on:** the current host shell contract staying thin and stable
