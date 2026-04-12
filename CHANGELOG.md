# Changelog

## [Unreleased]

## [0.2.0] - 2026-04-12

### Added

- Added a broker-local resolved-request seam so the runtime now computes one canonical query identity, one explicit compatibility lane, and one routing reason code before cache, ranking, explain, trace, and workflow helpers touch the request.

### Changed

- Changed the public broker request contract so modern `capabilityQuery` requests no longer need to carry top-level `intent`; the runtime now derives compatibility intent internally while handoff, CLI, and installed-host flows stay query-native.
- Changed cache reuse, explain output, ranking, and workflow resume so they key off canonical query identity first, then use compatibility intent only as an explicit late fallback or migration bridge.
- Changed workflow/session persistence to single-write the new query-native request shape while still dual-reading one release of legacy intent-based session records.

### Fixed

- Fixed cache collisions so reordered arrays and normalized values still reuse the same winner, while different target values no longer incorrectly share the same legacy cache slot.
- Fixed legacy cache/session migration so old records are reused once, rewritten forward into the new shape, and traced as compatibility-assisted instead of silently pretending they were always query-native.
- Fixed broker contract coverage so unit, integration, CLI, and installed-shell smoke tests now assert query-native request payloads and explicit compatibility-assisted routing reasons.

## [0.1.13] - 2026-04-12

### Added

- Added an explicit broker `selection` contract so `prepare`, `handoff`, and workflow stage runtime now carry the chosen package, leaf capability, and implementation as first-class data instead of leaving that truth implicit in the winner card alone.
- Added query-native routing-trace truth fields so broker traces now record request contract, explicit selection mode, and selected capability/package details, and surface those rollups through `skills-broker doctor`.

### Changed

- Changed shared-home lifecycle host support handling so default roots, install paths, override flags, and known shell markers now come from a single broker-side host support matrix shared across CLI parsing, doctor, update, remove, and peer-surface audit flows.
- Changed the operator-facing docs and planning surfaces to reflect the current support matrix, the query-native migration tail, and the current contributor/operator success path.

### Fixed

- Fixed package availability lookup so custom package search roots still include broker-managed downstream skills instead of silently dropping capabilities that were already installed behind the broker.
- Fixed host-skill package probe merging so stage and workflow overrides deep-merge onto the base package probe instead of clobbering layout and manifest metadata.

## [0.1.12] - 2026-04-04

### Added

- Added a shared `adoptionHealth` verdict across the shared-home lifecycle so `update` and `doctor` can classify installs as `green`, `blocked`, or `inactive`.
- Added installed-shell confidence smoke plus repo-native status proofs that keep the new adoption-health story tied to shipped behavior.

### Changed

- Changed the repo's operator-facing narrative so `README.md`, `README.zh-CN.md`, `STATUS.md`, and `TODOS.md` all mirror the current Phase 1 adoption-proof focus.

### Fixed

- Fixed strict lifecycle handling so blocked adoption-health states, including a missing shared broker home behind an otherwise managed host, now fail closed instead of looking merely informational.

## [0.1.11] - 2026-04-03

### Added

- Added a maintained broker-first family contract plus shared-home gate artifacts, freshness checks, and proof rows so the broker can fail closed on the families it is actively proving.
- Added typed peer-surface audit history, host-scoped repair locking, and an explicit `update --clear-manual-recovery` operator path for recovering from failed host-surface repairs.

### Changed

- Changed Claude Code and Codex host-shell guidance so the host only decides `broker_first`, `handle_normally`, or `clarify_before_broker`, while the broker compiles and selects the downstream family.
- Changed broker-first raw-request handling so supported requirements-analysis, website-QA, investigation, and idea-workflow requests compile into structured capability queries before ranking and handoff.
- Changed `skills-broker doctor` and shared-home lifecycle output to show broker-first gate freshness, maintained-family proof state, peer-surface remediation, and manual-recovery clear commands.

### Fixed

- Fixed strict doctor gating so missing or stale broker-first gates, peer-surface integrity problems, manual-recovery blockers, and visible competing peer skills now fail closed instead of slipping through as warnings.
- Fixed peer-surface repair and clear flows so recovery markers carry typed audit evidence, reject mismatched marker clears, and keep the shared broker home pointed at the right location in operator follow-up commands.
- Fixed `update --clear-manual-recovery` so a successful clear rematerializes the broker-first gate artifact instead of leaving `doctor --strict` red on older installs.
- Fixed peer-surface recovery rollback so adopting an identical downstream peer copy does not move that already-hidden directory back onto the host-visible surface when later ledger writes fail.

## [0.1.10] - 2026-04-02

### Changed

- Changed broker discovery so structured `capabilityQuery` requests can match host-catalog skills, MCP candidates, and broker workflows by query metadata even when their legacy `intent` does not exactly line up, keeping `intent` as a compatibility hint instead of a hard gate.
- Changed request normalization so modern web, social, and capability-discovery inputs now synthesize `capabilityQuery` first and derive legacy `intent` from that query, leaving bare fixed-intent routing only as a legacy-task compatibility bridge.
- Changed normalized capability cards and workflow recipes so their internal intent label is now treated as `compatibilityIntent`, making query metadata the primary internal routing semantics instead of pretending legacy intent is the main key.
- Changed shared-home routing observability so broker traces now classify `hit`, `misroute`, and `fallback`, persist to broker home state, and roll up into `skills-broker doctor` by `structured_query`, `raw_envelope`, and `legacy_task` request surfaces.
- Changed Claude Code and Codex host-shell guidance so hosts only choose `broker_first`, `handle_normally`, or `clarify_before_broker`, leaving capability-family selection to the broker.
- Changed the roadmap and migration tracker to reflect the current broker-first host-boundary and shared-home rollout state.

### Added

- Added repo-scoped canonical `STATUS.md` evaluation to `skills-broker doctor`, including shipped-local versus shipped-remote proof checks and end-to-end git coverage.
- Added a dedicated CI status job that builds the published CLI and runs `doctor --strict --refresh-remote` against the repository root.

### Fixed

- Fixed broker normalization so free-form product idea requests are more likely to route into the broker-owned `idea-to-ship` workflow instead of falling through as unsupported.
- Fixed `skills-broker doctor` so running outside a git repo, or inside a git repo without a canonical `STATUS.md`, now skips repo-scoped status evaluation instead of surfacing strict repo-target failures.
- Fixed strict status evaluation so a shipping ref is only required when a status item actually needs remote truth, and detached-head environments now fall back to `origin/HEAD`, `origin/main`, or `origin/master`.
- Fixed installed Claude Code, Codex, and shared-home manifest versions so release bumps now follow package metadata instead of stale hardcoded version strings.
- Fixed the repo-native `STATUS.md` board so the coarse broker-first boundary now matches its shipped-remote proof state and keeps strict doctor CI green.
- Fixed the workflow session store concurrency regression test so its artificial stale-lock timing stays deterministic in CI.
- Fixed the CI status-doctor workflow so pull-request runs compare against the active branch shipping ref instead of falling back to the wrong remote baseline.

## [0.1.9] - 2026-04-01

### Changed

- Changed all GitHub Actions workflows to use `actions/checkout@v5` and `actions/setup-node@v5`, removing the Node 20 runtime deprecation warning from CI and npm publish runs.

## [0.1.8] - 2026-04-01

### Fixed

- Fixed workflow session persistence so each run is stored independently, which prevents one run from clobbering another during concurrent writes.
- Fixed same-run resume races so long-running writes keep their lock alive and a stale duplicate confirmation now loses with a revision conflict instead of silently double-advancing.

## [0.1.7] - 2026-04-01

### Added

- Added broker-first routing for requirements analysis, website QA, and investigation requests, with matching catalog metadata and smoke/eval coverage.
- Added the first broker-owned `idea-to-ship` workflow, including stage recipes, persisted run state, and host-aligned resume semantics across Claude Code and Codex.

### Changed

- Changed broker discovery so workflow recipes rank alongside host skills and MCP candidates, and propagate workflow context through handoff and trace payloads.
- Changed the project docs to describe the current broker-first lanes, workflow runtime, and artifact/gate contract.

### Fixed

- Fixed workflow resume so stages only advance with explicitly declared artifacts, and ship stays blocked until review and QA outputs are actually present.
- Fixed workflow session persistence so concurrent resumes use file locking, compare-and-swap revision checks, and atomic JSON writes instead of lossy read-modify-write overwrites.
