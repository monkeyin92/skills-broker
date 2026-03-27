# Skills Broker v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code-first broker plugin package that can search both host skills and MCP-backed capabilities, normalize them into a shared `Capability Card`, choose the best option for `webpage -> markdown` requests, prepare the selected capability until it is callable, then hand off and get out of the way.

**Architecture:** The implementation is a host-agnostic broker core exposed as a local CLI with JSON input/output, wrapped by a thin Claude Code adapter for v0. Discovery comes from two sources, a Claude Code-compatible skill catalog adapter and an MCP Registry adapter, both normalized into a minimal `Capability Card`; routing is cache-first, explicit, and explainable, with daily first-use refresh and a long hard TTL.

**Tech Stack:** TypeScript, Node.js 20+, npm, Vitest, JSON fixtures, GitHub Actions

---

## File Structure

- `package.json`
  - Project scripts, runtime metadata, dependency declarations
- `tsconfig.json`
  - TypeScript compiler settings
- `.gitignore`
  - Ignore build output, coverage, local cache fixtures
- `vitest.config.ts`
  - Test runner configuration
- `src/cli.ts`
  - Local broker CLI entrypoint with JSON in/out contract
- `src/core/types.ts`
  - Shared request/outcome types and enums
- `src/core/request.ts`
  - Request normalization for the v0 `webpage -> markdown` task family
- `src/core/capability-card.ts`
  - Minimal shared `Capability Card` schema and host-compatibility helpers
- `src/core/cache/store.ts`
  - File-backed cache reads/writes for capability cards and successful routing records
- `src/core/cache/policy.ts`
  - Daily refresh and hard-TTL freshness rules
- `src/sources/host-skill-catalog.ts`
  - Claude Code-compatible skill source adapter
- `src/sources/mcp-registry.ts`
  - MCP Registry source adapter
- `src/broker/discover.ts`
  - Source fan-out, normalization, and candidate collection
- `src/broker/rank.ts`
  - Hard filtering, scoring, and deterministic candidate ordering
- `src/broker/explain.ts`
  - Human-readable explanation of why a candidate won
- `src/broker/prepare.ts`
  - Make the chosen candidate callable in the current host
- `src/broker/handoff.ts`
  - Produce handoff envelope and stop broker control at the right boundary
- `src/broker/run.ts`
  - End-to-end broker pipeline orchestration
- `src/hosts/claude-code/adapter.ts`
  - Thin Claude Code adapter that turns host requests into broker CLI input/output
- `src/hosts/claude-code/install.ts`
  - Plugin-package install glue for the Claude Code-first v0
- `config/host-skills.seed.json`
  - Seed catalog of Claude Code-compatible skills for v0
- `tests/fixtures/mcp-registry/*.json`
  - Recorded MCP Registry responses for stable CI tests
- `tests/fixtures/host-skill-catalog.json`
  - Stable host-skill source fixture
- `tests/cli/cli-contract.test.ts`
  - CLI I/O contract tests
- `tests/core/request.test.ts`
  - Request normalization tests
- `tests/core/capability-card.test.ts`
  - Card normalization and host compatibility tests
- `tests/core/cache.test.ts`
  - Cache read/write and freshness-policy tests
- `tests/sources/host-skill-catalog.test.ts`
  - Host skill source adapter tests
- `tests/sources/mcp-registry.test.ts`
  - MCP source adapter tests
- `tests/broker/rank.test.ts`
  - Ranking and explanation tests
- `tests/broker/prepare.test.ts`
  - Preparation and failure-path tests
- `tests/broker/handoff.test.ts`
  - Handoff boundary tests
- `tests/integration/broker-flow.test.ts`
  - Full broker path from request to handoff
- `tests/e2e/claude-code-smoke.test.ts`
  - Host-level smoke test for install + one request + handoff
- `scripts/install-claude-code.sh`
  - One-command install script for the Claude Code plugin package
- `.github/workflows/ci.yml`
  - Unit/integration tests with fixtures
- `.github/workflows/live-discovery-smoke.yml`
  - Small real-source smoke job on schedule or manual trigger
- `README.md`
  - Installation, usage, and testing guide

### Task 1: Bootstrap the TypeScript/Vitest workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Test: `tests/cli/cli-contract.test.ts`

- [ ] **Step 1: Write the failing CLI contract test**

```ts
import { describe, expect, it } from "vitest";
import { runBrokerCli } from "../helpers/run-broker-cli";

describe("broker CLI contract", () => {
  it("returns a structured error until the pipeline is implemented", async () => {
    const result = await runBrokerCli({
      task: "turn this webpage into markdown",
      url: "https://example.com"
    });

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("NOT_IMPLEMENTED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/cli-contract.test.ts`  
Expected: FAIL because project/test runner does not exist yet.

- [ ] **Step 3: Create the workspace files and minimal CLI stub**

```ts
// src/cli.ts
process.stdout.write(JSON.stringify({
  ok: false,
  error: { code: "NOT_IMPLEMENTED", message: "broker pipeline not wired yet" }
}));
```

- [ ] **Step 4: Run the contract test until it passes**

Run: `npm test -- tests/cli/cli-contract.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src/cli.ts tests/cli/cli-contract.test.ts
git commit -m "chore: bootstrap broker workspace"
```

### Task 2: Define request and outcome contracts

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/request.ts`
- Test: `tests/core/request.test.ts`

- [ ] **Step 1: Write failing request normalization tests**

```ts
it("normalizes a markdown request into the v0 task family", () => {
  const normalized = normalizeRequest({
    task: "turn this webpage into markdown",
    url: "https://example.com"
  });

  expect(normalized.intent).toBe("webpage_to_markdown");
});

it("preserves requests that should not add extra work", () => {
  const normalized = normalizeRequest({
    task: "turn this webpage into markdown",
    url: "https://example.com"
  });

  expect(normalized.outputMode).toBe("markdown_only");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/core/request.test.ts`  
Expected: FAIL because `normalizeRequest` does not exist.

- [ ] **Step 3: Implement request normalization and outcome enums**

```ts
export type BrokerIntent = "webpage_to_markdown";
export type BrokerOutcomeCode =
  | "NO_SKILL_NEEDED"
  | "NO_CANDIDATE"
  | "HANDOFF_READY"
  | "PREPARE_FAILED";
```

- [ ] **Step 4: Re-run request tests**

Run: `npm test -- tests/core/request.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/request.ts tests/core/request.test.ts
git commit -m "feat: define broker request contract"
```

### Task 3: Define the minimal Capability Card

**Files:**
- Create: `src/core/capability-card.ts`
- Test: `tests/core/capability-card.test.ts`

- [ ] **Step 1: Write failing Capability Card tests**

```ts
it("normalizes a skill candidate into a shared capability card", () => {
  const card = toCapabilityCard(skillFixture);
  expect(card.kind).toBe("skill");
  expect(card.hosts.currentHostSupported).toBe(true);
});

it("normalizes an MCP candidate into a shared capability card", () => {
  const card = toCapabilityCard(mcpFixture);
  expect(card.kind).toBe("mcp");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/core/capability-card.test.ts`  
Expected: FAIL because `toCapabilityCard` does not exist.

- [ ] **Step 3: Implement the minimal card**

```ts
export interface CapabilityCard {
  id: string;
  kind: "skill" | "mcp";
  label: string;
  intent: "webpage_to_markdown";
  hosts: {
    currentHostSupported: boolean;
    portabilityScore: number;
  };
  prepare: {
    authRequired: boolean;
    installRequired: boolean;
  };
  ranking: {
    contextCost: number;
    confidence: number;
  };
  sourceMetadata: Record<string, unknown>;
}
```

- [ ] **Step 4: Re-run card tests**

Run: `npm test -- tests/core/capability-card.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/capability-card.ts tests/core/capability-card.test.ts
git commit -m "feat: add minimal capability card schema"
```

### Task 4: Build the local cache and freshness policy

**Files:**
- Create: `src/core/cache/store.ts`
- Create: `src/core/cache/policy.ts`
- Test: `tests/core/cache.test.ts`

- [ ] **Step 1: Write failing cache policy tests**

```ts
it("refreshes a capability on first use each day", () => {
  expect(shouldRefreshToday(yesterdayCard, now)).toBe(true);
});

it("deletes stale cards on refresh failure before rediscovery", () => {
  const decision = handleRefreshFailure(staleCard);
  expect(decision.deleteCard).toBe(true);
  expect(decision.forceRediscovery).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/core/cache.test.ts`  
Expected: FAIL because policy helpers do not exist.

- [ ] **Step 3: Implement file-backed store and freshness policy**

```ts
// policy rules
// 1. first use of the day triggers refresh
// 2. refresh failure deletes stale card and forces rediscovery
// 3. hard TTL prevents trusting ancient cards forever
```

- [ ] **Step 4: Re-run cache tests**

Run: `npm test -- tests/core/cache.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/cache/store.ts src/core/cache/policy.ts tests/core/cache.test.ts
git commit -m "feat: add cache freshness policy"
```

### Task 5: Implement the two discovery adapters

**Files:**
- Create: `config/host-skills.seed.json`
- Create: `src/sources/host-skill-catalog.ts`
- Create: `src/sources/mcp-registry.ts`
- Create: `tests/fixtures/host-skill-catalog.json`
- Create: `tests/fixtures/mcp-registry/search-response.json`
- Test: `tests/sources/host-skill-catalog.test.ts`
- Test: `tests/sources/mcp-registry.test.ts`

- [ ] **Step 1: Write failing adapter tests**

```ts
it("loads Claude Code-compatible host skills from the seed catalog", async () => {
  const skills = await loadHostSkillCandidates("webpage_to_markdown");
  expect(skills.length).toBeGreaterThan(0);
});

it("loads MCP candidates from the recorded registry fixture", async () => {
  const servers = await searchMcpRegistry("webpage_to_markdown");
  expect(servers.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts`  
Expected: FAIL because adapters do not exist.

- [ ] **Step 3: Implement the host skill seed adapter and MCP registry adapter**

```ts
// v0 host skills source: read a curated JSON catalog
// v0 mcp source: read recorded fixture in tests, real fetch in runtime code
```

- [ ] **Step 4: Re-run source adapter tests**

Run: `npm test -- tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add config/host-skills.seed.json src/sources/host-skill-catalog.ts src/sources/mcp-registry.ts tests/fixtures/host-skill-catalog.json tests/fixtures/mcp-registry/search-response.json tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts
git commit -m "feat: add broker discovery adapters"
```

### Task 6: Implement the deterministic ranking pipeline

**Files:**
- Create: `src/broker/discover.ts`
- Create: `src/broker/rank.ts`
- Create: `src/broker/explain.ts`
- Test: `tests/broker/rank.test.ts`

- [ ] **Step 1: Write failing ranking tests**

```ts
it("filters out candidates unsupported by the current host", () => {
  const ranked = rankCandidates(cards, currentHost);
  expect(ranked.every(card => card.hosts.currentHostSupported)).toBe(true);
});

it("prefers a cached successful card over an equal fresh candidate", () => {
  const ranked = rankCandidates(cardsWithHistory, currentHost);
  expect(ranked[0].id).toBe("cached-winner");
});

it("produces an explanation that matches the ranking decision", () => {
  const explanation = explainDecision(winner, cards);
  expect(explanation).toContain("current host");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/broker/rank.test.ts`  
Expected: FAIL because broker ranking does not exist.

- [ ] **Step 3: Implement explicit scoring**

```ts
// fixed order:
// 1. current host support
// 2. intent match
// 3. preparation burden
// 4. context cost
// 5. cache reuse / successful routing history
// 6. portability bonus
```

- [ ] **Step 4: Re-run ranking tests**

Run: `npm test -- tests/broker/rank.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/discover.ts src/broker/rank.ts src/broker/explain.ts tests/broker/rank.test.ts
git commit -m "feat: add deterministic broker ranking"
```

### Task 7: Implement preparation and handoff boundaries

**Files:**
- Create: `src/broker/prepare.ts`
- Create: `src/broker/handoff.ts`
- Test: `tests/broker/prepare.test.ts`
- Test: `tests/broker/handoff.test.ts`

- [ ] **Step 1: Write failing preparation and handoff tests**

```ts
it("prepares the selected capability until the host can call it", async () => {
  const result = await prepareCandidate(winner, context);
  expect(result.ready).toBe(true);
});

it("stops broker control once handoff is ready", () => {
  const handoff = buildHandoffEnvelope(winner, context);
  expect(handoff.brokerDone).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/broker/prepare.test.ts tests/broker/handoff.test.ts`  
Expected: FAIL because preparation/handoff helpers do not exist.

- [ ] **Step 3: Implement prepare/handoff**

```ts
// broker responsibilities end at:
// - selected candidate is callable
// - handoff envelope is emitted
// broker responsibilities do NOT include:
// - adding summaries
// - answering follow-up questions on behalf of the selected capability
```

- [ ] **Step 4: Re-run preparation and handoff tests**

Run: `npm test -- tests/broker/prepare.test.ts tests/broker/handoff.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/prepare.ts src/broker/handoff.ts tests/broker/prepare.test.ts tests/broker/handoff.test.ts
git commit -m "feat: add prepare and handoff boundary"
```

### Task 8: Compose the broker run pipeline

**Files:**
- Create: `src/broker/run.ts`
- Modify: `src/cli.ts`
- Test: `tests/integration/broker-flow.test.ts`

- [ ] **Step 1: Write failing integration tests**

```ts
it("runs first-time discovery and returns a handoff-ready winner", async () => {
  const result = await runBroker(validUrlRequest);
  expect(result.ok).toBe(true);
  expect(result.outcome.code).toBe("HANDOFF_READY");
});

it("uses cache-first routing on a repeat request", async () => {
  const result = await runBroker(repeatUrlRequest);
  expect(result.debug.cacheHit).toBe(true);
});

it("returns a clear no-candidate outcome", async () => {
  const result = await runBroker(unmatchableRequest);
  expect(result.outcome.code).toBe("NO_CANDIDATE");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/integration/broker-flow.test.ts`  
Expected: FAIL because pipeline composition does not exist.

- [ ] **Step 3: Implement `runBroker` and wire CLI to it**

```ts
// flow:
// normalize request
// check cache and refresh rules
// discover candidates
// normalize cards
// rank and explain
// prepare winner
// emit handoff-ready outcome
```

- [ ] **Step 4: Re-run integration tests**

Run: `npm test -- tests/integration/broker-flow.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/run.ts src/cli.ts tests/integration/broker-flow.test.ts
git commit -m "feat: wire broker pipeline"
```

### Task 9: Add the Claude Code plugin package and one-command installer

**Files:**
- Create: `src/hosts/claude-code/adapter.ts`
- Create: `src/hosts/claude-code/install.ts`
- Create: `scripts/install-claude-code.sh`
- Test: `tests/e2e/claude-code-smoke.test.ts`

- [ ] **Step 1: Write the failing host smoke test**

```ts
it("installs the Claude Code package and completes one markdown handoff request", async () => {
  const result = await runClaudeCodeSmoke({
    task: "turn this webpage into markdown",
    url: "https://example.com"
  });

  expect(result.installed).toBe(true);
  expect(result.outcome.code).toBe("HANDOFF_READY");
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npm test -- tests/e2e/claude-code-smoke.test.ts`  
Expected: FAIL because Claude Code adapter/install path does not exist.

- [ ] **Step 3: Implement the adapter and install script**

```bash
# scripts/install-claude-code.sh
# one command installs the plugin package and its internal broker core
```

- [ ] **Step 4: Re-run the smoke test**

Run: `npm test -- tests/e2e/claude-code-smoke.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hosts/claude-code/adapter.ts src/hosts/claude-code/install.ts scripts/install-claude-code.sh tests/e2e/claude-code-smoke.test.ts
git commit -m "feat: add claude code host package"
```

### Task 10: Add CI, live discovery smoke, and docs

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/live-discovery-smoke.yml`
- Modify: `README.md`

- [ ] **Step 1: Write the README/testing expectations first**

```md
## Install
./scripts/install-claude-code.sh

## Test
npm test
```

- [ ] **Step 2: Add CI workflow for fixture-based unit/integration coverage**

Run: `npm test`  
Expected: Green on every push/PR with no live network dependency

- [ ] **Step 3: Add a separate live smoke workflow**

Run: `gh workflow run live-discovery-smoke.yml`  
Expected: Limited real-source validation, not required on every PR

- [ ] **Step 4: Re-run full test suite locally**

Run: `npm test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/live-discovery-smoke.yml README.md
git commit -m "chore: add ci and documentation"
```

## Test Coverage Requirements

- Unit tests must cover:
  - request normalization
  - capability card normalization
  - current-host hard filtering
  - portability bonus scoring
  - daily first-use refresh policy
  - refresh-failure delete-and-rediscover behavior
  - explanation output consistency
- Integration tests must cover:
  - first-time discovery path
  - cache-first repeat path
  - no-candidate path
  - prepare-failure path
- E2E smoke must cover:
  - one-command install
  - one request from host to handoff-ready outcome

## Diagrams to Keep in Code Comments

- `src/broker/run.ts`
  - Add an ASCII pipeline diagram of the full broker flow
- `src/core/cache/policy.ts`
  - Add an ASCII decision tree for refresh vs delete vs rediscover
- `src/broker/handoff.ts`
  - Add an ASCII diagram showing the point where broker control ends and selected capability ownership begins

## Notes for the Implementer

- Do not add summary/annotation behavior anywhere in the broker path. The user asked for markdown, not extra work.
- Do not let the broker answer follow-up questions after handoff. That belongs to the selected capability.
- Keep the host skill source simple in v0: a curated Claude Code-compatible catalog file is enough. Do not invent a global skill marketplace.
- The first real-source smoke should be small and allowed to fail independently from the main PR CI job.
