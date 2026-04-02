# Changelog

## [Unreleased]

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
