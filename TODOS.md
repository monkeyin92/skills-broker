# TODOS

## Broker Runtime

### Finish the package lifecycle vs routed subskill migration

**What:** Finish moving from flattened implementation ids to a two-layer model where packages are the lifecycle unit and leaf capabilities are the routing unit.

**Why:** The foundations shipped, but flattening still survives in compatibility bridges. That will become product drag once packages expose more sibling subskills or multiple packages compete for the same job family.

**Context:** Explicit package / leaf identity, package-aware probing, package-aware handoff and acquisition hints, MCP alignment, and broker-owned downstream ownership are already in `main`. The remaining work is to keep removing flattened compatibility bridges, broaden package-aware acquisition behavior, and continue shrinking the host-visible peer surface.

**Effort:** M
**Priority:** P0
**Depends on:** capability-query migration tail, richer seed/catalog modeling, and package-aware acquisition / handoff cleanup

## Ecosystem

### Turn discovery and install into a real flywheel

**What:** Evolve `capability_discovery_or_install` from a secondary fallback path into a stronger acquisition loop that can discover, install, and reuse new capabilities across hosts.

**Why:** This is the long-term moat. A broker becomes strategically valuable when it can expand its own reachable capability surface and remember what worked.

**Context:** Shared home, shared cache, and cross-host reuse are already in place. What is still missing is a fuller discovery/acquisition loop that compounds over time.

**Effort:** L
**Priority:** P1
**Depends on:** stronger discovery sources, install flow refinement, and clear post-install persistence semantics

## Host Expansion

### Add OpenCode as the third thin host shell

**What:** Extend the same shared broker contract to OpenCode without splitting the runtime or capability memory.

**Why:** This validates that the current host-agnostic design is real, not just "Claude plus Codex with some duplication."

**Context:** The current supported host matrix is still Claude Code plus Codex only. OpenCode remains the next deferred thin-host shell once the query-native ingress and package-vs-leaf migration tail stop leaking compatibility debt.

**Effort:** M
**Priority:** P2
**Depends on:** the current host shell contract staying thin and stable

## Completed

### Finish the capability-query migration and retire the legacy intent gate

**What:** Remove the remaining top-boundary legacy-intent compatibility bridge so modern broker-first requests stay query-native end to end.

**Why:** The compiler seam is shipped, but `BrokerIntent` still survives as an internal compatibility contract across ranking, explain output, workflow persistence, and maintained-family rails. That still keeps future routing growth tied to old lane labels longer than it should.

**Context:** Query-led discovery, the broker-owned raw-request compiler, maintained bilingual eval coverage, and workflow routing are already in `main`. The remaining gap is to finish shrinking `intent` down to a clearly internal compatibility lane label, remove the remaining compatibility consumers that still act like it is a product boundary, and keep workflow/session compatibility explicit while that migration tail is still live.

**Shipped:** broker-local resolved-request compatibility seam, canonical query identity, one-release legacy cache/session dual-read with forward rewrite, explicit compatibility-assisted explain/trace semantics, and query-native request contract coverage across unit, integration, CLI, and installed-host smoke tests.

**Effort:** L
**Priority:** P0
**Depends on:** coarse broker-first host boundary, broker-owned query compilation, and bilingual eval coverage for new families
**Completed:** v0.2.0 (2026-04-12)

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

### Expand the set of high-value routed lanes

**What:** Add more clearly external-capability request families beyond the current markdown and discovery lanes.

**Why:** The architecture is no longer the limiting factor. Product value now depends on whether the broker covers enough high-frequency workflows to become a habit.

**Context:** The current three-lane set proves the model works, but it is still too narrow to establish `skills-broker` as the default external-capability brain.

**Effort:** M
**Priority:** P1
**Depends on:** stable shared envelope, durable lane taxonomy, and host auto-routing boundaries staying tight
**Completed:** v0.1.7 (2026-04-01)

### Shifted broker routing foundations toward query-first capability semantics

**What:** Move discovery, normalization, and ranking away from pure legacy `intent` equality and toward structured `capabilityQuery` metadata.

**Why:** This turns capability-query routing from a design direction into a live migration path, so new capability families stop depending on enum growth first.

**Shipped:** capability-query-led host-catalog / MCP / workflow discovery, query-first normalization for modern broker-first requests, `compatibilityIntent` internal routing labels, and shared-home routing metrics for hit / misroute / fallback across maintained request surfaces.

### Landed the first broker-owned downstream and host-surface migration slice

**What:** Start moving concrete routed abilities behind the broker instead of letting them stay host-visible peer choices.

**Why:** This removes the structural conflict where the host can choose a concrete downstream skill before `skills-broker` gets first refusal.

**Shipped:** package-aware and leaf-aware handoff fields, downstream ownership surface metadata, validated probe contracts, competing peer-skill detection/remediation, and broker-managed host-surface migration for the first markdown competitors.

### Shipped the maintained broker-first compiler and recovery contract

**What:** Move raw broker-first request compilation behind a dedicated broker-owned seam, make maintained families explicit contract data, and harden shared-home recovery around that contract.

**Why:** This is the point where broker-first stops being a loose prompt convention and becomes a fail-closed runtime with auditable recovery behavior.

**Shipped:** maintained-family contract data, broker-owned query compiler extraction, maintained gate freshness/proof diagnostics, typed peer-surface audit history, transactional repair locking, and explicit `update --clear-manual-recovery` recovery flows.

### Landed the Phase 1 adoption proof verdicts

**What:** `update` / `doctor` now derive an explicit `adoptionHealth` verdict and mirror that operator-facing truth into installed-shell smoke plus repo-native docs.

**Why:** The product bottleneck was no longer "can the broker route" but "can an operator tell in one step whether the broker is really on the hot path." This closes that gap with a green / blocked / inactive verdict instead of scattered lifecycle clues.

**Shipped:** shared adoption-health derivation in shared-home lifecycle commands, strict doctor closure for explicit host blockers, installed-shell confidence smoke, and repo truth mirroring in `STATUS.md`, `README.md`, and `TODOS.md`.
