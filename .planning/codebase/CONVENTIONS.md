# Coding Conventions

**Analysis Date:** 2026-04-22

## Naming Patterns

**Files:**
- Use lowercase kebab-case for source and test files. Examples: `src/broker/query-compiler.ts`, `src/shared-home/peer-surface-audit.ts`, `tests/shared-home/update-lifecycle.test.ts`.
- Keep host-specific code under a host-named directory. Examples: `src/hosts/claude-code/adapter.ts`, `src/hosts/codex/install.ts`.
- Keep checked-in JSON contracts in kebab-case seed files. Examples: `config/host-skills.seed.json`, `config/mcp-registry.seed.json`, `config/maintained-broker-first-families.json`.

**Functions:**
- Use camelCase for functions and helpers. Examples: `resolveCurrentHost` in `src/cli.ts`, `normalizeRequest` in `src/core/request.ts`, `buildHostShellSkillMarkdown` in `src/hosts/skill-markdown.ts`.
- Prefix assertion and parser helpers with intent-revealing verbs such as `assert*`, `parse*`, `resolve*`, `build*`, `load*`, `write*`, `format*`. Examples: `assertInstalledPlugin`, `parseBrokerEnvelope`, `resolveLifecyclePaths`, `buildPackageAcquisitionHint`.

**Variables:**
- Use camelCase for local variables and object properties. Examples: `brokerHomeDirectory`, `hostCatalogFilePath`, `secondaryMaintainedExamples`, `executionFailureRetryPayload`.
- Use all-caps snake case for constant tables and literal lists. Examples: `BROKER_HOSTS` in `src/core/types.ts`, `WEBSITE_QA_HERO_EXAMPLES` in `src/hosts/skill-markdown.ts`.

**Types:**
- Use PascalCase for exported type aliases and classes. Examples: `RunBrokerResult` in `src/broker/result.ts`, `CapabilityQuery` in `src/core/types.ts`, `WorkflowSessionConflictError` in `src/broker/workflow-session-store.ts`.
- Suffix domain errors with `Error`. Examples: `UnsupportedBrokerRequestError` in `src/core/request.ts`, `PrepareCandidateError` in `src/broker/prepare.ts`.
- Keep string IDs domain-specific:
  - broker candidate IDs are kebab-case, for example `web-content-to-markdown` in `config/host-skills.seed.json`
  - compatibility intents and job families are snake_case, for example `web_content_to_markdown` and `requirements_analysis`
  - implementation IDs use dotted package identity, for example `baoyu.url_to_markdown` and `gstack.office_hours`

## Module Boundaries

**Core contracts stay in `src/core`:**
- Put shared types, request normalization, validation, and workflow contracts in `src/core/*.ts`.
- Examples: `src/core/types.ts`, `src/core/request.ts`, `src/core/envelope.ts`, `src/core/workflow.ts`.
- `src/core` is the schema boundary. Other layers depend on it; it should not import from `src/broker`, `src/hosts`, or `src/shared-home`.

**Broker orchestration stays in `src/broker`:**
- Put ranking, discovery merge, handoff preparation, workflow runtime, cache usage, and routing traces in `src/broker/*.ts`.
- Examples: `src/broker/run.ts`, `src/broker/rank.ts`, `src/broker/prepare.ts`, `src/broker/workflow-runtime.ts`.
- `src/broker` composes `src/core`, `src/sources`, and selective `src/shared-home` helpers, then returns typed result objects instead of host-specific output.

**Host-specific shell behavior stays in `src/hosts`:**
- Keep host adapters and shell installers isolated per host directory.
- Examples: `src/hosts/claude-code/adapter.ts`, `src/hosts/codex/install.ts`.
- Shared host-shell text generation belongs in `src/hosts/skill-markdown.ts`, not in broker logic.

**Shared install/doctor/remove lifecycle stays in `src/shared-home`:**
- Put filesystem layout, lifecycle operations, status evaluation, ownership manifests, and doctor formatting in `src/shared-home/*.ts`.
- Examples: `src/shared-home/install.ts`, `src/shared-home/update.ts`, `src/shared-home/doctor.ts`, `src/shared-home/status.ts`.

**Discovery-source readers stay in `src/sources`:**
- Keep host skill catalog parsing and MCP registry parsing in `src/sources/*.ts`.
- Examples: `src/sources/host-skill-catalog.ts`, `src/sources/mcp-registry.ts`.

**CLI entrypoints stay thin:**
- `src/cli.ts` is the broker runner contract.
- `src/bin/skills-broker.ts` is the lifecycle CLI entrypoint.
- Parse input, delegate to typed services, and write output there; avoid embedding business rules directly in shell glue.

## Type Usage

**Type aliases over interfaces:**
- The codebase consistently uses `type`, not `interface`, for data contracts. Examples: `CapabilityQuery` in `src/core/types.ts`, `BrokerFailureResult` in `src/broker/result.ts`, `RunClaudeCodeAdapterOptions` in `src/hosts/claude-code/adapter.ts`.

**Use literal unions and `as const` for closed sets:**
- Closed enums are modeled as readonly arrays plus derived union types. Examples: `BROKER_HOSTS`, `CAPABILITY_QUERY_KINDS`, `DOWNSTREAM_EXECUTION_FAILURE_REASON_CODES` in `src/core/types.ts`.
- Prefer `as const` and `satisfies` to keep runtime data and compile-time exhaustiveness aligned. Example: `BROKER_HOST_SUPPORT` in `src/core/types.ts`.

**Prefer discriminated unions for outcomes:**
- Public broker results use tagged unions rather than exception-heavy control flow. Example: `RunBrokerResult` in `src/broker/result.ts`.
- Workflow and decline states carry explicit codes such as `HANDOFF_READY`, `WORKFLOW_BLOCKED`, `PREPARE_FAILED`, and `INSTALL_REQUIRED`.

**Prefer `import type` for type-only dependencies:**
- The codebase consistently separates runtime imports from type-only imports. Examples: `src/broker/result.ts`, `src/core/capability-card.ts`, `src/hosts/codex/adapter.ts`.

**Use utility types for narrowed views:**
- `Pick`, `Omit`, `ReturnType`, and `Parameters` are standard patterns.
- Examples: `WorkflowStageView` in `src/broker/result.ts`, `NormalizedCapabilityQueryMetadata` in `src/core/capability-card.ts`, `expectRejected` in `tests/core/request-normalization.test.ts`.

## Code Style

**Formatting:**
- No formatter config is checked in. `.prettierrc*`, `eslint.config.*`, `.eslintrc*`, and `biome.json` are not detected at repo root.
- Follow the existing source style instead:
  - 2-space indentation
  - double quotes
  - semicolons
  - trailing commas only where TypeScript formatting naturally introduces them in multiline objects and arrays
- Keep ESM syntax throughout the repo. `package.json` sets `"type": "module"`, and source imports use `.js` suffixes even in `.ts` files. Examples: `src/cli.ts`, `src/broker/run.ts`.

**Linting:**
- No standalone lint step is configured in `package.json`.
- The effective static-quality gate is TypeScript strict mode from `tsconfig.json` plus tests from `vitest.config.ts`.
- Treat `tsconfig.json` as the baseline contract:
  - `"strict": true`
  - `"module": "NodeNext"`
  - `"target": "ES2022"`

## Import Organization

**Order:**
1. Node built-ins via `node:` specifiers. Examples: `node:path`, `node:fs/promises`, `node:child_process`.
2. Internal relative imports from the current layer or neighboring layers.
3. Type-only imports are split with `import type` instead of mixed into value imports when practical.

**Path Aliases:**
- No path aliases are configured in `tsconfig.json`.
- Use relative imports with explicit `.js` suffixes. Examples:

```ts
import { execFile } from "node:child_process";
import { parseBrokerEnvelope } from "./core/envelope.js";
import type { NormalizeRequestInput } from "../../core/request.js";
```

**Barrel files:**
- Barrel files are not used.
- Import concrete modules directly. Examples: tests import `../../src/core/request`, `../../src/shared-home/doctor`, `../../src/hosts/codex/install`.

## Error Handling

**Patterns:**
- Throw on invalid input at parsing and validation boundaries. Examples: `parseCapabilityQuery` in `src/core/capability-query.ts`, `parseBrokerEnvelope` in `src/core/envelope.ts`, `runLifecycleCli` in `src/bin/skills-broker.ts`.
- Use custom error classes when the caller needs a stable domain code. Examples: `UnsupportedBrokerRequestError` and `AmbiguousBrokerRequestError` in `src/core/request.ts`, `WorkflowSessionConflictError` in `src/broker/workflow-session-store.ts`.
- Convert expected broker failures into structured results instead of letting them escape as uncaught exceptions. Examples: `RunBrokerResult` in `src/broker/result.ts`, decline-contract coverage in `tests/hosts/host-decline-contract.test.ts`.
- Return `null` for absent JSON files only on `ENOENT`; rethrow other I/O failures. Example: `readJsonFile` in `src/shared-home/json-file.ts`.

**Preferred boundary rule:**
- Library and orchestration code should either:
  - return a typed success/failure object when the host needs to branch on it, or
  - throw a precise `Error` when the input contract is invalid.
- Top-level executables own `stderr` and exit-code behavior. Example: `src/bin/skills-broker.ts`.

## CLI & Logging

**Framework:** `process.stdout.write` / `process.stderr.write` with targeted `console.log` and `console.error` only at CLI boundaries.

**Patterns:**
- `src/cli.ts` writes exactly one JSON object to stdout and returns the same typed result:

```ts
const response = await runBroker(envelope, { ...options, currentHost });
process.stdout.write(JSON.stringify(output));
```

- `src/bin/skills-broker.ts` formats lifecycle commands as text or JSON with `formatLifecycleResult(...)`, then sets `process.exitCode` for strict failures.
- Tests assert CLI stability by spying on stdout rather than inspecting logs indirectly. Example: `tests/cli/cli-contract.test.ts`.
- Avoid ad hoc logging inside core broker modules. Operational text is centralized in `src/shared-home/format.ts`.

**Output contract:**
- Prefer stable machine-readable JSON for broker runner output and optional lifecycle JSON output.
- Text output is reserved for operator-facing lifecycle summaries such as `doctor`, `update`, and `remove`.

## Configuration

**Repo configuration:**
- Runtime seed data lives under `config/`.
- Current checked-in config files are:
  - `config/host-skills.seed.json`
  - `config/mcp-registry.seed.json`
  - `config/maintained-broker-first-families.json`
- Keep these files human-readable JSON with stable IDs, explicit package/leaf metadata, and schema markers where the contract is versioned.

**Runtime configuration:**
- Environment-driven broker overrides are read in `src/cli.ts`. Supported examples include `BROKER_CACHE_FILE`, `BROKER_HOST_CATALOG`, `BROKER_MCP_REGISTRY`, `BROKER_HOME_DIR`, `BROKER_PACKAGE_SEARCH_ROOTS`, `BROKER_CURRENT_HOST`, and `BROKER_NOW`.
- Shared-home runtime state is filesystem-based, not repo-config-based. Paths are resolved in `src/shared-home/paths.ts`.

**JSON file conventions:**
- Pretty-print JSON with `JSON.stringify(value, null, 2)` and a trailing newline. Example writer: `writeJsonFile` in `src/shared-home/json-file.ts`.
- Use `schemaVersion` for persisted contracts and manifests. Examples: `STATUS.md`, `config/maintained-broker-first-families.json`, `.skills-broker.json` fixtures in `tests/shared-home/doctor.test.ts`.
- Use JSONL for append-only trace/event logs. Example: routing traces via `src/broker/trace-store.ts`.

## Comments

**When to Comment:**
- Inline comments are rare in `src/` and `tests/`; the codebase prefers descriptive names, explicit types, and contract tests.
- When explaining behavior, the project leans on tests and docs instead of inline commentary. Examples: `tests/hosts/host-shell-install.test.ts`, `docs/superpowers/specs/2026-03-30-capability-query-router-design.md`.

**JSDoc/TSDoc:**
- Not used as a primary documentation style.
- New behavior is typically documented through:
  - exported type shapes in `src/core/*.ts`
  - contract-heavy tests in `tests/**/*.test.ts`
  - root and design docs such as `README.md`, `README.zh-CN.md`, and `docs/superpowers/specs/*.md`

## Documentation Conventions

**Root docs:**
- Keep user-facing docs bilingual at the repo root with `README.md` and `README.zh-CN.md`.
- Operator/project state is documented in `STATUS.md`.

**Status board contract:**
- `STATUS.md` contains prose plus one canonical fenced `json` block between:
  - `<!-- skills-broker-status:start -->`
  - `<!-- skills-broker-status:end -->`
- Tests treat that block as executable contract, not commentary. See `tests/shared-home/status.test.ts`.

**Planning docs:**
- Implementation plans and specs are stored under `docs/superpowers/plans/` and `docs/superpowers/specs/`.
- File names are date-prefixed and kebab-case. Examples:
  - `docs/superpowers/specs/2026-03-30-capability-query-router-design.md`
  - `docs/superpowers/plans/2026-04-18-semantic-resolver-web-markdown-implementation.md`

**Generated skill docs:**
- Host-shell instructions are generated Markdown with YAML frontmatter. Source: `src/hosts/skill-markdown.ts`.
- Heading order and contract text are test-protected in `tests/hosts/host-shell-install.test.ts` and `tests/e2e/shared-home-smoke.test.ts`.

## Function Design

**Size:**
- Prefer small pure helpers around explicit orchestration functions.
- Large orchestration files exist, especially `src/broker/run.ts` and `src/shared-home/update.ts`, but even those are broken into many internal helpers rather than one monolithic `main`.

**Parameters:**
- Prefer one typed options object when a function has multiple optional inputs. Examples: `runBroker`, `runClaudeCodeAdapter`, `installClaudeCodePlugin`, `updateSharedBrokerHome`.
- Use plain positional parameters for tiny local helpers such as `readFlagValue` or `resolveNpmCliPath`.

**Return Values:**
- Return typed objects with stable fields over tuples or implicit booleans.
- Use explicit discriminators like `ok`, `command`, `code`, `status`, `kind`, or `state`.

## Module Design

**Exports:**
- Prefer named exports only. Default exports are not used in `src/`.
- Export types alongside functions from the defining module. Examples: `src/broker/result.ts`, `src/shared-home/update.ts`, `src/core/types.ts`.

**Boundary tests:**
- Most modules have a corresponding direct test file under `tests/` with the same domain naming. Examples:
  - `src/core/request.ts` -> `tests/core/request.test.ts` and `tests/core/request-normalization.test.ts`
  - `src/shared-home/doctor.ts` -> `tests/shared-home/doctor.test.ts`
  - `src/hosts/claude-code/install.ts` -> `tests/hosts/host-shell-install.test.ts`

**Generated/build output:**
- `dist/` contains compiled runtime and compiled tests after build. Source edits belong in `src/` and `tests/`, not in `dist/`.

---

*Convention analysis: 2026-04-22*
