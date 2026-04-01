# Changelog

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
