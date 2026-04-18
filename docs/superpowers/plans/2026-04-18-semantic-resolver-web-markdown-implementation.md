# Semantic Resolver + Web Markdown Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a broker-owned semantic resolver for `web_content_to_markdown`, and replace the website-QA-only doctor proof loop with reusable family proof summaries that also prove the web markdown loop.

**Architecture:** Keep maintained-family compilation as the high-confidence front door, then add a deterministic semantic resolver that enriches ranking without introducing embeddings or host-side semantic search. Generalize operator proof state from a dedicated `websiteQaLoop` object into reusable `familyProofs`, then use the same install / verify / reuse truth for both `website_qa` and `web_content_to_markdown`.

**Tech Stack:** TypeScript, Vitest, existing broker runtime / doctor / shared-home proof rails

---

## File Structure

### Create

- `src/broker/semantic-resolver.ts`
- `tests/broker/semantic-resolver.test.ts`

### Modify

- `src/core/types.ts`
- `src/core/capability-card.ts`
- `src/sources/host-skill-catalog.ts`
- `config/host-skills.seed.json`
- `src/broker/rank.ts`
- `src/broker/run.ts`
- `src/shared-home/doctor.ts`
- `src/shared-home/format.ts`
- `tests/integration/broker-flow.test.ts`
- `tests/shared-home/doctor.test.ts`
- `README.md`
- `README.zh-CN.md`

### Responsibilities

- `src/core/types.ts`: semantic verdicts, family-proof summary types, and trace-facing identifiers
- `src/core/capability-card.ts`: capability metadata schema used by semantic matching
- `src/sources/host-skill-catalog.ts`: validation/loading for richer semantic metadata
- `config/host-skills.seed.json`: source-of-truth metadata for the web markdown package
- `src/broker/semantic-resolver.ts`: deterministic semantic scoring and confidence policy
- `src/broker/rank.ts`: integrate semantic score ahead of fallback intent-only ranking
- `src/broker/run.ts`: invoke semantic resolver and persist proof-family-aware routing truth
- `src/shared-home/doctor.ts` / `src/shared-home/format.ts`: generic family proof summaries and rendering
- tests: lock behavior before implementation and verify no regression in the current proof rails

## Task 1: Add Semantic Metadata Schema

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/capability-card.ts`
- Modify: `src/sources/host-skill-catalog.ts`
- Modify: `config/host-skills.seed.json`
- Test: `tests/broker/semantic-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { toCapabilityCard } from "../../src/core/capability-card";

describe("semantic metadata on capability cards", () => {
  it("keeps semantic matching metadata for web markdown candidates", () => {
    const card = toCapabilityCard({
      kind: "skill",
      id: "web-content-to-markdown",
      label: "Web Content to Markdown",
      intent: "web_content_to_markdown",
      query: {
        summary: "Convert webpage content into markdown.",
        keywords: ["webpage", "website", "article", "markdown"],
        antiKeywords: ["qa", "audit", "test"],
        jobFamilies: ["content_acquisition", "web_content_conversion"],
        targetTypes: ["url", "website"],
        artifacts: ["markdown"],
        examples: ["turn this webpage into markdown"],
        confidenceHints: ["explicit_markdown_target"],
        proofFamily: "web_content_to_markdown"
      },
      implementation: {
        id: "baoyu.url_to_markdown",
        type: "local_skill",
        ownerSurface: "broker_owned_downstream"
      }
    });

    expect(card.query.summary).toBe("Convert webpage content into markdown.");
    expect(card.query.keywords).toContain("markdown");
    expect(card.query.antiKeywords).toContain("qa");
    expect(card.query.proofFamily).toBe("web_content_to_markdown");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=1 npx vitest run tests/broker/semantic-resolver.test.ts -t "keeps semantic matching metadata for web markdown candidates"`
Expected: FAIL because `summary`, `keywords`, `antiKeywords`, `confidenceHints`, or `proofFamily` are not yet part of the capability metadata types.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/types.ts
export type SemanticConfidenceHint =
  | "explicit_markdown_target"
  | "url_target_present"
  | "website_target_present";

export type CapabilityProofFamily =
  | "website_qa"
  | "web_content_to_markdown";
```

```ts
// src/core/capability-card.ts
export type CapabilityQueryMetadata = {
  summary: string;
  keywords: string[];
  antiKeywords: string[];
  jobFamilies: string[];
  targetTypes: CapabilityQueryTargetType[];
  artifacts: string[];
  examples: string[];
  confidenceHints: SemanticConfidenceHint[];
  proofFamily?: CapabilityProofFamily;
};
```

```ts
// src/sources/host-skill-catalog.ts
validateOptionalStringArray(filePath, `${path}.query.keywords`, value.query?.keywords);
validateOptionalStringArray(filePath, `${path}.query.antiKeywords`, value.query?.antiKeywords);
validateOptionalStringArray(
  filePath,
  `${path}.query.confidenceHints`,
  value.query?.confidenceHints
);
```

```json
// config/host-skills.seed.json
{
  "id": "web-content-to-markdown",
  "query": {
    "summary": "Convert webpage content into markdown.",
    "keywords": ["webpage", "website", "article", "markdown"],
    "antiKeywords": ["qa", "audit", "test"],
    "confidenceHints": ["explicit_markdown_target"],
    "proofFamily": "web_content_to_markdown"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=1 npx vitest run tests/broker/semantic-resolver.test.ts -t "keeps semantic matching metadata for web markdown candidates"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/capability-card.ts src/sources/host-skill-catalog.ts config/host-skills.seed.json tests/broker/semantic-resolver.test.ts
git commit -m "feat: add semantic metadata schema"
```

## Task 2: Add Semantic Resolver With Confidence Verdicts

**Files:**
- Create: `src/broker/semantic-resolver.ts`
- Test: `tests/broker/semantic-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolveSemanticCandidates } from "../../src/broker/semantic-resolver";
import { toCapabilityCard } from "../../src/core/capability-card";

describe("semantic resolver", () => {
  it("routes explicit web markdown requests directly to the web markdown family", () => {
    const candidate = toCapabilityCard({
      kind: "skill",
      id: "web-content-to-markdown",
      label: "Web Content to Markdown",
      intent: "web_content_to_markdown",
      query: {
        summary: "Convert webpage content into markdown.",
        keywords: ["webpage", "website", "article", "markdown"],
        antiKeywords: ["qa", "audit", "test"],
        jobFamilies: ["content_acquisition", "web_content_conversion"],
        targetTypes: ["url", "website"],
        artifacts: ["markdown"],
        examples: ["turn this webpage into markdown"],
        confidenceHints: ["explicit_markdown_target"],
        proofFamily: "web_content_to_markdown"
      },
      implementation: {
        id: "baoyu.url_to_markdown",
        type: "local_skill",
        ownerSurface: "broker_owned_downstream"
      }
    });

    const result = resolveSemanticCandidates({
      requestText: "turn this webpage into markdown: https://example.com/post",
      currentHost: "codex",
      candidates: [candidate]
    });

    expect(result.verdict).toBe("direct_route");
    expect(result.topMatch?.candidateId).toBe("web-content-to-markdown");
    expect(result.topMatch?.proofFamily).toBe("web_content_to_markdown");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=1 npx vitest run tests/broker/semantic-resolver.test.ts -t "routes explicit web markdown requests directly to the web markdown family"`
Expected: FAIL because `resolveSemanticCandidates` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/broker/semantic-resolver.ts
import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerHost, CapabilityProofFamily } from "../core/types.js";

export type SemanticResolverVerdict = "direct_route" | "clarify" | "unsupported";

export type SemanticResolverResult = {
  verdict: SemanticResolverVerdict;
  topMatch?: {
    candidateId: string;
    proofFamily?: CapabilityProofFamily;
    confidence: number;
  };
};

export function resolveSemanticCandidates(input: {
  requestText: string;
  currentHost: BrokerHost;
  candidates: CapabilityCard[];
}): SemanticResolverResult {
  const normalized = input.requestText.toLowerCase();
  const markdownSignal = /\bmarkdown\b|\bmd\b/.test(normalized) ? 1 : 0;
  const webSignal = /\bwebpage\b|\bwebsite\b|\bpage\b|\barticle\b|https?:\/\//.test(normalized)
    ? 1
    : 0;

  const webMarkdownCandidate = input.candidates.find(
    (candidate) => candidate.query.proofFamily === "web_content_to_markdown"
  );

  if (webMarkdownCandidate && markdownSignal && webSignal) {
    return {
      verdict: "direct_route",
      topMatch: {
        candidateId: webMarkdownCandidate.id,
        proofFamily: webMarkdownCandidate.query.proofFamily,
        confidence: 0.9
      }
    };
  }

  return {
    verdict: markdownSignal || webSignal ? "clarify" : "unsupported"
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=1 npx vitest run tests/broker/semantic-resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/semantic-resolver.ts tests/broker/semantic-resolver.test.ts
git commit -m "feat: add deterministic semantic resolver"
```

## Task 3: Integrate Semantic Resolver Into Ranking And Routing

**Files:**
- Modify: `src/broker/rank.ts`
- Modify: `src/broker/run.ts`
- Test: `tests/integration/broker-flow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("prefers the semantic web markdown family before fallback intent-only ordering", async () => {
  const result = await runBroker(
    {
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "codex",
      invocationMode: "auto",
      urls: ["https://example.com/post"]
    },
    {
      currentHost: "codex",
      now: new Date("2026-04-18T00:00:00.000Z"),
      hostCatalogFilePath,
      mcpRegistryFilePath
    }
  );

  expect(result.trace?.resultCode).toBe("INSTALL_REQUIRED");
  expect(result.trace?.reasonCode).toBe("package_not_installed");
  expect(result.trace?.selectionMode).toBe("semantic_match");
  expect(result.trace?.selectedCapabilityId).toBe("baoyu.url-to-markdown");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=1 npx vitest run tests/integration/broker-flow.test.ts -t "prefers the semantic web markdown family before fallback intent-only ordering"`
Expected: FAIL because `selectionMode: "semantic_match"` is not emitted and ranking still depends only on the current capability-query score / compatibility intent path.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/broker/rank.ts
export type SemanticRoutingHistory = {
  semanticConfidence?: number;
};
```

```ts
// src/broker/rank.ts
function semanticScore(card: CapabilityCard, semanticMatch: { candidateId: string; confidence: number } | undefined): number {
  if (semanticMatch === undefined) {
    return 0;
  }

  return semanticMatch.candidateId === card.id ? semanticMatch.confidence * 1000 : 0;
}
```

```ts
// src/broker/run.ts
const semanticResolution = resolveSemanticCandidates({
  requestText: request.requestText,
  currentHost: options.currentHost,
  candidates
});

const ranked = rankCapabilities({
  currentHost: options.currentHost,
  requestCompatibilityIntent: resolved.compatibilityIntent,
  requestCapabilityQuery: resolved.capabilityQuery,
  candidates,
  semanticTopMatch: semanticResolution.topMatch
});
```

```ts
// src/broker/run.ts
selectionMode: semanticResolution.verdict === "direct_route" ? "semantic_match" : "query_native",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=1 npx vitest run tests/integration/broker-flow.test.ts -t "prefers the semantic web markdown family before fallback intent-only ordering"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/broker/rank.ts src/broker/run.ts tests/integration/broker-flow.test.ts
git commit -m "feat: route web markdown through semantic ranking"
```

## Task 4: Generalize Doctor Proofs To Family Summaries

**Files:**
- Modify: `src/shared-home/doctor.ts`
- Modify: `src/shared-home/format.ts`
- Test: `tests/shared-home/doctor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("emits reusable family proofs for website QA and web markdown", async () => {
  const result = await doctorSharedBrokerHome({
    brokerHomeDirectory,
    cwd: process.cwd(),
    now: new Date("2026-04-18T00:00:00.000Z")
  });

  expect(result.familyProofs.website_qa.verdict).toBe("proven");
  expect(result.familyProofs.web_content_to_markdown.phase).toBe("cross_host_reuse_pending");
  expect(result.familyProofs.web_content_to_markdown.proofs).toEqual({
    installRequiredObserved: true,
    verifyConfirmed: true,
    crossHostReuseConfirmed: false,
    replayReady: true
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=1 npx vitest run tests/shared-home/doctor.test.ts -t "emits reusable family proofs for website QA and web markdown"`
Expected: FAIL because `familyProofs` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared-home/doctor.ts
export type DoctorFamilyProofSummary = {
  installRequiredObserved: boolean;
  verifyConfirmed: boolean;
  crossHostReuseConfirmed: boolean;
  replayReady: boolean;
  phase: WebsiteQaLoopPhase;
  verdict: WebsiteQaLoopVerdict;
  nextAction: string;
};
```

```ts
// src/shared-home/doctor.ts
familyProofs: {
  website_qa: websiteQaProofSummary,
  web_content_to_markdown: webMarkdownProofSummary
},
```

```ts
// src/shared-home/format.ts
return [
  `Family proof website_qa: ${formatFamilyProof(result.familyProofs.website_qa)}`,
  `Family proof web_content_to_markdown: ${formatFamilyProof(result.familyProofs.web_content_to_markdown)}`
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=1 npx vitest run tests/shared-home/doctor.test.ts -t "emits reusable family proofs for website QA and web markdown"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared-home/doctor.ts src/shared-home/format.ts tests/shared-home/doctor.test.ts
git commit -m "feat: generalize doctor family proofs"
```

## Task 5: Prove Web Markdown Install -> Verify -> Reuse End To End

**Files:**
- Modify: `tests/integration/broker-flow.test.ts`
- Modify: `tests/shared-home/doctor.test.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: Write the failing test**

```ts
it("proves web markdown INSTALL_REQUIRED -> install -> rerun -> cross-host reuse", async () => {
  const first = await runCodexAdapter(
    {
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "codex",
      invocationMode: "auto",
      urls: ["https://example.com/post"]
    },
    {
      installDirectory: codexInstallDirectory,
      includeTrace: true,
      now
    }
  );

  expect(first.outcome.code).toBe("INSTALL_REQUIRED");

  await installVerifiedWebMarkdownWinner();

  const second = await runCodexAdapter(/* same request */);
  const third = await runClaudeCodeAdapter(/* same request */);

  expect(second.outcome.code).toBe("HANDOFF_READY");
  expect(third.outcome.code).toBe("HANDOFF_READY");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=1 npx vitest run tests/integration/broker-flow.test.ts -t "proves web markdown INSTALL_REQUIRED -> install -> rerun -> cross-host reuse"`
Expected: FAIL because the web markdown family is not yet wired into the generic family proof loop and/or missing semantic trace metadata.

- [ ] **Step 3: Write minimal implementation**

```md
<!-- README.md -->
- website QA is the clearest first-use lane
- web markdown is now the second proven install / verify / reuse family
```

```md
<!-- README.zh-CN.md -->
- website QA 仍是最清楚的默认入口
- web markdown 现在是第二条已经证明 install / verify / reuse 闭环的 family
```

```ts
// tests/shared-home/doctor.test.ts expectations
expect(parsed.familyProofs.web_content_to_markdown.verdict).toBe("proven");
```

This step intentionally keeps production code changes minimal if earlier tasks already exposed the family proof machinery. The goal here is to finish the cross-host proof and mirror the shipped truth into docs.

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=1 npx vitest run tests/integration/broker-flow.test.ts tests/shared-home/doctor.test.ts --reporter=basic`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/integration/broker-flow.test.ts tests/shared-home/doctor.test.ts README.md README.zh-CN.md
git commit -m "feat: prove web markdown family loop"
```

## Task 6: Final Regression

**Files:**
- Test: `tests/broker/semantic-resolver.test.ts`
- Test: `tests/integration/broker-flow.test.ts`
- Test: `tests/shared-home/doctor.test.ts`
- Test: `tests/cli/lifecycle-cli.test.ts`

- [ ] **Step 1: Run the focused packet suite**

Run: `CI=1 npx vitest run tests/broker/semantic-resolver.test.ts tests/integration/broker-flow.test.ts tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts --reporter=basic`
Expected: PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Run full suite before PR**

Run: `npm test -- --reporter=basic`
Expected: PASS with no failing test files

- [ ] **Step 4: Commit any final cleanup**

```bash
git add .
git commit -m "chore: finalize semantic resolver web markdown packet"
```

## Spec Coverage Check

- semantic resolver added: Task 2
- richer capability metadata: Task 1
- ranking/run integration: Task 3
- website QA proof abstraction -> family proofs: Task 4
- second proven family for web markdown: Task 5
- docs and regression: Task 5 and Task 6

No spec section is left without a corresponding task.
