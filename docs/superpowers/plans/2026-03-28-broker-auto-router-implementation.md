# Broker Auto-Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `skills-broker` from a single hard-coded `webpage_to_markdown` flow into a host-agnostic pre-tool auto-router that accepts a shared broker envelope, supports 2 primary routed lanes plus 1 secondary discovery lane, and keeps semantic understanding inside the shared broker runtime.

**Architecture:** Keep hosts thin. Claude/Codex shells should forward raw request text plus low-risk hints into one shared broker envelope, and the shared broker runtime should own normalization, candidate discovery, ranking, handoff generation, and host degradation guidance. Do not solve this by piling more host-specific trigger wording into `SKILL.md`; the durable fix is a shared request contract and broker-side understanding. The broker is the pre-tool router for host-native external actions, not a general language classifier.

**Tech Stack:** Node.js, TypeScript, `fs/promises`, JSON CLI contracts, Vitest

---

## File Structure

### Existing files to modify

- [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
  - replace the single-intent type model with the shared envelope types, expanded intent taxonomy, structured outcome codes, and host degradation hints
- [`src/core/request.ts`](/Users/monkeyin/projects/skills-broker/src/core/request.ts)
  - stop normalizing from one exact task string and move to free-text plus hints normalization
- [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts)
  - accept the new broker envelope from host runners instead of `{ task, url }`
- [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
  - consume normalized requests from the new contract, preserve cache/discovery behavior across the expanded intent set, and return structured host-action guidance on failure paths
- [`src/sources/host-skill-catalog.ts`](/Users/monkeyin/projects/skills-broker/src/sources/host-skill-catalog.ts)
  - continue exact-intent filtering, but against the new taxonomy
- [`src/sources/mcp-registry.ts`](/Users/monkeyin/projects/skills-broker/src/sources/mcp-registry.ts)
  - expand intent matching rules for the 2 primary routed lanes plus the secondary discovery lane
- [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
  - generate a real auto-router `SKILL.md` and a runner contract that forwards raw request text plus hints
- [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
  - align Codex thin shell wording and runner invocation with the same envelope
- [`config/host-skills.seed.json`](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json)
  - replace dead or misleading seed entries with the first-version supported intents
- [`config/mcp-registry.seed.json`](/Users/monkeyin/projects/skills-broker/config/mcp-registry.seed.json)
  - add representative registry fixtures for the new intent families
- [`tests/cli/cli-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/cli-contract.test.ts)
  - verify the direct broker CLI contract for the new envelope
- [`tests/broker/handoff.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/handoff.test.ts)
  - ensure handoff still preserves the normalized request after contract expansion
- [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)
  - cover multi-intent normalization, routing outcomes, and host degradation guidance
- [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
  - assert installed host shells instruct the model to route external-capability requests through the broker
- [`tests/sources/host-skill-catalog.test.ts`](/Users/monkeyin/projects/skills-broker/tests/sources/host-skill-catalog.test.ts)
  - keep host skill filtering aligned with the new taxonomy
- [`tests/sources/mcp-registry.test.ts`](/Users/monkeyin/projects/skills-broker/tests/sources/mcp-registry.test.ts)
  - cover each new intent family against representative registry records
- [`tests/e2e/claude-code-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts)
  - verify the installed Claude shell uses the new runner contract
- [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
  - describe the real first-version auto-router scope, not a fake universal broker
- [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
  - sync the Chinese docs with the same contract and scope

### New files to create

- [`src/core/envelope.ts`](/Users/monkeyin/projects/skills-broker/src/core/envelope.ts)
  - shared host-agnostic broker envelope types and helper constructors
- [`tests/core/request-normalization.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)
  - focused normalization tests for the 2 primary routed lanes, the explicit discovery lane, and unsupported/ambiguous outcomes

### Files intentionally left alone

- [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
  - lifecycle install/update/remove behavior is already shipped and should not be reworked in this feature
- [`src/shared-home/doctor.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts)
  - host detection is already fixed to official paths; this feature should not mix in lifecycle changes

### Branch hygiene note

The working tree already contains unreleased `0.1.2` version-bump changes. Keep those release changes separate from this feature work. Do not mix versioning/publish cleanup into the auto-router implementation commits.

## Task 1: Define The Shared Broker Envelope

**Files:**
- Create: [`src/core/envelope.ts`](/Users/monkeyin/projects/skills-broker/src/core/envelope.ts)
- Modify: [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
- Modify: [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts)
- Test: [`tests/cli/cli-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/cli-contract.test.ts)

- [ ] **Step 1: Write the failing CLI contract test for the new envelope**

```ts
import { describe, expect, it } from "vitest";
import { runBrokerCli } from "../../src/cli.js";

describe("runBrokerCli", () => {
  it("accepts requestText plus host hints", async () => {
    const result = await runBrokerCli(
      {
        requestText: "turn this webpage into markdown: https://example.com/post",
        host: "claude-code",
        urls: ["https://example.com/post"]
      },
      {}
    );

    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the targeted CLI test and verify it fails on the old `{ task, url }` contract**

Run: `npx vitest run tests/cli/cli-contract.test.ts`

Expected: FAIL with a type/import mismatch or missing `requestText`/`host` contract support

- [ ] **Step 3: Add the shared broker envelope type and wire `runBrokerCli()` to it**

```ts
// src/core/envelope.ts
export type BrokerEnvelope = {
  requestText: string;
  host: "claude-code" | "codex" | "opencode";
  invocationMode?: "auto" | "explicit";
  cwd?: string;
  urls?: string[];
  attachments?: string[];
  metadata?: Record<string, string>;
};
```

```ts
// src/cli.ts
export type RunBrokerCliInput = BrokerEnvelope;
```

- [ ] **Step 4: Re-run the targeted CLI test**

Run: `npx vitest run tests/cli/cli-contract.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/envelope.ts src/core/types.ts src/cli.ts tests/cli/cli-contract.test.ts
git commit -m "feat: add shared broker envelope contract"
```

## Task 2: Expand Normalization To Two Primary Routed Lanes And One Explicit Discovery Lane

**Files:**
- Modify: [`src/core/types.ts`](/Users/monkeyin/projects/skills-broker/src/core/types.ts)
- Modify: [`src/core/request.ts`](/Users/monkeyin/projects/skills-broker/src/core/request.ts)
- Create: [`tests/core/request-normalization.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)

- [ ] **Step 1: Write the failing normalization tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../../src/core/request.js";

describe("normalizeRequest", () => {
  it("normalizes webpage content requests", () => {
    const result = normalizeRequest({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"]
    });

    expect(result.intent).toBe("web_content_to_markdown");
  });

  it("normalizes social post requests", () => {
    const result = normalizeRequest({
      requestText: "save this X post as markdown https://x.com/example/status/1",
      host: "claude-code",
      urls: ["https://x.com/example/status/1"]
    });

    expect(result.intent).toBe("social_post_to_markdown");
  });

  it("normalizes capability discovery requests", () => {
    const result = normalizeRequest({
      requestText: "find a skill to save webpages as markdown",
      host: "codex"
    });

    expect(result.intent).toBe("capability_discovery_or_install");
  });
});
```

- [ ] **Step 2: Run the targeted normalization tests and verify they fail**

Run: `npx vitest run tests/core/request-normalization.test.ts`

Expected: FAIL because only `webpage_to_markdown` with one exact literal task string is supported

- [ ] **Step 3: Replace the single-intent model with a real first-version taxonomy**

```ts
export type BrokerIntent =
  | "web_content_to_markdown"
  | "social_post_to_markdown"
  | "capability_discovery_or_install";

export type BrokerOutcomeCode =
  | "HANDOFF_READY"
  | "NO_CANDIDATE"
  | "UNSUPPORTED_REQUEST"
  | "AMBIGUOUS_REQUEST"
  | "PREPARE_FAILED";
```

- [ ] **Step 4: Implement minimal normalization rules from free text plus safe hints**

```ts
if (looksLikeSocialUrl(urls)) {
  return { intent: "social_post_to_markdown", ... };
}

if (looksLikeWebMarkdownRequest(requestText, urls)) {
  return { intent: "web_content_to_markdown", ... };
}

if (looksLikeExplicitCapabilityDiscoveryRequest(requestText)) {
  return { intent: "capability_discovery_or_install", ... };
}

throw new UnsupportedBrokerRequestError(...);
```

Notes:

- `capability_discovery_or_install` is not a broad fallback for vague tool-ish requests
- it should match explicit discovery/install asks, and later be reachable as a broker-selected remediation path after `NO_CANDIDATE`
- generic "save this" / "find something" language without enough markdown or capability signal should remain `AMBIGUOUS_REQUEST` or `UNSUPPORTED_REQUEST`

- [ ] **Step 5: Re-run the normalization tests**

Run: `npx vitest run tests/core/request-normalization.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/request.ts tests/core/request-normalization.test.ts
git commit -m "feat: add multi-intent broker normalization"
```

## Task 3: Align Seeds And Candidate Discovery With The New Taxonomy And Discovery Lane

**Files:**
- Modify: [`config/host-skills.seed.json`](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json)
- Modify: [`config/mcp-registry.seed.json`](/Users/monkeyin/projects/skills-broker/config/mcp-registry.seed.json)
- Modify: [`src/sources/host-skill-catalog.ts`](/Users/monkeyin/projects/skills-broker/src/sources/host-skill-catalog.ts)
- Modify: [`src/sources/mcp-registry.ts`](/Users/monkeyin/projects/skills-broker/src/sources/mcp-registry.ts)
- Test: [`tests/sources/host-skill-catalog.test.ts`](/Users/monkeyin/projects/skills-broker/tests/sources/host-skill-catalog.test.ts)
- Test: [`tests/sources/mcp-registry.test.ts`](/Users/monkeyin/projects/skills-broker/tests/sources/mcp-registry.test.ts)

- [ ] **Step 1: Write failing source tests for the new intent families**

```ts
it("returns social-post candidates for social_post_to_markdown", async () => {
  const candidates = await searchMcpRegistry(
    "social_post_to_markdown",
    fixturePath
  );

  expect(candidates.some((candidate) => candidate.intent === "social_post_to_markdown")).toBe(true);
});
```

- [ ] **Step 2: Run the targeted source tests and verify they fail**

Run: `npx vitest run tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts`

Expected: FAIL because the seeds and MCP matcher only know `webpage_to_markdown`

- [ ] **Step 3: Replace dead or misleading seed entries with supported intents**

```json
{
  "skills": [
    {
      "id": "skill-web-content-to-markdown",
      "kind": "skill",
      "label": "Web Content to Markdown",
      "intent": "web_content_to_markdown"
    },
    {
      "id": "skill-social-post-to-markdown",
      "kind": "skill",
      "label": "Social Post to Markdown",
      "intent": "social_post_to_markdown"
    },
    {
      "id": "skill-capability-discovery",
      "kind": "skill",
      "label": "Capability Discovery",
      "intent": "capability_discovery_or_install"
    }
  ]
}
```

- [ ] **Step 4: Expand recorded MCP fixtures and intent matchers**

```ts
switch (intent) {
  case "web_content_to_markdown":
    // url/webpage/fetch/scrape + markdown
  case "social_post_to_markdown":
    // x/twitter/tweet/post/thread + markdown
  case "capability_discovery_or_install":
    // explicit discover/find/install skill/mcp/plugin/tool
}
```

- [ ] **Step 5: Re-run the targeted source tests**

Run: `npx vitest run tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add config/host-skills.seed.json config/mcp-registry.seed.json src/sources/host-skill-catalog.ts src/sources/mcp-registry.ts tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts
git commit -m "feat: align seeds and discovery with broker intent taxonomy"
```

## Task 4: Turn Host Shells Into Real Auto-Router Entrypoints

**Files:**
- Modify: [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
- Modify: [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
- Test: [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
- Test: [`tests/e2e/claude-code-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts)

- [ ] **Step 1: Write failing host-shell tests for the new execution contract**

```ts
it("writes a Claude SKILL.md that routes external capability requests through the broker", async () => {
  const result = await installClaudeCodeHostShell({
    installDirectory,
    brokerHomeDirectory
  });

  const skill = await readFile(result.skillPath, "utf8");
  expect(skill).toContain("external capability requests");
  expect(skill).toContain("do not independently substitute WebFetch");
});
```

- [ ] **Step 2: Run the focused host-shell tests and verify they fail**

Run: `npx vitest run tests/hosts/host-shell-install.test.ts tests/e2e/claude-code-smoke.test.ts`

Expected: FAIL because the generated `SKILL.md` is still generic and the runner contract still expects old JSON

- [ ] **Step 3: Update host runners to accept raw request text plus safe hints**

```bash
BROKER_CURRENT_HOST="claude-code" exec "${brokerHomeDirectory}/bin/run-broker" \
  '{"requestText":"...","host":"claude-code","urls":["..."],"cwd":"..."}'
```

- [ ] **Step 4: Rewrite Claude and Codex shell content as routing policy plus execution guide**

```md
Use this skill when the user is asking for an external capability such as:
- converting web content to markdown
- converting a social post to markdown
- explicitly finding or installing a skill or MCP

When this skill is loaded, forward the user's original request to the local broker runner.
Do not independently substitute host-native fetch/install behavior when broker routing should decide.
If broker returns a structured non-handoff result, follow the returned host action instead of improvising.
```

- [ ] **Step 5: Re-run the focused host-shell tests**

Run: `npx vitest run tests/hosts/host-shell-install.test.ts tests/e2e/claude-code-smoke.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hosts/claude-code/install.ts src/hosts/codex/install.ts tests/hosts/host-shell-install.test.ts tests/e2e/claude-code-smoke.test.ts
git commit -m "feat: turn host shells into broker auto-router entrypoints"
```

## Task 5: Rewire Broker Run, Outcomes, Handoff, And Host Degradation Around The New Contract

**Files:**
- Modify: [`src/broker/run.ts`](/Users/monkeyin/projects/skills-broker/src/broker/run.ts)
- Modify: [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)
- Modify: [`tests/broker/handoff.test.ts`](/Users/monkeyin/projects/skills-broker/tests/broker/handoff.test.ts)

- [ ] **Step 1: Write failing integration tests for the new normalized flows**

```ts
it("returns HANDOFF_READY for a social-post markdown request", async () => {
  const result = await runBroker(
    {
      requestText: "save this X post as markdown https://x.com/example/status/1",
      host: "claude-code",
      urls: ["https://x.com/example/status/1"]
    },
    testOptions
  );

  expect(result.ok).toBe(true);
  expect(result.handoff.request.intent).toBe("social_post_to_markdown");
});

it("returns a structured unsupported outcome for a normal chat request", async () => {
  const result = await runBroker(
    {
      requestText: "explain this design tradeoff",
      host: "claude-code"
    },
    testOptions
  );

  expect(result.ok).toBe(false);
  expect(result.outcome.code).toBe("UNSUPPORTED_REQUEST");
  expect(result.outcome.hostAction).toBe("continue_normally");
});
```

- [ ] **Step 2: Run the focused broker tests and verify they fail**

Run: `npx vitest run tests/broker/handoff.test.ts tests/integration/broker-flow.test.ts`

Expected: FAIL because `runBroker()` still expects the old request shape and only emits the old outcome set

- [ ] **Step 3: Rewire `runBroker()` to accept envelopes, normalize them, and return structured failures**

```ts
try {
  const request = normalizeRequest(input);
  // existing discovery, ranking, prepare, handoff flow
} catch (error) {
  if (error instanceof UnsupportedBrokerRequestError) {
    return unsupportedResult({ hostAction: "continue_normally", ... });
  }

  if (error instanceof AmbiguousBrokerRequestError) {
    return ambiguousResult({ hostAction: "ask_clarifying_question", ... });
  }

  throw error;
}
```

- [ ] **Step 4: Preserve handoff request payload, route rationale, and cache behavior across all supported intents**

```ts
await cacheStore.write({
  requestIntent: request.intent,
  ...
});
```

- [ ] **Step 5: Re-run the focused broker tests**

Run: `npx vitest run tests/broker/handoff.test.ts tests/integration/broker-flow.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/broker/run.ts tests/broker/handoff.test.ts tests/integration/broker-flow.test.ts
git commit -m "feat: route broker runs through the shared envelope contract"
```

## Task 6: Ship Honest Docs And Full Regression Coverage

**Files:**
- Modify: [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
- Modify: [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
- Modify: [`tests/cli/cli-contract.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/cli-contract.test.ts)
- Modify: [`tests/core/request-normalization.test.ts`](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)
- Modify: [`tests/integration/broker-flow.test.ts`](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)

- [ ] **Step 1: Add final regression cases for ambiguous and unsupported requests**

```ts
it("returns AMBIGUOUS_REQUEST when the text looks broker-related but lacks enough signal", () => {
  // e.g. "save this post" with no recognizable URL or platform
});
```

- [ ] **Step 2: Run targeted tests and verify the new edge cases fail before implementation**

Run: `npx vitest run tests/cli/cli-contract.test.ts tests/core/request-normalization.test.ts tests/integration/broker-flow.test.ts`

Expected: FAIL until the edge handling is fully wired

- [ ] **Step 3: Update the docs to describe the actual v1 scope**

Document explicitly:

- the broker envelope model
- the 2 primary routed lanes plus the secondary discovery lane
- that auto-routing only applies to clearly external capability requests
- that broker acts as a pre-tool router before host-native external actions
- that ordinary model-native requests should not be hijacked
- how hosts should degrade on `UNSUPPORTED_REQUEST`, `AMBIGUOUS_REQUEST`, and `NO_CANDIDATE`

- [ ] **Step 4: Run full verification**

Run: `npm run build && npx vitest run`

Expected: PASS

- [ ] **Step 5: Do one published-runtime smoke check**

Run: `node dist/bin/skills-broker.js doctor --json`

Expected: PASS with valid JSON output

- [ ] **Step 6: Commit**

```bash
git add README.md README.zh-CN.md tests/cli/cli-contract.test.ts tests/core/request-normalization.test.ts tests/integration/broker-flow.test.ts
git commit -m "docs: describe the broker auto-router v1 contract"
```

## Final Verification Checklist

- [ ] `npx vitest run tests/cli/cli-contract.test.ts`
- [ ] `npx vitest run tests/core/request-normalization.test.ts`
- [ ] `npx vitest run tests/sources/host-skill-catalog.test.ts tests/sources/mcp-registry.test.ts`
- [ ] `npx vitest run tests/hosts/host-shell-install.test.ts tests/e2e/claude-code-smoke.test.ts`
- [ ] `npx vitest run tests/broker/handoff.test.ts tests/integration/broker-flow.test.ts`
- [ ] `npm run build`
- [ ] `npx vitest run`

## Notes For Implementers

- Keep the release-bump work (`0.1.2`) separate from this feature. If the branch starts dirty, either branch from a clean commit or isolate those changes immediately.
- Do not expand scope into generic summarization, general-purpose planning, or replacing host-native tools wholesale.
- Prefer broker-side normalization over host-side prompt cleverness.
- If a test requires changing both host shell wording and broker normalization in one go, split the work: first make the contract explicit, then change interpretation.
