# Phase 2: Generalize Family Proofs - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

把 `web_content_to_markdown` 做成继 `website QA` 之后的第二条 proven family，同时把 Phase 1 已经验证过的 proof / install / verify / reuse machinery 提炼成更稳定的 family-level abstraction。这个 phase 只扩展到 web markdown，不把产品范围偷渡成 open-domain capability search，不新增第三宿主，也不把 website QA 的 hero-lane 语义冲淡成“很多并列 first move”。

</domain>

<decisions>
## Implementation Decisions

### Proof surface and operator truth
- **D-01:** `familyProofs` 是 Phase 2 新增或扩展 proof 的 canonical surface；所有新 family 证据都先进入 `familyProofs`，不再新增新的 top-level one-off proof object。
- **D-02:** `websiteQaLoop` 在这一 phase 里保留为兼容 alias / strict-gate input，但它不再是后续 family 扩展的主抽象。Phase 2 不做“彻底删 alias”的清理战役。
- **D-03:** `doctor` text / JSON 的 operator truth 继续 verdict-first，但排序保持 `website QA` 第一、`web markdown` 第二。证明第二条 proven family，不等于把多个 family 平铺成多个 first move。

### Second proven family scope
- **D-04:** Phase 2 只把 `web_content_to_markdown` 做成第二条 proven family。`social_post_to_markdown`、generic fetch/extract、summarize/translate、capability discovery 都不纳入本 phase 的 done bar。
- **D-05:** Phase 2 的 routing proof bar 聚焦“明确要把网页/页面/URL 转成 markdown”的请求；repo target 或其他兼容 target 可以继续存在，但不作为本 phase 必须证明的主叙事。
- **D-06:** `website QA` 的 precision-first boundary 不可回退。web markdown 的泛化不能通过放松 QA 边界来换命中率。

### Semantic matching policy
- **D-07:** semantic matching 继续 broker-owned、deterministic、metadata-driven；不引入 embeddings、模型分类器或 host-side 自由解释。
- **D-08:** 当前 capability metadata 的扩展范围以 `summary`、`keywords`、`antiKeywords`、`jobFamilies`、`targetTypes`、`artifacts`、`examples`、`confidenceHints`、`proofFamily` 为主，只做直接服务于 web markdown 证明面和后续 family growth 的字段收口。
- **D-09:** explicit web markdown 请求可以 direct-route；partial signals 走 `AMBIGUOUS_REQUEST` / clarify；低置信度或错误 target 继续 `UNSUPPORTED_REQUEST`。Phase 2 不能为了“更聪明”破坏 fail-closed contract。

### Growth sequencing
- **D-10:** `TODOS.md` 里 “Generalize maintained-family semantic contract after QA default-entry proof is hard” 这一项正式折叠进本 phase，作为 growth readiness 的范围锚点。
- **D-11:** 本 phase 证明“one hero lane, two proven loops”，而不是“arbitrary request semantic routing is solved”。真正的 open-domain capability search 明确留到更后面。
- **D-12:** 如果 Phase 2 里需要调整 docs / doctor wording，只允许把 web markdown 讲成 second proven family，不能改写成和 website QA 并列争夺默认入口。

### the agent's Discretion
- semantic resolver 的具体 score 组成、阈值命名、trace 字段拼接方式，由 the agent 按现有 deterministic patterns 决定。
- `familyProofs` 与 `websiteQaLoop` 的兼容层具体保留多久、保留成什么字段，只要不破坏 strict gate 和 Phase 1 已有 proof surface，即可由 the agent 自行落地。
- web markdown 在 text / JSON / README 中的具体 wording、例句、排序细节，由 the agent 自行决定，只要保持 “QA first, web markdown second”。

### Folded Todos
- **Generalize maintained-family semantic contract after QA default-entry proof is hard** — 已折叠进本 phase。目标不是美化 schema，而是让 semantic metadata / family proof 真正服务第二条 proven family。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and sequencing
- `.planning/PROJECT.md` — 产品核心价值、brownfield 约束、host thin-shell 与 deterministic routing 的非协商边界
- `.planning/REQUIREMENTS.md` — Phase 2 对应的 `ENTRY-03`、`ROUTE-04`、`GROW-01`
- `.planning/ROADMAP.md` — Phase 2 的 goal、success criteria 与 phase sequencing
- `.planning/STATE.md` — 当前 phase 状态与 workflow 设置
- `.planning/phases/01-prove-the-qa-hero-loop/01-CONTEXT.md` — Phase 1 已锁定的 QA hero-lane、doctor truth、boundary strictness 决策
- `.planning/phases/01-prove-the-qa-hero-loop/01-VERIFICATION.md` — Phase 1 已被证明的 install / rerun / reuse / doctor 闭环，Phase 2 不得回退
- `TODOS.md` — “Generalize maintained-family semantic contract after QA default-entry proof is hard” 的 backlog truth

### Product and architecture specs
- `docs/superpowers/specs/2026-04-18-semantic-resolver-web-markdown-design.md` — Phase 2 的核心设计文档；锁定 second proven family = web markdown only、semantic resolver 的 deterministic middle path、family-proof abstraction 的目标形状
- `docs/superpowers/specs/2026-03-31-broker-first-capability-scaling-design.md` — broker-first capability scaling 的上游约束，说明为何不能把 routing 演进成 host-owned semantic search
- `docs/superpowers/specs/2026-03-30-broker-owned-downstream-capabilities.md` — broker-owned downstream、verified manifests 与 package/leaf identity 的能力面约束

### Existing implementation surfaces
- `src/broker/semantic-resolver.ts` — 当前 semantic resolver 只 direct-route `web_content_to_markdown` 的现状与边界
- `src/broker/query-compiler.ts` — 现有 maintained-family compilation seam；Phase 2 不能破坏 Phase 1 的 QA precision-first decisions
- `src/broker/run.ts` — compiler / semantic resolver / ranking / prepare / traces 的主集成面
- `src/sources/host-skill-catalog.ts` — host catalog semantic metadata 校验与加载
- `config/host-skills.seed.json` — web markdown、social post、QA 等 candidate 的 query metadata 真实形状
- `src/shared-home/doctor.ts` — family proof aggregation、websiteQaLoop compatibility alias、proof-rail truth
- `src/shared-home/format.ts` — doctor text / JSON 输出排序与 operator-facing wording

### Existing proof and regression coverage
- `tests/broker/semantic-resolver.test.ts` — current web markdown direct-route / clarify / unsupported 语义边界
- `tests/integration/broker-flow.test.ts` — website QA 与 web markdown 的 install / verify / cross-host reuse proof
- `tests/shared-home/doctor.test.ts` — family proof summaries、proof-rail unreadability、operator truth
- `.planning/codebase/CONCERNS.md` — semantic routing 仍然 single-family and regex-bound 的当前技术债说明

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/broker/semantic-resolver.ts`: 已存在 deterministic resolver，当前只对 `web_content_to_markdown` 开 direct-route，这是 Phase 2 最直接的 growth seam。
- `config/host-skills.seed.json`: web markdown candidate 已经有 `summary`、`keywords`、`antiKeywords`、`confidenceHints`、`proofFamily` 等 metadata，可直接作为 canonical seed shape。
- `src/shared-home/doctor.ts`: 已经存在 `familyProofs.website_qa` 与 `familyProofs.web_content_to_markdown` 的聚合骨架，以及 `websiteQaLoop` alias。
- `tests/integration/broker-flow.test.ts`: 已经有 web markdown 的 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse` 证明骨架，可直接提升为 Phase 2 done bar。
- `tests/broker/semantic-resolver.test.ts`: 已经保护 explicit / partial / unsupported 三档 semantic verdict。

### Established Patterns
- semantic routing 必须 broker-owned、deterministic、explainable，不能回到 host prompt interpretation。
- proof loop 继续复用现有 install / verify / reuse / manifests / acquisition memory / routing traces，不重做 lifecycle。
- operator truth 采用 verdict-first，先讲是否可信，再讲 drill-down 细节。
- QA 是唯一 hero lane；其他 proven family 只能按 secondary / second proven family 叙事接入。

### Integration Points
- Routing side: `src/broker/query-compiler.ts`, `src/broker/semantic-resolver.ts`, `src/broker/run.ts`
- Metadata side: `config/host-skills.seed.json`, `src/sources/host-skill-catalog.ts`, `src/sources/mcp-registry.ts`
- Proof side: `src/shared-home/doctor.ts`, `src/shared-home/format.ts`, `src/bin/skills-broker.ts`
- Verification side: `tests/broker/semantic-resolver.test.ts`, `tests/integration/broker-flow.test.ts`, `tests/shared-home/doctor.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “One hero lane, two proven loops.” — Phase 2 的产品感应该是：website QA 仍然是第一步，web markdown 成为第二条可信演示路径。
- “Second proven family should be web markdown only.” — 不把 social post、generic extraction、更多 maintained families 一起卷进来。
- “Generalize the proof shape, not the whole product promise.” — 本 phase 证明可扩展的 proof / metadata architecture，不证明 arbitrary intent routing 已经解决。
- “Keep fail-closed semantics.” — 如果请求只是部分像 web markdown，就去 clarify；如果不够像，就 unsupported；不要为了表现聪明而乱猜。

</specifics>

<deferred>
## Deferred Ideas

- 把 `social_post_to_markdown` 提升成第三条 proven family — 后续 phase
- 对更多 maintained families 做 semantic direct-route — 后续 phase
- open-domain capability search、embeddings、模型分类器 — 后续 phase
- 第三个 thin host shell（OpenCode） — 后续 phase
- 借 Phase 2 顺手彻底拆分 `src/shared-home/doctor.ts` / `src/broker/run.ts` 等 oversized module — 归入 Phase 3 runtime hardening
- 默认 MCP discovery 从 demonstrative seed 走向真实 registry readiness — 后续 growth / hardening work

</deferred>

---
*Phase: 02-generalize-family-proofs*
*Context gathered: 2026-04-22*
