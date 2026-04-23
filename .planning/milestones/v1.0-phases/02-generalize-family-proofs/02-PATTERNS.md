# Phase 2: Generalize Family Proofs - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 20
**Analogs found:** 20 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/shared-home/doctor.ts` | service | batch | `src/shared-home/doctor.ts` | exact |
| `src/shared-home/format.ts` | utility | transform | `src/shared-home/format.ts` | exact |
| `src/bin/skills-broker.ts` | controller | request-response | `src/bin/skills-broker.ts` | exact |
| `src/core/types.ts` | type-contract | schema | `src/core/types.ts` | exact |
| `src/core/capability-card.ts` | utility | transform | `src/core/capability-card.ts` | exact |
| `src/sources/host-skill-catalog.ts` | service | validation | `src/sources/host-skill-catalog.ts` | exact |
| `config/host-skills.seed.json` | config | catalog | `config/host-skills.seed.json` | exact |
| `src/broker/semantic-resolver.ts` | service | transform | `src/broker/semantic-resolver.ts` | exact |
| `src/broker/run.ts` | orchestrator | request-response | `src/broker/run.ts` | exact |
| `src/hosts/skill-markdown.ts` | utility | transform | `src/hosts/skill-markdown.ts` | exact |
| `README.md` | documentation | narrative | `README.md` | exact |
| `README.zh-CN.md` | documentation | narrative | `README.zh-CN.md` | exact |
| `TODOS.md` | documentation | status/backlog | `TODOS.md` | exact |
| `STATUS.md` | documentation | status/proof | `STATUS.md` | exact |
| `tests/shared-home/doctor.test.ts` | test | batch | `tests/shared-home/doctor.test.ts` | exact |
| `tests/cli/lifecycle-cli.test.ts` | test | request-response | `tests/cli/lifecycle-cli.test.ts` | exact |
| `tests/core/capability-card.test.ts` | test | transform | `tests/core/capability-card.test.ts` | exact |
| `tests/broker/semantic-resolver.test.ts` | test | transform | `tests/broker/semantic-resolver.test.ts` | exact |
| `tests/broker/trace.test.ts` | test | schema | `tests/broker/trace.test.ts` | exact |
| `tests/integration/broker-flow.test.ts` | test | request-response | `tests/integration/broker-flow.test.ts` | exact |

## Pattern Assignments

### `src/shared-home/doctor.ts` (service, batch)

**Analog:** `src/shared-home/doctor.ts`

**Canonical family config + alias bridge** (`src/shared-home/doctor.ts:160-219`, `src/shared-home/doctor.ts:1040-1071`):
```ts
const DOCTOR_FAMILY_CONFIGS: readonly DoctorFamilyConfig[] = [
  {
    family: "website_qa",
    label: "Website QA",
    provenMessage:
      "Website QA loop is proven; keep this request path as the default-entry demo."
  },
  {
    family: "web_content_to_markdown",
    label: "Web Markdown",
    provenMessage:
      "Web Markdown loop is proven; keep this request path as the second maintained-family demo."
  }
];

const familyProofs = Object.fromEntries(...);
const websiteQaLoop = familyProofs.website_qa;
```

**Use for Phase 2:** 继续把 `familyProofs` 当 canonical proof surface，同时把 `websiteQaLoop` 明确限制在 compatibility alias / strict gate 输入，不再新增新的 top-level one-off proof object。

---

### `src/shared-home/format.ts` (utility, transform)

**Analog:** `src/shared-home/format.ts`

**QA-first callout + generic family rendering** (`src/shared-home/format.ts:12-39`, `src/shared-home/format.ts:166-241`):
```ts
function formatWebsiteQaVerdictLine(result: DoctorLifecycleResult): string {
  return `Website QA verdict: ${result.websiteQaLoop.verdict} (phase=${result.websiteQaLoop.phase})`;
}

for (const family of [
  "website_qa",
  "web_content_to_markdown"
] as const satisfies DoctorProofFamily[]) {
  const proof = result.familyProofs[family];
  lines.push(formatFamilyLoopLine(family, proof));
  lines.push(formatFamilyVerifyProofLine(family, proof));
  lines.push(formatFamilyCrossHostReuseProofLine(family, proof));
  lines.push(formatFamilyNextActionLine(family, proof));
}
```

**Use for Phase 2:** 维持“QA verdict-first，family details generic rendering”的双层格式。QA 仍然在 text output 最前面，web markdown 作为第二条 proven family 进入通用 proof loop 列表。

---

### `src/broker/semantic-resolver.ts` (service, transform)

**Analog:** `src/broker/semantic-resolver.ts`

**Fail-closed verdict ladder** (`src/broker/semantic-resolver.ts:24-84`, `src/broker/semantic-resolver.ts:124-151`):
```ts
function isExplicitWebMarkdownRequest(requestText: string): boolean {
  if (hasNonMarkdownTarget(requestText)) {
    return false;
  }

  return (
    hasWebTargetSignal(requestText) &&
    hasMarkdownSignal(requestText) &&
    hasRouteVerb(requestText)
  );
}

if (topMatch.proofFamily !== "web_content_to_markdown") {
  return { verdict: "unsupported" };
}

if (isExplicitWebMarkdownRequest(requestText)) {
  return { verdict: "direct_route", topMatch };
}

if (hasPartialWebMarkdownSignals(requestText)) {
  return { verdict: "clarify", topMatch };
}

return { verdict: "unsupported" };
```

**Use for Phase 2:** 不新增 open-domain routing。保持 web markdown-only direct-route，partial signals -> `clarify`，wrong target / low signal -> `unsupported`。

---

### `src/core/types.ts` + `src/core/capability-card.ts` + `config/host-skills.seed.json` + `src/sources/host-skill-catalog.ts`

**Analog:** same files

**Metadata defaults + seed overrides + validation** (`src/core/capability-card.ts:23-43`, `src/core/capability-card.ts:92-132`, `src/sources/host-skill-catalog.ts:200-229`):
```ts
export type CapabilityQueryMetadata = {
  summary?: string;
  keywords?: string[];
  antiKeywords?: string[];
  confidenceHints?: SemanticConfidenceHint[];
  proofFamily?: CapabilityProofFamily;
  jobFamilies: string[];
  targetTypes: CapabilityQueryTargetType[];
  artifacts: string[];
  examples: string[];
};

function validateQueryMetadata(...) {
  validateOptionalString(filePath, `${path}.summary`, value.summary);
  validateOptionalStringArray(filePath, `${path}.keywords`, value.keywords);
  validateOptionalStringArray(filePath, `${path}.antiKeywords`, value.antiKeywords);
  ...
}
```

**Seed shape for web markdown** (`config/host-skills.seed.json:20-66`):
```json
"query": {
  "summary": "Convert web pages into markdown",
  "keywords": ["web", "markdown", "content", "page"],
  "antiKeywords": ["audio", "video", "podcast"],
  "confidenceHints": ["url", "website", "repo"],
  "proofFamily": "web_content_to_markdown",
  "jobFamilies": ["content_acquisition", "web_content_conversion"],
  "targetTypes": ["url", "website", "repo"],
  "artifacts": ["markdown"],
  "examples": ["turn this webpage into markdown"]
}
```

**Use for Phase 2:** capability metadata 继续 broker-owned。增长点不是“再加一堆 lane”，而是把 proven family 所需的 metadata contract、seed truth、catalog validation 一次收口。

---

### `src/broker/run.ts` (orchestrator, request-response)

**Analog:** `src/broker/run.ts`

**Semantic signal stays subordinate to compatibility boundary** (`src/broker/run.ts:135-198`):
```ts
function resolveSemanticRankingSignal(
  request: ResolvedBrokerRequest,
  candidates: CapabilityCard[]
): {
  semanticResult?: SemanticResolverResult;
  semanticSignal?: SemanticRankingSignal;
} {
  if (request.compatibilityIntent !== "web_content_to_markdown") {
    return {};
  }
  ...
}
```

**Use for Phase 2:** semantic resolver 仍然是 broker-owned middle path，不跨越 compatibility boundary 去替所有 family 做自由解释。trace 里已经有 `semanticMatchReason` / `semanticMatchCandidateId` / `semanticMatchProofFamily`，后续改动应该沿这条 explainable seam 走。

---

### `tests/shared-home/doctor.test.ts` + `tests/cli/lifecycle-cli.test.ts`

**Analog:** same files

**Proof surface + strict gate regression style** (`tests/shared-home/doctor.test.ts:912-1009`, `tests/cli/lifecycle-cli.test.ts:224-239`):
```ts
expect(result.familyProofs.website_qa).toEqual({...});
expect(result.familyProofs.web_content_to_markdown).toEqual({...});
expect(rendered).toContain(
  "Website QA verdict: in_progress (phase=cross_host_reuse_pending)"
);
expect(
  shouldFailStrictDoctorGate({
    adoptionHealth: { status: "blocked" },
    websiteQaLoop: { verdict: "blocked" }
  })
).toBe(true);
```

**Use for Phase 2:** 继续用 fixture-rich doctor tests 锁 proof surface，用 CLI strict tests 锁 compatibility alias，不把 Phase 2 做成只靠 README 叙事的“软承诺”。

---

### `tests/broker/semantic-resolver.test.ts` + `tests/broker/trace.test.ts`

**Analog:** same files

**Boundary-first semantic regression style** (`tests/broker/semantic-resolver.test.ts:8-164`, `tests/broker/trace.test.ts:38-114`):
```ts
it("asks for clarification when only partial web markdown signals are present", () => {
  expect(result).toEqual({
    verdict: "clarify",
    topMatch: {...}
  });
});

it("keeps non-web proof families unsupported at the routing boundary", () => {
  expect(resolveSemanticCandidates(...)).toEqual({
    verdict: "unsupported"
  });
});

expect(directTrace).toMatchObject({
  semanticMatchReason: "direct_route",
  semanticMatchProofFamily: "web_content_to_markdown"
});
```

**Use for Phase 2:** semantic tests要同时锁 direct-route、clarify、unsupported 和 trace schema，不要只测 happy path。

---

### `tests/integration/broker-flow.test.ts` (test, request-response)

**Analog:** `tests/integration/broker-flow.test.ts`

**Canonical second-family proof loop** (`tests/integration/broker-flow.test.ts:2425-2705`):
```ts
it("proves web markdown INSTALL_REQUIRED -> install -> rerun -> cross-host reuse", async () => {
  ...
  expect(installRequired.outcome.code).toBe("INSTALL_REQUIRED");
  expect(verified.outcome.code).toBe("HANDOFF_READY");
  expect(reused.outcome.code).toBe("HANDOFF_READY");
  expect(persistedTraces).toEqual([
    expect.objectContaining({
      semanticMatchProofFamily: "web_content_to_markdown"
    })
  ]);
});
```

**Use for Phase 2:** 这就是 second proven family 的 done-bar analog。继续用“同一句请求 -> install_required -> rerun -> cross-host reuse”的 canonical proof，而不是抽象指标替代真实闭环。

---

### `src/hosts/skill-markdown.ts` + `README.md` + `README.zh-CN.md` + `TODOS.md` + `STATUS.md`

**Analog:** same files

**Operator hierarchy pattern** (`src/hosts/skill-markdown.ts:176-190`, `README.md:211-311`, `README.zh-CN.md:218-318`, `TODOS.md:1-18`, `STATUS.md:8-18`):
```md
### Hero lane: website QA
- Keep website QA visually first. It is the QA default-entry lane and the calibration lane.

Web markdown is still a proven next lane, but only after the QA default-entry loop and doctor truth already feel clear.
Once that default-entry loop feels clear, the second proven family is **web markdown**.
```

**Use for Phase 2:** 产品叙事必须一直是“one hero lane, two proven loops”。repo docs、installed shell copy、status/backlog truth 只能把 web markdown 讲成第二条 proven family，不能把它抬成并列 first move。

## Phase 2 Reuse Rules

- doctor / strict / format 继续沿 `familyProofs` + `websiteQaLoop` alias 双层结构演进，不新增第三种 proof surface。
- semantic resolver 只允许扩展 web markdown 的 deterministic proof，不借机把其他 family 变成 open-domain semantic search。
- catalog / capability metadata 改动必须同时更新 seed truth、type contract、validation、unit tests。
- operator-facing wording 一旦变化，要同步检查 README、README.zh-CN、`src/hosts/skill-markdown.ts`、`TODOS.md`、`STATUS.md`。
- `tests/integration/broker-flow.test.ts` 是第二条 proven family 的主证明面；新增 wording 或 proof claims 时，优先回到这里补闭环证据。

---
*Patterns mapped: 2026-04-22*
