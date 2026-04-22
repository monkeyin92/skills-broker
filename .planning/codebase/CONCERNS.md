# Codebase Concerns

**Analysis Date:** 2026-04-22

## Tech Debt

**Shared-home control plane is oversized and one rollback branch is still unexercised:**
- Issue: shared-home lifecycle, doctor truth, repo status evaluation, and peer-surface repair are concentrated in very large modules. Current file sizes are high enough to make single-change reasoning expensive: `src/broker/run.ts` (1304 LOC), `src/shared-home/update.ts` (1148 LOC), `src/shared-home/doctor.ts` (1103 LOC), `tests/integration/broker-flow.test.ts` (4184 LOC), `tests/shared-home/doctor.test.ts` (1538 LOC), and `tests/cli/lifecycle-cli.test.ts` (1451 LOC). One high-blast-radius rollback branch is explicitly skipped.
- Files: `src/broker/run.ts`, `src/shared-home/update.ts`, `src/shared-home/doctor.ts`, `src/shared-home/status.ts`, `src/shared-home/peer-surface-audit.ts`, `tests/integration/broker-flow.test.ts`, `tests/shared-home/doctor.test.ts`, `tests/cli/lifecycle-cli.test.ts`, `tests/shared-home/update-lifecycle.test.ts`
- Impact: small changes in install, repair, or strict-doctor behavior can fan out across host shell mutation, status proofs, CLI exit codes, and manual-recovery semantics. Regression localization will stay slow until these seams are smaller.
- Fix approach: split lifecycle work by concern before adding more behavior, then unskip the rollback/manual-recovery path in `tests/shared-home/update-lifecycle.test.ts`.
- Coverage status: Partially protected. Happy-path and many degraded flows are covered by `tests/shared-home/update-lifecycle.test.ts`, `tests/shared-home/peer-surface-audit.test.ts`, and `tests/shared-home/doctor.test.ts`; the append-fails plus rollback-fails branch is still skipped.

**Semantic routing remains single-family and regex-bound:**
- Issue: semantic routing only direct-routes the `web_content_to_markdown` proof family, while all other top matches are forced to `unsupported`. The surrounding request compiler is still a large regex matrix.
- Files: `src/broker/semantic-resolver.ts`, `src/broker/run.ts`, `src/broker/query-compiler.ts`, `tests/broker/semantic-resolver.test.ts`, `TODOS.md`
- Impact: every new maintained family or new phrasing variant requires touching multiple classifier seams. That increases the chance of accidental routing regressions and slows capability-family expansion.
- Fix approach: move proof-family evaluation behind extensible family resolvers and align it with the maintained-family contract tracked in `TODOS.md`.
- Coverage status: Tested current limitation, not the future abstraction. `tests/broker/semantic-resolver.test.ts` proves the current boundary, including that non-web proof families stay unsupported, but there is no reusable abstraction protecting future family growth.

**Default MCP discovery is still demonstrative and requires special-case suppression:**
- Issue: the packaged MCP registry is a local seed file containing `io.example/*` placeholder servers, and broker runtime has to special-case filter those namespaces during real routing.
- Files: `config/mcp-registry.seed.json`, `src/broker/run.ts`, `src/sources/mcp-registry.ts`, `tests/integration/broker-flow.test.ts`
- Impact: the repo ships a dual-source story while the default MCP source is intentionally non-actionable. That keeps discovery logic coupled to placeholder heuristics and makes “real registry readiness” hard to reason about from the default install alone.
- Fix approach: either ship a validated real fixture, or make live registry injection an explicit product requirement surfaced by `update`/`doctor` instead of burying it behind placeholder filtering.
- Coverage status: Partially protected. `tests/integration/broker-flow.test.ts` covers ignoring placeholder MCP candidates after downstream failures, but the default packaged discovery source is still not production-grade.

**Broker truth is duplicated across narrative docs without parity automation:**
- Issue: operator truth is spread across English docs, Chinese docs, status board, and backlog wording, but repo-native verification is centered on `STATUS.md` instead of the narrative docs that users actually read.
- Files: `README.md`, `README.zh-CN.md`, `STATUS.md`, `TODOS.md`, `tests/shared-home/status.test.ts`
- Impact: lifecycle commands, supported-host claims, or default-entry guidance can drift between English and Chinese docs while strict status checks still pass.
- Fix approach: generate shared lifecycle snippets or add parity checks for supported-host matrix, commands, and proof-surface wording.
- Coverage status: Mostly unprotected. `tests/shared-home/status.test.ts` validates the canonical `STATUS.md` block, not README or `README.zh-CN.md` narrative parity.

## Known Bugs

**Live discovery smoke can pass without proving current MCP intent matching works:**
- Symptoms: the scheduled live-registry workflow calls `searchMcpRegistry` with the legacy string `"webpage_to_markdown"` and only asserts that the return value is an array, not that any current broker-intent candidate matched.
- Files: `.github/workflows/live-discovery-smoke.yml`, `src/sources/mcp-registry.ts`, `tests/sources/mcp-registry.test.ts`
- Trigger: scheduled or manual runs of the live discovery smoke workflow.
- Workaround: rerun the parser with the current intent name `web_content_to_markdown`, and treat `candidates.length === 0` as a failure instead of a log-only detail.
- Coverage status: Unprotected. `tests/sources/mcp-registry.test.ts` covers current intent names, but the workflow YAML itself is not asserted anywhere.

**Local test execution is currently fragile in this checkout because the Rollup native optional dependency fails to load:**
- Symptoms: running `node ./node_modules/vitest/vitest.mjs run` in this workspace currently fails before tests start because `@rollup/rollup-darwin-arm64` cannot be loaded.
- Files: `package.json`, `package-lock.json`, `vitest.config.ts`, `.github/workflows/ci.yml`
- Trigger: local test execution in the current macOS checkout state.
- Workaround: clean reinstall dependencies; CI may not reproduce it because `.github/workflows/ci.yml` uses a fresh Linux `npm ci`.
- Coverage status: Unprotected. There is no repo-local dependency health check or fallback path before the test command is invoked.

## Security Considerations

**Generated shell runners embed broker-home paths directly into Bash source:**
- Risk: generated host-shell scripts interpolate `brokerHomeDirectory` directly into Bash. Paths containing quotes, shell metacharacters, or `$` expansion syntax can break execution or become injection-like footguns.
- Files: `src/hosts/codex/install.ts`, `src/hosts/claude-code/install.ts`, `src/shared-home/install.ts`
- Current mitigation: paths are resolved before script generation, wrapped in quotes, and adapters verify required files in `src/hosts/codex/adapter.ts` and `src/hosts/claude-code/adapter.ts`.
- Recommendations: shell-escape embedded paths or stop embedding raw paths entirely by deriving the target path at runtime from the script location or a manifest file.
- Coverage status: Partially protected. End-to-end adapter tests exist, but there are no tests for spaces, quotes, `$`, or command-substitution characters in install paths.

**Advisory persistence failures are swallowed silently:**
- Risk: trace writes, acquisition-memory writes, and verified downstream manifest writes are intentionally non-fatal and currently drop errors without operator-visible warnings.
- Files: `src/broker/run.ts`, `src/broker/workflow-runtime.ts`, `src/broker/trace-store.ts`, `src/broker/acquisition-memory.ts`, `src/broker/downstream-manifest-source.ts`, `src/shared-home/doctor.ts`
- Current mitigation: `doctor` can later surface unreadable proof rails or missing advisory state.
- Recommendations: surface a structured degraded-state warning when advisory persistence fails so operators can distinguish “routing succeeded” from “routing succeeded but proof/reuse state was lost.”
- Coverage status: Partially protected. `tests/shared-home/doctor.test.ts` exercises unreadable proof rails, but runtime silent-failure branches are not asserted as first-class degraded outcomes.

## Performance Bottlenecks

**Shared-home state is file-based and fully scanned on read:**
- Problem: routing traces append into a single JSONL file, acquisition memory rewrites one JSON file, and verified downstream manifests are discovered through recursive directory walks.
- Files: `src/broker/trace-store.ts`, `src/broker/acquisition-memory.ts`, `src/broker/downstream-manifest-source.ts`
- Cause: there is no pruning, compaction, paging, or index layer.
- Improvement path: add retention windows and compaction for trace/advisory files, plus host-scoped manifest indexes so `doctor` and routing do not need full-tree reads.
- Coverage status: Correctness is tested by `tests/broker/acquisition-memory.test.ts`, `tests/shared-home/doctor.test.ts`, and `tests/integration/broker-flow.test.ts`; scale behavior is not protected.

**Installed-package detection is linear in roots, directories, manifests, and candidates:**
- Problem: install-state hydration walks every configured root and child directory and repeatedly reads `SKILL.md` or JSON manifests per candidate.
- Files: `src/broker/package-availability.ts`, `src/broker/run.ts`, `config/host-skills.seed.json`, `tests/broker/package-availability.test.ts`
- Cause: routing uses live filesystem probes instead of a cached package index maintained by shared-home lifecycle commands.
- Improvement path: build and reuse a package index during `update`/`remove`, then let routing consult the index instead of rescanning the world.
- Coverage status: Path correctness is protected by `tests/broker/package-availability.test.ts` and cross-host flows in `tests/integration/broker-flow.test.ts`; no performance guard exists for large installs.

## Fragile Areas

**Peer-surface repair plus manual-recovery bookkeeping:**
- Files: `src/shared-home/update.ts`, `src/shared-home/peer-surface-audit.ts`, `src/shared-home/host-surface.ts`, `tests/shared-home/update-lifecycle.test.ts`, `tests/shared-home/host-surface-management.test.ts`
- Why fragile: a single repair path mutates host-visible skills, broker-owned downstream copies, ledger events, manual-recovery markers, CLI warnings, and strict-doctor inputs.
- Safe modification: change one host and one failure phase at a time, then run the update-lifecycle, peer-surface, doctor, and CLI strict suites together.
- Test coverage: Strong happy-path and degraded-path coverage exists, but the most severe rollback-closure branch is still skipped.

**Cross-host local-skill handoff depends on naming and probe heuristics:**
- Files: `src/broker/local-skill-handoff.ts`, `src/broker/package-availability.ts`, `config/host-skills.seed.json`, `tests/broker/local-skill-handoff.test.ts`, `tests/broker/package-availability.test.ts`
- Why fragile: correctness depends on package ids, capability ids, manifest names, aliases, directory layouts, and host search order staying aligned with real bundles.
- Safe modification: treat probe metadata and host-catalog aliases as code, not content; change them together with handoff and availability tests.
- Test coverage: Unit and integration correctness exists, but real-world naming drift and high-cardinality host surfaces remain lightly protected.

## Scaling Limits

**Broker state has no configured cap or retention policy:**
- Current capacity: Not specified. `routing-traces.jsonl`, `acquisition-memory.json`, verified downstream manifests, and cache files can grow without size or age enforcement.
- Limit: the first failure mode is likely slower doctor/routing startup and heavier JSON parsing rather than a clean explicit ceiling.
- Scaling path: add retention, compaction, and a broker-home index that can answer doctor/routing queries incrementally.
- Files: `src/broker/trace-store.ts`, `src/broker/acquisition-memory.ts`, `src/broker/downstream-manifest-source.ts`, `src/core/cache/store.ts`
- Coverage status: Unprotected for scale. Existing tests use small fixtures only.

## Dependencies at Risk

**Vitest/Vite/Rollup native optional dependency chain is brittle for contributors:**
- Risk: the current repo depends on a toolchain that can fail before tests begin when a native optional Rollup artifact is missing or unusable.
- Impact: contributors can be blocked from local verification even when source changes are small, which lowers confidence in release candidates and refactors.
- Migration plan: pin a known-good dependency set, document a deterministic cleanup/reinstall path, or prefer a JS fallback when native modules fail.
- Files: `package.json`, `package-lock.json`, `vitest.config.ts`, `.github/workflows/ci.yml`
- Coverage status: Unprotected locally. CI proves Linux `npm ci`, not cross-platform dependency health.

## Missing Critical Features

**No automated parity check for bilingual operator docs:**
- Problem: `README.md`, `README.zh-CN.md`, and `TODOS.md` all act as operator-facing truth surfaces, but only `STATUS.md` has a canonical machine-checked structure.
- Blocks: reliable multilingual onboarding and safe documentation-driven release messaging.
- Files: `README.md`, `README.zh-CN.md`, `TODOS.md`, `STATUS.md`
- Coverage status: Unprotected beyond `STATUS.md` canonical-board checks.

**No coverage budget or blind-spot report in CI:**
- Problem: the test runner configuration does not collect coverage or enforce thresholds, and CI only checks green/red suite results plus strict doctor gates.
- Blocks: knowing whether new routing branches, persistence failure paths, or repair flows are actually protected.
- Files: `vitest.config.ts`, `package.json`, `.github/workflows/ci.yml`
- Coverage status: Unprotected.

## Test Coverage Gaps

**Shared-home rollback failure path is skipped:**
- What's not tested: the path where peer-surface repair cannot append the ledger and rollback also cannot fully restore host surface state.
- Files: `tests/shared-home/update-lifecycle.test.ts`, `src/shared-home/update.ts`, `src/shared-home/peer-surface-audit.ts`
- Risk: the highest-blast-radius recovery path can regress without CI signal.
- Priority: High

**Live discovery smoke does not prove matching candidates exist:**
- What's not tested: scheduled live-registry verification against current `BrokerIntent` values and a non-zero match count.
- Files: `.github/workflows/live-discovery-smoke.yml`, `src/sources/mcp-registry.ts`, `tests/sources/mcp-registry.test.ts`
- Risk: live MCP discovery can quietly degrade while the smoke job stays green.
- Priority: High

**Generated shell runners are not tested against awkward or hostile filesystem paths:**
- What's not tested: install paths containing spaces, quotes, `$`, or shell metacharacters.
- Files: `src/hosts/codex/install.ts`, `src/hosts/claude-code/install.ts`, `src/shared-home/install.ts`, `tests/e2e/shared-home-smoke.test.ts`, `tests/e2e/claude-code-smoke.test.ts`
- Risk: installation and host-shell execution can fail or behave unsafely on edge-case paths even though normal-path smokes are green.
- Priority: High

**State contention and scale behavior for cache/trace/advisory stores:**
- What's not tested: concurrent writes to `broker-cache.json`, large `routing-traces.jsonl`, large acquisition-memory files, and deep verified-downstream trees.
- Files: `src/core/cache/store.ts`, `src/broker/trace-store.ts`, `src/broker/acquisition-memory.ts`, `src/broker/downstream-manifest-source.ts`, `tests/core/cache.test.ts`, `tests/broker/workflow-session-store.test.ts`
- Risk: correctness can hold in small fixtures while larger deployments see latent corruption or latency regressions.
- Priority: Medium

**Narrative doc drift, especially Chinese docs, has no safety net:**
- What's not tested: parity between `README.md`, `README.zh-CN.md`, and `TODOS.md`.
- Files: `README.md`, `README.zh-CN.md`, `TODOS.md`, `tests/shared-home/status.test.ts`
- Risk: operator guidance diverges across languages even while status tests stay green.
- Priority: Medium

---

*Concerns audit: 2026-04-22*
