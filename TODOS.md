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

### Shipped package-aware capability routing with manifest-based availability probing

**What:** The broker now models routed leaf capabilities separately from owning packages, preserves both identities in ranking and handoff, and only upgrades package availability after validating real package and leaf manifests.

**Why:** This fixes the earlier flattening bug where package identity, subskill identity, and implementation identity were all collapsed into one string. It also prevents fake "installed" upgrades from raw directory hits.

**Shipped:** package-plus-leaf capability cards, package-aware acquisition hints, runtime manifest-based install detection, explicit `probe` contracts in the host catalog, catalog-load validation for those contracts, and MCP candidate alignment onto the same internal routing shape.

## Next

### Replace fixed-intent routing with capability-query routing

**What:** Move broker request understanding from a hardcoded intent enum toward structured capability queries produced by the host model and matched against richer capability metadata.

**Why:** The current three-intent router proved the first lake, but it will not scale to cross-language requests or broader reusable workflows like requirements analysis, QA, and investigation.

**Context:** The broker already supports structured `capabilityQuery`, richer capability metadata, package-versus-leaf identity, and package-aware probing. The remaining gap is at the top boundary: `/Users/monkeyin/projects/skills-broker/src/core/request.ts` and `/Users/monkeyin/projects/skills-broker/src/core/types.ts` still use the legacy fixed `intent` enum as the coarse lane gate.

**Effort:** L
**Priority:** P0
**Depends on:** host-model normalization contract, richer capability-card metadata, and an incremental migration path from the current intent-based router

### Separate package lifecycle from routed subskills

**What:** Introduce a two-layer catalog where packages such as `gstack` or `baoyu` are the acquisition and lifecycle unit, while subskills such as `qa`, `office-hours`, or `url-to-markdown` are the routed leaf capabilities.

**Why:** The current proof path can route to concrete winners, but it still flattens package and subskill identity into one implementation id. That will not scale once packages expose many subskills or multiple packages compete for the same job family.

**Context:** The core package-aware model is now in `main`: `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json`, `/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts`, `/Users/monkeyin/projects/skills-broker/src/broker/run.ts`, and `/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts` already distinguish packages from routed leaf capabilities. The remaining work is to keep expanding the package catalog, reduce legacy compatibility bridges, and broaden package-aware acquisition behavior.

**Effort:** M
**Priority:** P0
**Depends on:** capability-query routing foundations, richer seed/catalog modeling, and package-aware handoff plus acquisition behavior

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
