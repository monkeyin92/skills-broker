# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```text
skills-broker/
├── src/                    # TypeScript source for runtime, lifecycle, host shells, and discovery
│   ├── bin/                # Published lifecycle CLI entry
│   ├── broker/             # Runtime orchestration, ranking, handoff, workflow state
│   ├── core/               # Shared contracts, types, cache policy, normalization
│   ├── hosts/              # Host-specific adapters, installers, generated shell content
│   ├── shared-home/        # Shared runtime install/update/remove/doctor logic
│   └── sources/            # Host catalog and MCP registry readers
├── config/                 # Seed catalogs and maintained broker-first contract
├── tests/                  # Unit, integration, e2e, fixtures, and helpers
├── docs/superpowers/       # Implementation plans and design specs
├── scripts/                # Shell helpers for local install/update flows
├── .github/workflows/      # CI, publish, and live smoke pipelines
├── dist/                   # Compiled runtime emitted by `npm run build`
├── .planning/codebase/     # Generated codebase maps for later planning
├── package.json            # npm metadata, bin entry, scripts
├── tsconfig.json           # dev/test TypeScript config
└── tsconfig.build.json     # publish/build TypeScript config
```

## Directory Purposes

**`src/bin`:**
- Purpose: expose the operator-facing lifecycle CLI
- Contains: `skills-broker.ts`
- Key files: `src/bin/skills-broker.ts`

**`src/broker`:**
- Purpose: implement runtime routing and workflow orchestration
- Contains: discovery merge logic, ranking, prepare, handoff, local-skill resolution, workflow runtime/session store, acquisition memory, traces
- Key files: `src/broker/run.ts`, `src/broker/rank.ts`, `src/broker/workflow-runtime.ts`, `src/broker/package-availability.ts`, `src/broker/trace.ts`

**`src/core`:**
- Purpose: define stable contracts and low-level policy shared by every layer
- Contains: request/envelope parsing, host support metadata, `CapabilityCard`, workflow types, maintained-family contract parsing, cache helpers
- Key files: `src/core/envelope.ts`, `src/core/request.ts`, `src/core/capability-card.ts`, `src/core/types.ts`, `src/core/workflow.ts`, `src/core/maintained-broker-first.ts`

**`src/hosts`:**
- Purpose: isolate host-specific surfaces without duplicating broker logic
- Contains: Claude Code and Codex adapter/install code, plus shared `SKILL.md` generator
- Key files: `src/hosts/claude-code/install.ts`, `src/hosts/claude-code/adapter.ts`, `src/hosts/codex/install.ts`, `src/hosts/codex/adapter.ts`, `src/hosts/skill-markdown.ts`

**`src/shared-home`:**
- Purpose: manage the shared broker runtime and audited filesystem state
- Contains: shared-home installer, update/remove flows, doctor diagnostics, host-surface migration, ownership manifests, JSON file helpers
- Key files: `src/shared-home/install.ts`, `src/shared-home/update.ts`, `src/shared-home/doctor.ts`, `src/shared-home/host-surface.ts`, `src/shared-home/status.ts`, `src/shared-home/ownership.ts`

**`src/sources`:**
- Purpose: read and validate external capability inventories
- Contains: host skill catalog loader and MCP registry search adapter
- Key files: `src/sources/host-skill-catalog.ts`, `src/sources/mcp-registry.ts`

**`config`:**
- Purpose: hold the broker’s built-in discovery and proof defaults
- Contains: package/skill/workflow seed catalog, MCP seed registry, maintained broker-first family definitions
- Key files: `config/host-skills.seed.json`, `config/mcp-registry.seed.json`, `config/maintained-broker-first-families.json`

**`tests`:**
- Purpose: verify behavior by module boundary and by installed runtime flow
- Contains: `broker/`, `core/`, `cli/`, `hosts/`, `shared-home/`, `sources/`, `integration/`, `e2e/`, `fixtures/`, `helpers/`
- Key files: `tests/integration/broker-flow.test.ts`, `tests/e2e/shared-home-smoke.test.ts`, `tests/e2e/workflow-host-smoke.test.ts`, `tests/broker/workflow-runtime.test.ts`

**`docs/superpowers`:**
- Purpose: keep design intent and implementation plans next to the repo
- Contains: dated plan docs under `docs/superpowers/plans/` and design/spec docs under `docs/superpowers/specs/`
- Key files: `docs/superpowers/specs/2026-03-31-broker-first-capability-scaling-design.md`, `docs/superpowers/plans/2026-04-16-website-qa-default-entry-implementation.md`

**`scripts`:**
- Purpose: wrap common local maintenance flows around the built artifact
- Contains: shell helpers for Claude Code install and shared-home update
- Key files: `scripts/install-claude-code.sh`, `scripts/update-shared-home.sh`

## Key File Locations

**Entry Points:**
- `src/bin/skills-broker.ts`: published lifecycle CLI for `update`, `doctor`, and `remove`
- `src/cli.ts`: broker request CLI invoked by installed runner scripts
- `package.json`: npm `bin` declaration pointing `skills-broker` to `dist/bin/skills-broker.js`

**Configuration:**
- `package.json`: package metadata, build/test scripts, publish payload
- `tsconfig.json`: dev/test compile settings for `src/` and `tests/`
- `tsconfig.build.json`: build-only config emitting `src/` into `dist/`
- `config/host-skills.seed.json`: default packages, skills, and workflows
- `config/mcp-registry.seed.json`: seed MCP candidates
- `config/maintained-broker-first-families.json`: maintained boundary examples and expected winners
- `.github/workflows/ci.yml`: build, test, and strict doctor gate
- `.github/workflows/publish-npm.yml`: tag-driven npm publish flow

**Core Logic:**
- `src/broker/run.ts`: end-to-end broker execution path
- `src/core/request.ts`: request normalization entry
- `src/broker/query-compiler.ts`: raw-text heuristics that synthesize `capabilityQuery`
- `src/sources/host-skill-catalog.ts`: catalog validation and workflow materialization
- `src/broker/workflow-runtime.ts`: stage execution/resume engine
- `src/shared-home/update.ts`: shared-home installation and host-surface repair orchestration

**Documentation:**
- `README.md`: current product scope, runtime overview, and install story
- `README.zh-CN.md`: Chinese mirror of the public docs
- `docs/superpowers/plans/*.md`: dated implementation packets
- `docs/superpowers/specs/*.md`: dated architecture/design records

**Testing:**
- `tests/core/*.test.ts`: contract and normalization tests
- `tests/broker/*.test.ts`: ranking, prepare, package probing, workflow runtime, trace, and memory tests
- `tests/hosts/*.test.ts`: shell installer and host-contract tests
- `tests/shared-home/*.test.ts`: lifecycle, doctor, host-surface, and status tests
- `tests/integration/broker-flow.test.ts`: multi-module broker routing checks
- `tests/e2e/*.test.ts`: installed runtime smoke/eval coverage
- `tests/fixtures/*.json`: replayable catalog/eval fixtures

## Naming Conventions

**Files:**
- Runtime source files use kebab-case nouns: `workflow-session-store.ts`, `host-skill-catalog.ts`, `local-skill-handoff.ts`
- Host-specific code lives under host-id directories that match `BrokerHost` values from `src/core/types.ts`: `src/hosts/claude-code/`, `src/hosts/codex/`
- Tests mirror the domain under `tests/` and end in `.test.ts`: `tests/broker/package-availability.test.ts`, `tests/shared-home/update-lifecycle.test.ts`
- JSON config and fixtures are kebab-case with dated or domain-specific names: `config/maintained-broker-first-families.json`, `tests/fixtures/phase2-coarse-boundary-eval.json`

**Directories:**
- Top-level source is layered by concern, not by technical primitive: `src/core/`, `src/broker/`, `src/shared-home/`, `src/hosts/`, `src/sources/`
- Documentation is grouped by intent, then date: `docs/superpowers/plans/2026-04-16-website-qa-default-entry-implementation.md`
- Tests are grouped by the same architectural boundary names as `src/`, with separate `integration/` and `e2e/` folders for cross-layer flows

## Module Layering

**Bottom layer: `src/core/`**
- Owns the contracts and should remain dependency-light
- Safe dependencies: Node built-ins and neighboring `src/core/*`
- Avoid placing broker orchestration or filesystem lifecycle code here

**Discovery layer: `src/sources/` + `config/`**
- Converts external JSON catalogs/registry payloads into validated broker-native objects
- Use this layer for new supplier adapters or schema validation, not for ranking policy

**Runtime layer: `src/broker/`**
- Orchestrates normalized requests, discovery, ranking, prepare, and workflow execution
- This is the correct place for new routing behavior, replay logic, or handoff assembly

**Host integration layer: `src/hosts/`**
- Keep host-specific runner, shell-layout, and invocation differences here
- Do not copy broker logic into host directories; call `src/cli.ts` or `src/broker/run.ts`

**Lifecycle layer: `src/shared-home/`**
- Owns install/update/remove/doctor flows and broker-managed filesystem state
- Use this layer for cross-host repair, diagnostics, ownership manifests, and proof rails

## Where to Add New Code

**New Feature:**
- Primary broker routing code: `src/broker/`
- Request normalization changes: `src/core/request.ts` and `src/broker/query-compiler.ts`
- Seed catalog additions: `config/host-skills.seed.json` or `config/mcp-registry.seed.json`
- Tests: `tests/broker/`, `tests/core/`, and `tests/integration/broker-flow.test.ts`

**New Workflow:**
- Recipe definition: `config/host-skills.seed.json` under `workflows`
- Runtime behavior: keep generic logic in `src/broker/workflow-runtime.ts`; avoid hard-coding workflow specifics outside catalog/schema validation
- Tests: `tests/broker/workflow-runtime.test.ts` and `tests/e2e/workflow-host-smoke.test.ts`

**New Host Integration:**
- Implementation: `src/hosts/<host-id>/`
- Shared host registration: `src/core/types.ts`
- Install path resolution and lifecycle wiring: `src/shared-home/paths.ts`, `src/shared-home/update.ts`, `src/shared-home/doctor.ts`
- Tests: `tests/hosts/` and relevant `tests/e2e/*.test.ts`

**Utilities:**
- Request/type/policy helpers: `src/core/`
- File-backed lifecycle helpers: `src/shared-home/`
- Broker-only helpers: keep them near the orchestrator in `src/broker/`
- Do not create a generic `utils/` bucket; the repo already organizes helper code by domain

## Documentation and Test Layout

**Documentation Layout:**
- Public product docs live in `README.md` and `README.zh-CN.md`
- Internal design history lives under `docs/superpowers/specs/`
- Implementation execution history lives under `docs/superpowers/plans/`
- Generated planning outputs for later agents belong in `.planning/codebase/`

**Test Layout:**
- Use `tests/core/` when validating contracts and parsing
- Use `tests/broker/` when validating runtime modules in isolation
- Use `tests/hosts/` when validating generated host shell content or adapters
- Use `tests/shared-home/` for install/update/remove/doctor and filesystem integrity flows
- Use `tests/integration/` for multi-module runtime calls without a fully installed shell
- Use `tests/e2e/` for built artifact, installed shell, cross-host reuse, and smoke/eval scenarios

## Special Directories

**`dist/`:**
- Purpose: compiled JavaScript runtime consumed by npm packaging, installed runners, and smoke tests
- Generated: Yes
- Committed: No

**`tests/fixtures/`:**
- Purpose: stable JSON fixtures for evals, catalogs, and registry responses
- Generated: No
- Committed: Yes

**`docs/superpowers/`:**
- Purpose: design/spec and implementation packet history
- Generated: No
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: generated architecture/structure/conventions/concerns maps for later planning commands
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-22*
