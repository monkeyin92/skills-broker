# Phase 1: Prove The QA Hero Loop - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 17
**Analogs found:** 17 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `README.md` | documentation | narrative | `README.md` | exact |
| `README.zh-CN.md` | documentation | narrative | `README.zh-CN.md` | exact |
| `src/hosts/skill-markdown.ts` | utility | transform | `src/hosts/skill-markdown.ts` | exact |
| `src/broker/query-compiler.ts` | service | transform | `src/broker/query-compiler.ts` | exact |
| `src/shared-home/doctor.ts` | service | batch | `src/shared-home/doctor.ts` | exact |
| `src/shared-home/format.ts` | utility | transform | `src/shared-home/format.ts` | exact |
| `src/shared-home/adoption-health.ts` | utility | transform | `src/shared-home/adoption-health.ts` | exact |
| `src/bin/skills-broker.ts` | controller | request-response | `src/bin/skills-broker.ts` | exact |
| `tests/hosts/host-shell-install.test.ts` | test | transform | `tests/hosts/host-shell-install.test.ts` | exact |
| `tests/e2e/claude-code-smoke.test.ts` | test | request-response | `tests/e2e/claude-code-smoke.test.ts` | exact |
| `tests/e2e/shared-home-smoke.test.ts` | test | request-response | `tests/e2e/shared-home-smoke.test.ts` | exact |
| `tests/core/request-normalization.test.ts` | test | transform | `tests/core/request-normalization.test.ts` | exact |
| `tests/e2e/phase1-website-qa-eval.test.ts` | test | batch | `tests/e2e/phase1-website-qa-eval.test.ts` | exact |
| `tests/fixtures/phase1-website-qa-eval.json` | config | batch | `tests/fixtures/phase1-website-qa-eval.json` | exact |
| `tests/integration/broker-flow.test.ts` | test | request-response | `tests/integration/broker-flow.test.ts` | exact |
| `tests/shared-home/doctor.test.ts` | test | batch | `tests/shared-home/doctor.test.ts` | exact |
| `tests/cli/lifecycle-cli.test.ts` | test | request-response | `tests/cli/lifecycle-cli.test.ts` | exact |

## Pattern Assignments

### `README.md` (documentation, narrative)

**Analog:** `README.md`

**Hero-first quick start** (`README.md:211-245`):
```md
If you only try one published path, make it this one: install the shared broker home, ask the host to QA a website, approve `INSTALL_REQUIRED` if needed, then rerun the same request and inspect `doctor`.

### 2. Try the website QA install-required -> verify -> reuse loop

1. In Claude Code or Codex, start with a website QA request such as `QA this website https://example.com`.
2. If the best package is not installed yet, the host should receive an `INSTALL_REQUIRED` outcome with `hostAction=offer_package_install`.
3. Approve the install, then send the same request again.
4. Run `npx skills-broker doctor` to confirm the shared-home state is recording reuse...
```

**Operator sample output** (`README.md:247-265`):
```md
{
  "outcome": {
    "code": "INSTALL_REQUIRED",
    "hostAction": "offer_package_install"
  }
}

Acquisition memory: present, entries=2, successful_routes=3, first_reuse_after_install=1, cross_host_reuse=1
Verified downstream manifests: total=2, claude-code=1, codex=1
```

**Use for Phase 1:** 保持 README 首屏和 Quick Start 都只先教 QA hero loop，然后再提 secondary lanes。

---

### `README.zh-CN.md` (documentation, narrative)

**Analog:** `README.zh-CN.md`

**中文 hero-first quick start** (`README.zh-CN.md:218-252`):
```md
如果你今天只跑一条发布态主路径，就跑这一条：先装 shared broker home，然后让宿主去 QA 一个网站，需要时同意 `INSTALL_REQUIRED`，再把同一个请求重跑一遍，最后用 `doctor` 看证据。

### 2. 先跑一遍 website QA 的 install-required -> verify -> reuse 闭环

1. 在 Claude Code 或 Codex 里，先从一个 website QA 请求开始...
2. ...收到一个 `INSTALL_REQUIRED` outcome，同时带 `hostAction=offer_package_install`
3. 同意安装后，把同一个请求再发一次...
4. 跑 `npx skills-broker doctor`...
```

**中文 operator sample** (`README.zh-CN.md:254-272`):
```md
{
  "outcome": {
    "code": "INSTALL_REQUIRED",
    "hostAction": "offer_package_install"
  }
}

Acquisition memory: present, entries=2, successful_routes=3, first_reuse_after_install=1, cross_host_reuse=1
Verified downstream manifests: total=2, claude-code=1, codex=1
```

**Use for Phase 1:** 与英文 README 保持同一结构、同一闭环顺序、同一结果码术语。

---

### `src/hosts/skill-markdown.ts` (utility, transform)

**Analog:** `src/hosts/skill-markdown.ts`

**Hero / secondary / clarify example partition** (`src/hosts/skill-markdown.ts:10-46`, `src/hosts/skill-markdown.ts:59-87`):
```ts
const WEBSITE_QA_HERO_EXAMPLES = [
  "测下这个网站的质量：https://www.baidu.com",
  "QA 这个网站 https://example.com",
  "QA this website https://example.com",
  "检查这个网站质量",
  "find a skill or MCP for website QA",
  "有没有现成 skill 能做这个网站 QA"
] as const;

const CLARIFY_BEFORE_BROKER_EXAMPLES = [
  "check this page",
  "看下这个页面",
  "look at this url",
  "检查一下这个链接",
  "test this",
  "帮我分析一下"
] as const;
```

**Installed shell wording contract** (`src/hosts/skill-markdown.ts:151-189`, `src/hosts/skill-markdown.ts:225-272`):
```md
Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer.

If you need one concrete broker-first example to calibrate the boundary, start with website QA.

### Hero lane: website QA
- If the user clearly wants a website tested, or wants help finding/installing the website QA winner, choose `broker_first`.
- Keep website QA visually first. It is the calibration lane. Other maintained lanes are still valid, but secondary.

## Clarify Before Broker (`clarify_before_broker`)
Do not silently broker vague phrases. Ask a short clarifying question first...

- If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.
- If the broker returns `HANDOFF_READY`, keep the broker-selected downstream path as the source of truth.
```

**Use for Phase 1:** 不手改安装产物；始终改这个 generator，并让 QA hero examples、secondary lanes、clarify examples 和 decline contract 一起更新。

---

### `src/broker/query-compiler.ts` (service, transform)

**Analog:** `src/broker/query-compiler.ts`

**Precision-first signal helpers** (`src/broker/query-compiler.ts:149-165`, `src/broker/query-compiler.ts:252-319`):
```ts
function hasWebsiteTargetSignal(requestText: string, url: string | undefined): boolean {
  return (
    (url !== undefined && !isSocialUrl(url)) ||
    /(?:\bwebsite\b|\bsite\b|\bweb app\b|\bwebapp\b|\bweb page\b|\bwebpage\b|\bpage\b|网站|站点|网页|页面)/i.test(
      requestText
    )
  );
}

function looksLikeWebsiteQaRequest(requestText: string, url: string | undefined): boolean {
  return (
    hasQaSignal(requestText) &&
    hasWebsiteTargetSignal(requestText, url) &&
    !hasMarkdownTarget(requestText) &&
    !hasNonMarkdownTarget(requestText)
  );
}

function looksAmbiguous(requestText: string): boolean {
  return (
    hasRoutingVerb(requestText) &&
    !hasMarkdownTarget(requestText) &&
    !hasNonMarkdownTarget(requestText) &&
    hasAmbiguousContentSignal(requestText)
  );
}
```

**QA capability-query builder + envelope ordering** (`src/broker/query-compiler.ts:444-464`, `src/broker/query-compiler.ts:687-735`):
```ts
function buildWebsiteQaCapabilityQuery(input: BrokerEnvelope, url: string | undefined): CapabilityQuery {
  return {
    kind: "capability_request",
    goal: "qa a website",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: ["quality_assurance"],
    targets: url === undefined ? undefined : [{ type: "website", value: url }],
    artifacts: ["qa_report"]
  };
}

if (looksLikeWebsiteQaRequest(requestText, url)) {
  return {
    kind: "compiled",
    capabilityQuery: buildWebsiteQaCapabilityQuery(input, url)
  };
}

if (looksAmbiguous(requestText)) {
  return { kind: "ambiguous" };
}

return { kind: "unsupported" };
```

**Use for Phase 1:** 只有显式 QA 意图 + 网站目标才进 `quality_assurance`；模糊页面请求继续走 `ambiguous/unsupported`，不要通过扩 regex 抬 hero lane 命中率。

---

### `src/shared-home/doctor.ts` (service, batch)

**Analog:** `src/shared-home/doctor.ts`

**Keep QA as dedicated proof surface** (`src/shared-home/doctor.ts:190-220`):
```ts
const DOCTOR_FAMILY_CONFIGS: readonly DoctorFamilyConfig[] = [
  {
    family: "website_qa",
    label: "Website QA",
    requestLabel: "website QA",
    winnerIds: [WEBSITE_QA_WINNER_ID],
    candidateIds: [WEBSITE_QA_WINNER_ID, WEBSITE_QA_CAPABILITY_ID],
    capabilityIds: [WEBSITE_QA_CAPABILITY_ID],
    subskillIds: [WEBSITE_QA_SUBSKILL_ID],
    canonicalKeyFragments: ["families:quality_assurance"],
    skillNames: [WEBSITE_QA_SUBSKILL_ID],
    provenMessage:
      "Website QA loop is proven; keep this request path as the default-entry demo."
  },
```

**Verdict / phase / next-action derivation** (`src/shared-home/doctor.ts:241-359`):
```ts
if (input.installRequiredTraces === 0) {
  return `Trigger one ${config.requestLabel} request until the broker returns INSTALL_REQUIRED.`;
}
if (input.reuseRecorded === 0) {
  return `Repeat the same ${config.requestLabel} request from another host to record the first proven reuse.`;
}

function familyPhase(input: DoctorFamilyEvidence): DoctorFamilyProofPhase {
  if (
    input.acquisitionMemoryState === "unreadable" ||
    input.verifiedDownstreamState === "unreadable"
  ) {
    return "proof_unreadable";
  }
  if (input.installRequiredTraces === 0) return "install_required_pending";
  if (input.rerunSuccessfulRoutes === 0) return "verify_pending";
  if (input.reuseRecorded === 0) return "cross_host_reuse_pending";
  return "cross_host_reuse_confirmed";
}
```

**Aggregate proofs from traces + acquisition memory + verified manifests** (`src/shared-home/doctor.ts:1040-1063`):
```ts
const familyProofs = Object.fromEntries(
  DOCTOR_FAMILY_CONFIGS.map((config) => {
    const evidence: DoctorFamilyEvidence = {
      installRequiredTraces: routingTraces.filter(
        (trace) =>
          trace.resultCode === "INSTALL_REQUIRED" &&
          isFamilyTrace(trace, config)
      ).length,
      rerunSuccessfulRoutes: familyAcquisitionMetrics[config.family].rerunSuccessfulRoutes,
      reuseRecorded: familyAcquisitionMetrics[config.family].reuseRecorded,
      downstreamReplayManifests: familyReplayCounts[config.family],
      acquisitionMemoryState: acquisitionMemory.state,
      verifiedDownstreamState: verifiedDownstreamManifests.state
    };
    return [config.family, buildFamilyProofSummary(config, evidence)];
  })
);
const websiteQaLoop = familyProofs.website_qa;
```

**Use for Phase 1:** 保持 `websiteQaLoop` 为 QA 专属 truth surface；不要在本 phase 把它提前抽象成通用 family layer。

---

### `src/shared-home/format.ts` (utility, transform)

**Analog:** `src/shared-home/format.ts`

**Verdict-first line shaping** (`src/shared-home/format.ts:20-38`, `src/shared-home/format.ts:78-146`):
```ts
const FAMILY_FORMAT_CONFIG = {
  website_qa: {
    label: "Website QA",
    requestLabel: "website QA",
    verifySegmentLabel: "rerun",
    verifySuccessLabel: "successful rerun",
  },
```
```ts
return `${config.label} loop: install_required=${installRequired}; ${config.verifySegmentLabel}=${verify}; reuse=${reuse}; replay=${replay}`;
return `${label} verify proof: confirmed (${config.verifyProofSuccessLabel} evidence recorded)`;
return `${label} cross-host reuse proof: pending (first reuse across hosts not recorded yet)`;
```

**Doctor text assembly order** (`src/shared-home/format.ts:149-232`):
```ts
const adoptionHealthProofLine = formatAdoptionHealthProofLine(result);
if (adoptionHealthProofLine !== undefined) {
  lines.push(adoptionHealthProofLine);
}

for (const family of ["website_qa", "web_content_to_markdown"] as const) {
  const proof = result.familyProofs[family];
  lines.push(formatFamilyLoopLine(family, proof));
  lines.push(formatFamilyVerifyProofLine(family, proof));
  lines.push(formatFamilyCrossHostReuseProofLine(family, proof));
  lines.push(formatFamilyNextActionLine(family, proof));
}
```

**Use for Phase 1:** 先给 verdict/loop/next action，再给其他 drill-down；不要把首屏重新堆成计数器表。

---

### `src/shared-home/adoption-health.ts` (utility, transform)

**Analog:** `src/shared-home/adoption-health.ts`

**Fail-closed on unreadable QA proof rails** (`src/shared-home/adoption-health.ts:227-251`):
```ts
if (
  managedHosts.length > 0 &&
  input.proofRails?.acquisitionMemory === "unreadable"
) {
  reasons.push({
    code: "ACQUISITION_MEMORY_UNREADABLE",
    message:
      "website QA verify proof is unreadable: acquisition memory cannot prove the install_required -> verify path"
  });
}

if (
  managedHosts.length > 0 &&
  input.proofRails?.verifiedDownstreamManifests === "unreadable"
) {
  reasons.push({
    code: "VERIFIED_DOWNSTREAM_MANIFESTS_UNREADABLE",
    message:
      "website QA replay/reuse proof is unreadable: verified downstream manifests cannot prove replay or cross-host reuse readiness"
  });
}

if (reasons.length > 0) {
  return { status: "blocked", managedHosts, reasons };
}
```

**Use for Phase 1:** unreadable / untrustworthy QA proof rail 必须直接把 adoption health 变成 `blocked`。

---

### `src/bin/skills-broker.ts` (controller, request-response)

**Analog:** `src/bin/skills-broker.ts`

**Strict doctor gate helper** (`src/bin/skills-broker.ts:51-87`):
```ts
type StrictDoctorGateInput = {
  status: { hasStrictIssues: boolean };
  brokerFirstGate: { hasStrictIssues: boolean };
  hosts: Array<{ competingPeerSkills?: unknown[]; integrityIssues?: unknown[]; manualRecovery?: unknown }>;
  adoptionHealth: { status: "inactive" | "green" | "blocked" };
  websiteQaLoop: { verdict: "blocked" | "in_progress" | "proven" };
};

const hasWebsiteQaBlockingIssues = input.websiteQaLoop.verdict === "blocked";
return (
  input.status.hasStrictIssues ||
  input.brokerFirstGate.hasStrictIssues ||
  hasPeerSurfaceStrictIssues ||
  hasAdoptionBlockingIssues ||
  hasWebsiteQaBlockingIssues
);
```

**Doctor command exit behavior** (`src/bin/skills-broker.ts:390-409`):
```ts
if (result.command === "doctor") {
  const lifecycleResult = await doctorSharedBrokerHome({ ... });
  process.stdout.write(`${formatLifecycleResult(lifecycleResult, result.outputMode)}\n`);
  if (result.strict && shouldFailStrictDoctorGate(lifecycleResult)) {
    process.exitCode = 1;
  }
}
```

**Use for Phase 1:** CLI strict gate 必须绑定 QA verdict，而不只是 status / host shell blockers。

---

### `tests/hosts/host-shell-install.test.ts` (test, transform)

**Analog:** `tests/hosts/host-shell-install.test.ts`

**Installed shell ordering assertions** (`tests/hosts/host-shell-install.test.ts:33-86`):
```ts
expectInOrder(skill, [
  '# Skills Broker',
  "Use this skill only at the coarse broker boundary.",
  "The host decides only one of these boundary outcomes:",
  "Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer.",
  "## Broker-First (`broker_first`)",
  "If you need one concrete broker-first example to calibrate the boundary, start with website QA.",
  "### Hero lane: website QA",
  ...
  "## Clarify Before Broker (`clarify_before_broker`)",
  '"check this page"',
```

**Contract assertions beyond order** (`tests/hosts/host-shell-install.test.ts:88-97`):
```ts
expect(skill).toContain(
  "The host decides only the boundary; the broker chooses the package, workflow, skill, or MCP."
);
expect(skill).not.toContain("maintainedFamilies");
```

**Use for Phase 1:** 改动 shell wording 时，先扩这个顺序断言，再改 generator。

---

### `tests/e2e/claude-code-smoke.test.ts` (test, request-response)

**Analog:** `tests/e2e/claude-code-smoke.test.ts`

**Installed Claude shell wording smoke** (`tests/e2e/claude-code-smoke.test.ts:58-78`):
```ts
expect(skillContents).toContain("## Broker-First (`broker_first`)");
expect(skillContents).toContain("If you need one concrete broker-first example to calibrate the boundary, start with website QA.");
expect(skillContents).toContain("Treat the examples below as semantic anchors, not literal trigger phrases.");
expect(skillContents).toContain("Prefer semantic judgment over exact string overlap.");
expect(skillContents).toContain("## Clarify Before Broker (`clarify_before_broker`)");
expect(skillContents).toContain("If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.");
```

**Use for Phase 1:** 保持 Claude Code 安装产物和 generator/README 术语一致。

---

### `tests/e2e/shared-home-smoke.test.ts` (test, request-response)

**Analog:** `tests/e2e/shared-home-smoke.test.ts`

**Cross-host shell wording smoke** (`tests/e2e/shared-home-smoke.test.ts:34-63`):
```ts
expectInOrder(skill, [
  "# Skills Broker",
  "Use this skill only at the coarse broker boundary.",
  "## Broker-First (`broker_first`)",
  "If you need one concrete broker-first example to calibrate the boundary, start with website QA.",
  "### Hero lane: website QA",
  ...
  "If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.",
]);
```

**Doctor + runner smoke** (`tests/e2e/shared-home-smoke.test.ts:143-166`, `tests/e2e/shared-home-smoke.test.ts:250-255`):
```ts
const doctorResult = JSON.parse(doctorStdout) as {
  adoptionHealth: { status: string; managedHosts: string[] };
};
expect(doctorResult.adoptionHealth).toMatchObject({
  status: "green",
  managedHosts: ["claude-code", "codex"]
});

expect(sharedRunnerResult).toMatchObject({
  trace: {
    host: "claude-code",
    resultCode: "HANDOFF_READY",
    missLayer: null
  }
});
```

**Use for Phase 1:** 这是 host shell 文案、shared-home health 和跨宿主复用一起验证的 smoke 基线。

---

### `tests/core/request-normalization.test.ts` (test, transform)

**Analog:** `tests/core/request-normalization.test.ts`

**Negative boundary cases** (`tests/core/request-normalization.test.ts:269-310`):
```ts
it("rejects check this page as unsupported instead of misrouting it to website QA", () => {
  expectRejected(
    {
      requestText: "check this page",
      host: "codex",
      urls: ["https://example.com/page"]
    },
    "UNSUPPORTED_REQUEST"
  );
});
```

**Positive QA normalization case** (`tests/core/request-normalization.test.ts:380-399`):
```ts
const normalized = normalizeRequest({
  requestText: "测下这个网站的质量",
  host: "codex",
  urls: ["http://116.63.15.60/#/login"]
});

expect(normalized.capabilityQuery).toMatchObject({
  goal: "qa a website",
  jobFamilies: ["quality_assurance"],
  targets: [{ type: "website", value: "http://116.63.15.60/#/login" }],
  artifacts: ["qa_report"]
});
```

**Use for Phase 1:** 每加一个 QA hero example，都要有对应 negative case 保证普通页面理解没有被误吸入 QA。

---

### `tests/e2e/phase1-website-qa-eval.test.ts` (test, batch)

**Analog:** `tests/e2e/phase1-website-qa-eval.test.ts`

**Fixture-driven harness shape** (`tests/e2e/phase1-website-qa-eval.test.ts:65-77`, `tests/e2e/phase1-website-qa-eval.test.ts:169-210`):
```ts
async function loadEvalFixture(): Promise<EvalCase[]> {
  const fixturePath = join(
    process.cwd(),
    "tests",
    "fixtures",
    "phase1-website-qa-eval.json"
  );
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as EvalFixture;
  return fixture.cases;
}

for (const testCase of cases) {
  const trace =
    testCase.mode === "synthetic_host_skip"
      ? createSyntheticHostSkippedBrokerTrace(...)
      : testCase.mode === "host_runner"
        ? await runHostRunnerEvalCase(...)
        : await runPrepareFailureEvalCase(testCase);
```

**Use for Phase 1:** 新增 Phase 1 miss attribution 时，先扩 fixture，再扩 harness，不要把 case 硬编码进测试体。

---

### `tests/fixtures/phase1-website-qa-eval.json` (config, batch)

**Analog:** `tests/fixtures/phase1-website-qa-eval.json`

**Phase 1 miss-layer fixture contract** (`tests/fixtures/phase1-website-qa-eval.json:1-56`):
```json
{
  "cases": [
    {
      "id": "host-skip-website-qa",
      "mode": "synthetic_host_skip",
      "requestText": "测下这个网站的质量：https://www.baidu.com",
      "expect": {
        "resultCode": "HOST_SKIPPED_BROKER",
        "missLayer": "host_selection"
      }
    },
    {
      "id": "normalization-miss-check-this-website",
      "mode": "host_runner",
      "requestText": "check this website",
      "expect": {
        "resultCode": "UNSUPPORTED_REQUEST",
        "missLayer": "broker_normalization"
      }
    }
  ]
}
```

**Use for Phase 1:** 保持 case 命名直接对应 miss layer 和 user phrasing，方便 planner/implementer 继续补 coverage。

---

### `tests/integration/broker-flow.test.ts` (test, request-response)

**Analog:** `tests/integration/broker-flow.test.ts`

**Install-required -> verify loop** (`tests/integration/broker-flow.test.ts:2221-2296`):
```ts
const installRequired = await runBroker(request, { ... });
expect(installRequired.ok).toBe(false);
expect(installRequired.outcome.code).toBe("INSTALL_REQUIRED");
expect(installRequired.acquisition?.installPlan.retry).toEqual({
  mode: "rerun_request"
});
expect(installRequired.trace).toMatchObject({
  host: "claude-code",
  hostDecision: "broker_first",
  resultCode: "INSTALL_REQUIRED",
  winnerId: "io.example/website-qa",
});

const verified = await runBroker(request, { ... });
expect(verified.ok).toBe(true);
expect(verified.outcome.code).toBe("HANDOFF_READY");
expect(verified.trace).toMatchObject({
  host: "claude-code",
  hostDecision: "broker_first",
  resultCode: "HANDOFF_READY",
  reasonCode: "query_native"
});
```

**Cross-host reuse proof** (`tests/integration/broker-flow.test.ts:2315-2419`):
```ts
expect(verifiedAcquisitionMemory.entries[0]).toMatchObject({
  canonicalKey:
    "query:v2|output:markdown_only|families:quality_assurance|artifacts:qa_report|constraints:|targets:website:https://example.com|preferred:",
  successfulRoutes: 1,
  verifiedHosts: ["claude-code"]
});

const reused = await runBroker({ ...request, host: "codex", ... }, { currentHost: "codex", ... });
expect(reused.outcome.code).toBe("HANDOFF_READY");
expect(reusedAcquisitionMemory.entries[0]).toMatchObject({
  successfulRoutes: 2,
  firstReuseAt: "2026-04-16T07:10:00.000Z",
  verifiedHosts: expect.arrayContaining(["claude-code", "codex"])
});
```

**Raw Chinese QA request route** (`tests/integration/broker-flow.test.ts:3925-3954`):
```ts
const result = await runBroker(
  {
    requestText: "测下这个网站的质量",
    host: "codex",
    urls: ["http://116.63.15.60/#/login"]
  },
  { ...runtime, currentHost: "codex" }
);

expect(result.winner.id).toBe("website-qa");
expect(result.handoff.request.capabilityQuery).toMatchObject({
  goal: "qa a website",
  jobFamilies: ["quality_assurance"],
  artifacts: ["qa_report"]
});
```

**Use for Phase 1:** 这是 runtime 闭环的主 analog；如果 phase 完成标准变化，先改这里。

---

### `tests/shared-home/doctor.test.ts` (test, batch)

**Analog:** `tests/shared-home/doctor.test.ts`

**Family proof JSON contract** (`tests/shared-home/doctor.test.ts:912-952`):
```ts
expect(result.familyProofs.website_qa).toEqual({
  label: "Website QA",
  installRequiredTraces: 1,
  rerunSuccessfulRoutes: 1,
  reuseRecorded: 0,
  downstreamReplayManifests: 1,
  verdict: "in_progress",
  phase: "cross_host_reuse_pending",
  proofs: {
    installRequiredObserved: true,
    verifyConfirmed: true,
    crossHostReuseConfirmed: false,
    replayReady: true
  },
  nextAction:
    "Repeat the same website QA request from another host to record the first proven reuse."
});
```

**Doctor text contract** (`tests/shared-home/doctor.test.ts:987-1003`):
```ts
expect(rendered).toContain(
  "Website QA loop: install_required=observed (1 install_required trace); rerun=confirmed (1 successful rerun); reuse=pending (no website QA reuse recorded yet); replay=ready (1 verified downstream manifest)"
);
expect(rendered).toContain(
  "Website QA next action: Repeat the same website QA request from another host to record the first proven reuse."
);
```

**Unreadable proof rails block adoption** (`tests/shared-home/doctor.test.ts:1102-1141`):
```ts
expect(result.adoptionHealth.status).toBe("blocked");
expect(result.familyProofs.website_qa.verdict).toBe("blocked");
expect(result.familyProofs.website_qa.phase).toBe("proof_unreadable");
expect(result.adoptionHealth.reasons).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      code: "ACQUISITION_MEMORY_UNREADABLE",
      message: expect.stringContaining("website QA verify proof is unreadable")
    }),
    expect.objectContaining({
      code: "VERIFIED_DOWNSTREAM_MANIFESTS_UNREADABLE",
      message: expect.stringContaining("website QA replay/reuse proof is unreadable")
    })
  ])
);
```

**Use for Phase 1:** doctor 的 JSON/text/blocked 行为都先在这里锁，再去改实现。

---

### `tests/cli/lifecycle-cli.test.ts` (test, request-response)

**Analog:** `tests/cli/lifecycle-cli.test.ts`

**Doctor JSON includes `websiteQaLoop`** (`tests/cli/lifecycle-cli.test.ts:188-202`):
```ts
const result = JSON.parse(stdout.trim());
expect(result.command).toBe("doctor");
expect(result.adoptionHealth.status).toBe("blocked");
expect(result.websiteQaLoop).toEqual(
  expect.objectContaining({
    verdict: "in_progress",
    phase: "install_required_pending",
    proofs: {
      installRequiredObserved: false,
      verifyConfirmed: false,
      crossHostReuseConfirmed: false,
      replayReady: false
    }
  })
);
```

**Strict failure when QA verdict is blocked** (`tests/cli/lifecycle-cli.test.ts:222-241`):
```ts
expect(
  shouldFailStrictDoctorGate({
    status: { hasStrictIssues: false },
    brokerFirstGate: { hasStrictIssues: false },
    hosts: [],
    adoptionHealth: { status: "green" },
    websiteQaLoop: { verdict: "blocked" }
  })
).toBe(true);
```

**Use for Phase 1:** 若 planner 改 `doctor --strict`，必须一起更新 CLI 层的 failure gate 测试。

## Shared Patterns

### Repo-Wide Wording Sync

**Source:** `AGENTS.md:7-10`

```md
- 产品真相优先来自 `README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md`...
- 保持 host shell 的 coarse broker-first boundary...
- 修改 operator-facing wording 时，同步检查 `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 与宿主生成文案...
- 当前产品优先级是把 `website QA` 及相关 family proof loop 做成可信默认入口...
```

**Apply to:** `README.md`, `README.zh-CN.md`, `src/hosts/skill-markdown.ts`, 以及所有改动 operator wording 的 plan。

### Phase Scope Guard

**Source:** `01-CONTEXT.md:16-33`

```md
- D-01: Phase 1 继续使用 QA 专属 proof surface...
- D-03: strict gate 必须把 unreadable / untrustworthy 的 QA proof rail 当成真实阻塞...
- D-06: 只有明确表达“做网站 QA ...”的请求，才直接进入 `broker_first`
- D-09: 完整 QA 闭环必须包含 `INSTALL_REQUIRED` -> `HANDOFF_READY` -> cross-host reuse
- D-11: family-proof 泛化留到 Phase 2
```

**Apply to:** 所有 source/tests；不要在本 phase 引入通用 `familyProofs` 重构。

### Structured Outcome Contract

**Source:** `src/broker/result.ts:50-130`

```ts
export type BrokerSuccessResult = {
  ok: true;
  outcome: { code: "HANDOFF_READY"; message: string };
  handoff: HandoffEnvelope;
  trace: BrokerRoutingTrace;
};

export type BrokerFailureResult = {
  ok: false;
  outcome: {
    code: Exclude<BrokerOutcomeCode, "HANDOFF_READY" | ...>;
    message: string;
    hostAction: BrokerHostAction;
  };
  acquisition?: PackageAcquisitionHint;
  trace: BrokerRoutingTrace;
};
```

**Apply to:** README samples, shell decline contract, integration tests, CLI JSON assertions。

### Trace Miss-Layer Contract

**Source:** `src/broker/trace.ts:174-214`, `src/broker/trace.ts:386-425`

```ts
case "HOST_SKIPPED_BROKER":
  return "host_selection";
case "UNSUPPORTED_REQUEST":
case "AMBIGUOUS_REQUEST":
  return "broker_normalization";
case "NO_CANDIDATE":
case "INSTALL_REQUIRED":
  return "retrieval";
case "PREPARE_FAILED":
  return "prepare";
```
```ts
resultCode: options.resultCode,
routingOutcome: routingOutcomeForResultCode(options.resultCode),
missLayer: missLayerForResultCode(options.resultCode),
```

**Apply to:** `tests/e2e/phase1-website-qa-eval.test.ts`, `tests/fixtures/phase1-website-qa-eval.json`, any new routing regression tests。

### Normalize-To-Error Boundary

**Source:** `src/core/request.ts:59-80`

```ts
const compiled = compileEnvelopeRequest(input);

if (compiled.kind === "compiled") {
  return normalizeCompiledCapabilityQuery(compiled.capabilityQuery);
}

if (compiled.kind === "ambiguous") {
  throw new AmbiguousBrokerRequestError(
    `Ambiguous broker request: ${input.requestText}`
  );
}

throw new UnsupportedBrokerRequestError(
  `Unsupported broker request: ${input.requestText}`
);
```

**Apply to:** `tests/core/request-normalization.test.ts` and any planner work that changes ambiguity vs unsupported behavior.

## No Analog Found

None.

## Metadata

**Analog search scope:** `README*.md`, `AGENTS.md`, `src/{hosts,broker,shared-home,bin}`, `tests/{hosts,e2e,core,integration,shared-home,cli}`, `tests/fixtures`, `.planning/codebase/*`

**Files scanned:** 30+

**Pattern extraction date:** 2026-04-22
