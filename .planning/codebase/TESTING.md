# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**Runner:**
- Vitest `^1.5.7`
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest `expect`

**Run Commands:**
```bash
npm test                               # Run the configured suite from `package.json`
node ./node_modules/vitest/vitest.mjs --watch
```

Coverage: Not configured. `package.json`, `vitest.config.ts`, and `devDependencies` do not define a coverage script, provider package, or threshold gate.

**Execution environment:**
- `vitest.config.ts` sets `environment: "node"` and `globals: true`.
- In practice, tests still usually import `describe`, `it`, `expect`, and `vi` explicitly from `vitest`.

**CI path:**
- `.github/workflows/ci.yml` runs:
  - `npm ci`
  - `npm run build`
  - `npm test`
- The same workflow also runs a separate strict lifecycle check by executing `node dist/bin/skills-broker.js doctor --strict ...`.

## Test File Organization

**Location:**
- Source tests live under `tests/`, grouped by product layer:
  - `tests/core`
  - `tests/broker`
  - `tests/cli`
  - `tests/hosts`
  - `tests/shared-home`
  - `tests/sources`
  - `tests/integration`
  - `tests/e2e`
- Test-only helpers live in `tests/helpers`.
- Static JSON fixtures live in `tests/fixtures`.

**Naming:**
- Use `*.test.ts` exclusively. `vitest.config.ts` includes `tests/**/*.test.ts`.
- `*.spec.ts` is not used.
- Built artifacts in `dist/tests/**/*.js` exist after compilation, but configured test source-of-truth is still `tests/**/*.test.ts`.

**Structure:**
```text
tests/
├── broker/         # broker routing, ranking, handoff, workflow, caching
├── cli/            # broker CLI and lifecycle CLI contracts
├── core/           # parsing, normalization, capability cards, cache policy
├── e2e/            # built runtime, package, and smoke flows
├── fixtures/       # checked-in JSON fixtures
├── helpers/        # git/npm test utilities
├── hosts/          # host adapters and host-shell installers
├── integration/    # end-to-end broker flows without external services
├── shared-home/    # install/update/remove/doctor/status state and lifecycle
└── sources/        # catalog and registry readers
```

## Test Structure

**Suite Organization:**
- Tests mirror the module or contract they protect.
- Unit suites usually follow one module per file with one top-level `describe(...)`.
- CLI contract files often use top-level `test(...)` blocks instead of nested describes.

```ts
describe("normalizeRequest", () => {
  it("normalizes webpage markdown requests into the query-native broker contract", () => {
    const normalized = normalizeRequest(
      {
        task: "turn this webpage into markdown",
        url: "https://example.com"
      },
      "claude-code"
    );

    expect(normalized).not.toHaveProperty("intent");
    expect(normalized.outputMode).toBe("markdown_only");
  });
});
```

Source: `tests/core/request.test.ts`

**Patterns:**
- Create small local helpers at the top of the test file when assertions repeat. Examples:
  - `expectQueryNativeRequest` in `tests/core/request.test.ts`
  - `expectRejected` in `tests/core/request-normalization.test.ts`
  - `expectInOrder` in `tests/hosts/host-shell-install.test.ts`
- Prefer explicit temp-directory setup inside each test file over shared global setup. Examples:
  - `createRuntimePaths` in `tests/integration/broker-flow.test.ts`
  - `renderStatusBoard` and fixture writers in `tests/shared-home/doctor.test.ts`
- Use `try/finally` cleanup with `rm(..., { recursive: true, force: true })` around filesystem-heavy tests.
- Use `afterEach` only where mock state needs reset. Examples: `tests/hosts/host-decline-contract.test.ts`, `tests/e2e/phase1-website-qa-eval.test.ts`.

## Mocking

**Framework:** Vitest `vi`

**Patterns:**
- Mock stdout/stderr boundaries when testing CLI output shape:

```ts
const writes: string[] = [];
const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
  (chunk: string) => {
    writes.push(String(chunk));
    return true;
  }
);
```

Source: `tests/cli/cli-contract.test.ts`

- Mock internal modules only when validating decline or recovery behavior that is hard to force through public inputs:

```ts
vi.doMock("../../src/broker/prepare", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/broker/prepare")>();

  return {
    ...actual,
    prepareCandidate: vi.fn(async () => {
      throw new Error("kaboom");
    })
  };
});
```

Source: `tests/hosts/host-decline-contract.test.ts`

- Reset mocks explicitly with `vi.resetModules()` and `vi.restoreAllMocks()` after mocked-module suites.

**What to Mock:**
- Process output and CLI boundary effects in `tests/cli/cli-contract.test.ts`
- Internal function failures for negative contract tests in `tests/hosts/host-decline-contract.test.ts`
- Targeted stateful behavior in eval-harness tests such as `tests/e2e/phase1-website-qa-eval.test.ts`

**What NOT to Mock:**
- Filesystem behavior for lifecycle, installer, and broker-home tests. These suites usually create real temp directories and real files.
- `git`, `node`, and `npm` process execution in integration/e2e paths. The project prefers `execFile` plus temp repos over abstract mocks.
- Catalog and registry data loading. Tests usually write actual JSON fixtures to disk and exercise the real parser.

## Fixtures and Factories

**Test Data:**
- Use a mix of checked-in JSON fixtures and file-local factory functions.

```ts
function createSession(runId: string): WorkflowSession {
  return {
    runId,
    workflowId: "idea-to-ship",
    requestText: "我有一个想法：做一个自动串起评审和发版的工具",
    request: normalizeRequest({
      requestText: "我有一个想法：做一个自动串起评审和发版的工具",
      host: "codex"
    }),
    host: "codex",
    revision: 0,
    status: "active",
    activeStageId: "office-hours",
    completedStageIds: [],
    artifacts: [],
    stageArtifacts: {},
    createdAt: "2026-03-31T08:00:00.000Z",
    updatedAt: "2026-03-31T08:00:00.000Z"
  };
}
```

Source: `tests/broker/workflow-session-store.test.ts`

**Location:**
- JSON fixtures: `tests/fixtures/host-skill-catalog.json`, `tests/fixtures/phase1-website-qa-eval.json`, `tests/fixtures/phase2-coarse-boundary-eval.json`
- Shell/process helpers: `tests/helpers/git.ts`, `tests/helpers/npm.ts`
- Large inline fixture writers for lifecycle state are local to the consuming suite, especially `tests/shared-home/doctor.test.ts`

**Fixture style:**
- Write JSON with `JSON.stringify(..., null, 2)` plus a trailing newline.
- Encode realistic runtime state instead of stubbing domain logic. Examples: `.skills-broker.json` manifests, `STATUS.md` boards, routing trace JSONL, acquisition memory files.

## Coverage

**Requirements:** None enforced by tooling.

**What CI actually guards:**
- Full TypeScript compile via `npm run build`
- Full Vitest suite via `npm test`
- Separate strict doctor/status execution via `.github/workflows/ci.yml`

**Coverage shape in practice:**
- Heavy contract coverage exists for parsers, routing decisions, lifecycle output, and shell installers.
- Critical long-form suites include:
  - `tests/integration/broker-flow.test.ts` with 4184 lines
  - `tests/shared-home/doctor.test.ts` with 1538 lines
  - `tests/cli/lifecycle-cli.test.ts` with 1451 lines

**View Coverage:**
```bash
Not configured
```

## Test Types

**Unit Tests:**
- Parse/normalize/validate pure contracts in `tests/core/*.test.ts`
- Rank, discover, prepare, trace, and workflow helpers in `tests/broker/*.test.ts`
- Read catalog/registry inputs in `tests/sources/*.test.ts`
- These suites usually stay in-process and avoid child processes unless the unit under test is itself a process adapter.

**Integration Tests:**
- `tests/integration/broker-flow.test.ts` exercises `runBroker(...)` against real temp files, real cache/session persistence, install-required flows, verify/reuse, fallback, and migration behavior.
- `tests/cli/cli-contract.test.ts` validates the broker runner contract as a serialized CLI surface.
- `tests/shared-home/*.test.ts` acts as service-level integration over filesystem state, manifests, trace logs, git repos, and lifecycle formatting.

**E2E Tests:**
- `tests/e2e/shared-home-smoke.test.ts` and `tests/e2e/host-auto-routing-smoke.test.ts` validate installed host-shell behavior.
- `tests/e2e/published-package-smoke.test.ts` runs `npm pack` and installs the packed artifact.
- `tests/e2e/status-doctor-git.test.ts` runs strict doctor/status flows against real git repositories.
- `tests/e2e/phase1-website-qa-eval.test.ts` and `tests/e2e/phase2-coarse-boundary-eval.test.ts` act as eval harnesses for boundary quality, not just raw functionality.

## Covered Areas

**Well-covered contracts:**
- Envelope and request normalization:
  - `tests/core/request.test.ts`
  - `tests/core/request-normalization.test.ts`
  - `tests/core/envelope.test.ts`
  - `tests/core/capability-query.test.ts`
- Capability shaping, discovery, ranking, and handoff:
  - `tests/core/capability-card.test.ts`
  - `tests/broker/discover.test.ts`
  - `tests/broker/rank.test.ts`
  - `tests/broker/handoff.test.ts`
  - `tests/broker/package-availability.test.ts`
  - `tests/broker/prepare.test.ts`
- Workflow persistence and migration:
  - `tests/broker/workflow-runtime.test.ts`
  - `tests/broker/workflow-session-store.test.ts`
  - `tests/integration/broker-flow.test.ts`
- Lifecycle and doctor/status behavior:
  - `tests/shared-home/doctor.test.ts`
  - `tests/shared-home/update-lifecycle.test.ts`
  - `tests/shared-home/status.test.ts`
  - `tests/cli/lifecycle-cli.test.ts`
- Host shell and package distribution:
  - `tests/hosts/host-shell-install.test.ts`
  - `tests/hosts/host-decline-contract.test.ts`
  - `tests/e2e/shared-home-smoke.test.ts`
  - `tests/e2e/published-package-smoke.test.ts`

## Common Patterns

**Async Testing:**

```ts
const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-cli-"));

try {
  const result = await runBrokerCli(parsedEnvelope, options);
  expect(result.outcome.code).toBe("HANDOFF_READY");
} finally {
  await rm(runtimeDirectory, { recursive: true, force: true });
}
```

Sources: `tests/cli/cli-contract.test.ts`, `tests/integration/broker-flow.test.ts`, `tests/shared-home/doctor.test.ts`

**Error Testing:**

```ts
expect(() =>
  normalizeRequest({
    requestText: "summarize this idea",
    host: "claude-code"
  })
).toThrow();
```

```ts
try {
  normalizeRequest(input);
  throw new Error("Expected normalizeRequest to reject the request.");
} catch (error) {
  expect(error).toMatchObject({ code: "UNSUPPORTED_REQUEST" });
}
```

Sources: `tests/core/request.test.ts`, `tests/core/request-normalization.test.ts`

**Concurrency Testing:**

```ts
const results = await Promise.allSettled([
  store.write(next, { expectedRevision: start.revision }),
  store.write(next, { expectedRevision: start.revision })
]);

expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
```

Source: `tests/broker/workflow-session-store.test.ts`

## Obvious Gaps

**Coverage reporting gap:**
- No coverage command, threshold, or provider package is configured.
- CI can tell whether tests pass, but not whether new work reduces coverage.

**Platform matrix gap:**
- `.github/workflows/ci.yml` runs only on `ubuntu-latest`.
- Host-shell installers generate bash runners in `src/hosts/claude-code/install.ts` and `src/hosts/codex/install.ts`, but there is no CI matrix covering macOS or Windows shells.

**Skipped test debt:**
- `tests/shared-home/update-lifecycle.test.ts` contains one skipped case:
  - `it.skip("fails closed when repair cannot append the ledger and rollback cannot restore the host surface", ...)`
- This leaves a known hole in the most failure-heavy lifecycle repair path.

**Performance and scale gap:**
- No benchmark or load tests exist for large catalogs, large trace files, or high session counts.
- Routing, doctor rollups, and shared-home state are exercised functionally, not under stress.

**Live external-system gap:**
- Source readers are tested against local JSON fixtures and temp files.
- There is no live MCP registry or network integration test in the repo.

---

*Testing analysis: 2026-04-22*
