# TODOS

## Current Focus

### Milestone v1.5 active; Phase 18 hierarchy alignment comes first

**What:** Turn the shipped QA-first hero lane into a clearer family proof loop: align canonical wording so operator surfaces show `website QA` first, `web markdown` second, and `social markdown` third, with explicit next-loop guidance after QA.

**Why:** v1.4 already proved the QA-first story is alive right now. The next risk is that operator-facing surfaces still make maintainers reconstruct the hierarchy from scattered wording instead of reading one stable story: QA-first family loop: website QA first, web markdown second, social markdown third.

**Context:** Supported now: Claude Code, Codex, OpenCode. Claude Code, Codex, and OpenCode now share full published lifecycle and proof/reuse parity. Published lifecycle commands: npx skills-broker update / npx skills-broker doctor / npx skills-broker remove. website QA remains the hero lane. web markdown remains the second proven family. social markdown remains the next proven family. After a successful website QA proof, the next proven loop to run is web markdown. After web markdown, social markdown is the next proven loop. Hosts choose only `broker_first`, `handle_normally`, or `clarify_before_broker`; the broker still chooses the concrete QA winner. `doctor` now exposes a website QA adoption packet: recent routing evidence, freshness, and separate repeat-usage / cross-host reuse proof states. Phase 18 now needs to turn that hierarchy into one canonical operator story.

**Readiness contract:** `docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md`

**Readiness gate:** All supported hosts now share the same shared broker home, thin host shell, proof/reuse state, and published lifecycle contract. The next green bar is that maintainer-facing surfaces can tell the operator what to run first and what to run next without flattening the hero lane or making the host choose a concrete winner.

**Effort:** S
**Priority:** P1
**Depends on:** Phase 14 operator-truth guardrails and v1.4 adoption-signal truth staying green

## Completed

### Harden website QA broker-first hit rate

**What:** Make clear website QA requests and QA install-help phrasing cross the coarse broker-first boundary more reliably, while keeping nearby page-level asks fail-closed.

**Why:** The default-entry story was still too fragile if obvious QA asks or mixed-language install-help wording missed the broker or got swallowed into the wrong lane.

**Shipped locally:** query normalization now handles mixed-language website-QA discovery/install-help asks, page-level near misses stay ambiguous instead of being misrouted into QA, and `doctor` now exposes repo-owned website QA routing evidence directly.

**Effort:** M
**Priority:** P1
**Depends on:** the coarse host boundary staying thin
**Completed:** shipped_local (2026-04-23)

### Prove the website QA repeat-usage loop

**What:** Turn the website QA install / verify path into a stronger repo-owned proof loop that also shows repeat usage and cross-host reuse on the shared-home surface.

**Why:** A default-entry lane is not convincing if it only succeeds once and then falls back to story time instead of proof.

**Shipped locally:** the canonical website QA MCP proof now covers `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse -> repeat usage`, and `doctor` now distinguishes repeat usage from cross-host reuse so operators can see the next missing proof directly.

**Effort:** M
**Priority:** P1
**Depends on:** Phase 12 QA-entry routing confidence
**Completed:** shipped_local (2026-04-23)

### Shipped OpenCode as the third thin host shell

**What:** Move OpenCode from deferred readiness into the real shared-home attach path without splitting runtime, cache, or broker-owned capability state.

**Why:** This proves the third-host story is real at the product surface, not just a roadmap note.

**Shipped locally:** Supported now: Claude Code, Codex, OpenCode. `npx skills-broker update` can attach an OpenCode thin shell, `doctor` inventories it on the same shared surface, and the follow-on parity pass has now closed full lifecycle / proof parity across all three hosts without forking runtime or operator truth.

**Effort:** M
**Priority:** P2
**Depends on:** canonical host truth, shared-home lifecycle plumbing, and three-host no-regression smoke
**Completed:** shipped_local (2026-04-23)

### Generalized family proofs after the QA default-entry proof landed

**What:** Promote `familyProofs` into the canonical operator surface, keep `websiteQaLoop` as the compatibility alias, and publish web markdown as the second proven family instead of a vague secondary lane.

**Why:** Once website QA had real default-entry proof, the next leverage point was to generalize that proof surface without weakening the hero lane or reopening generic semantic-contract work prematurely.

**Shipped locally:** `doctor` now exposes canonical `familyProofs` for website QA plus web markdown, strict consumers still work through the `websiteQaLoop` alias, semantic metadata and loader validation explicitly recognize `website_qa` plus `web_content_to_markdown`, the canonical web-markdown install -> verify -> cross-host reuse loop is locked in integration tests, and repo docs plus installed shells now say the same thing: website QA is the hero lane and web markdown is the second proven family.

**Effort:** M
**Priority:** P2
**Depends on:** website QA default-entry conversion hardening landing first
**Completed:** shipped_local (2026-04-22)

### Promote social markdown into the next proven family

**What:** Extend the same install -> verify -> cross-host reuse proof rail to `social_post_to_markdown`, and publish it as the next proven family after web markdown.

**Why:** This proves capability-surface expansion is still riding the same deterministic, shared-home, doctor-visible contract instead of reopening special-case routing.

**Shipped locally:** `doctor` now exposes canonical `familyProofs.social_post_to_markdown`, integration and installed-shell smoke prove the social markdown install -> verify -> cross-host reuse loop, and repo docs plus installed shells now describe the three-step hierarchy honestly: website QA hero lane, web markdown second proven family, social markdown next proven family.

**Effort:** M
**Priority:** P1
**Depends on:** Phase 6 three-host lifecycle/proof parity and existing familyProofs rails
**Completed:** shipped_local (2026-04-23)

### Ship investigation as the second broker-owned workflow

**What:** Turn the maintained investigation lane into a real broker-owned workflow instead of a one-shot downstream handoff.

**Why:** `idea-to-ship` alone was not enough proof that broker-owned workflows can expand without collapsing other maintained lanes or weakening the thin-shell boundary.

**Shipped locally:** `investigation-to-fix` now starts as a broker-owned workflow, resume moves it into host-native implementation with explicit artifact gates, Claude Code / Codex / OpenCode share the same stage truth, and the workflow query surface is narrow enough to preserve `website-qa` as a separate maintained winner.

**Effort:** M
**Priority:** P1
**Depends on:** the maintained-family contract, existing workflow runtime, and three-host installed-shell parity
**Completed:** shipped_local (2026-04-23)

### Make MCP discovery registry-ready and explainable

**What:** Upgrade the MCP discovery source from a demo-like seed reader into a registry-ready metadata source with validated transport and query-coverage evidence.

**Why:** MCP-backed routing is only operator-trustable if the broker can explain why an MCP matched and what validated registry facts it is relying on.

**Shipped locally:** MCP candidates now fail closed when version/remotes/usable endpoints are missing, source metadata carries registry version + transport + endpoint count + query coverage, broker explanations surface that evidence, and advisory MCP suggestions still stay behind installed/local winners.

**Effort:** M
**Priority:** P1
**Depends on:** capability-query-led discovery, existing MCP proof rails, and the current precedence contract that keeps registry candidates advisory
**Completed:** shipped_local (2026-04-23)

### Install CI trust guardrails

**What:** Turn blind-spot reporting and narrative parity into explicit CI gates instead of phase-end spot checks.

**Why:** Once three-host parity, three proven families, two broker-owned workflows, and registry-ready MCP explainability exist, drift has to fail closed before ship rather than being noticed only in milestone wrap-up.

**Shipped locally:** `npm run ci:blind-spot` now reads the live repo inventory and budgets support-matrix, maintained/proven family, workflow, and repo-proof surfaces. `npm run test:ci:narrative-parity` now makes README / README.zh-CN / STATUS / TODOS plus installed shell truth a focused CI gate. `.github/workflows/ci.yml` runs both before the broader build/test/status jobs, and `verify:local` stays a local preflight instead of masquerading as repo-truth CI.

**Effort:** M
**Priority:** P1
**Depends on:** Phase 7 product surface expansion and the existing operator-truth / strict-doctor contracts
**Completed:** shipped_local (2026-04-23)

### Lock release gate verdicts

**What:** Turn the blind-spot report, focused narrative parity suite, and strict repo-scoped doctor gate into one canonical repo-owned release verdict.

**Why:** Once CI trust rails were live, the next leverage point was to let ship/release automation consume the same truth directly instead of reassembling three separate signals by hand.

**Shipped locally:** `npm run release:gate` now replays `npm run ci:blind-spot`, `npm run test:ci:narrative-parity`, and strict repo-scoped `doctor` as one repo-local verdict. The output names the failing rail, evaluated shipping ref, and remote freshness, and `verify:local` remains explicitly local-only.

**Effort:** M
**Priority:** P1
**Depends on:** Phase 8 CI trust guardrails and the existing repo-scoped doctor/status contract
**Completed:** shipped_local (2026-04-23)

### Ship repo-owned proof promotion

**What:** Add an explicit repo-owned flow that upgrades only eligible canonical `STATUS.md` items from `shipped_local` to `shipped_remote`.

**Why:** The canonical status board already knew the difference between local and remote truth, but maintainers still had to close that gap manually at release time.

**Shipped locally:** `npm run release:promote` now re-evaluates canonical `STATUS.md` truth against the shipping ref, promotes only eligible items, and fail-closes on unresolved ship refs, remote refresh failures, invalid proofs, or non-promotion mismatches without partially rewriting the board.

**Effort:** M
**Priority:** P1
**Depends on:** Phase 9 canonical release gate and the existing `evaluateStatusBoard()` shipping-ref logic
**Completed:** shipped_local (2026-04-23)

### Close publish flow on canonical release truth

**What:** Wire npm publish automation directly onto the repo-owned release truth surface and keep repo docs aligned with that one story.

**Why:** Release truth is only closed if publish itself consumes the same gate/promotion contract instead of reintroducing a release-only seam.

**Shipped locally:** `.github/workflows/publish-npm.yml` now runs `npm run release:gate` before publish, `npm run release:promote` after publish, pushes promoted `STATUS.md` truth back to the default branch, and finishes on the same canonical release gate. README / README.zh-CN now explain that these repo-local release commands do not widen the published lifecycle CLI surface.

**Effort:** M
**Priority:** P1
**Depends on:** Phase 10 proof promotion and the existing published lifecycle / operator-truth contract
**Completed:** shipped_local (2026-04-23)

### Turn discovery and install into a real flywheel

**What:** Evolve `capability_discovery_or_install` from a secondary fallback path into a stronger acquisition loop that can discover, install, and reuse new capabilities across hosts.

**Why:** This is the long-term moat. A broker becomes strategically valuable when it can expand its own reachable capability surface and remember what worked.

**Shipped locally:** `INSTALL_REQUIRED` is now first-class instead of being flattened into `NO_CANDIDATE`, broker/host/workflow share one install contract, shared-home acquisition memory is versioned and advisory, verified downstream manifests are now a real discovery source, and `doctor` / README expose reuse plus cross-host replay truth.

**Effort:** L
**Priority:** P1
**Depends on:** stronger discovery sources, install flow refinement, and clear post-install persistence semantics
**Completed:** v0.3.0 (2026-04-16)

### Finish the package lifecycle vs routed subskill migration

**What:** Finish moving from flattened implementation ids to a two-layer model where packages are the lifecycle unit and leaf capabilities are the routing unit.

**Why:** The foundations shipped, but flattening still survives in compatibility bridges. That will become product drag once packages expose more sibling subskills or multiple packages compete for the same job family.

**Shipped:** canonical package-plus-leaf identity now wins over conflicting implementation metadata, discovery dedupes on routed leaf capability, broker-managed host seeds fail fast on inconsistent explicit identity, workflow stages keep identity separate from execution metadata, and legacy workflow sessions rewrite forward into normalized per-run records.

**Effort:** M
**Priority:** P0
**Depends on:** capability-query migration tail, richer seed/catalog modeling, and package-aware acquisition / handoff cleanup
**Completed:** v0.2.1 (2026-04-15)

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

**Shipped:** published `npx skills-broker update`, `npx skills-broker doctor`, `npx skills-broker remove`, JSON output support, official host path detection, and npm package distribution.

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
