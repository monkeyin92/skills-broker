# Phase 1: Prove The QA Hero Loop - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

把 `website QA` 从“默认入口文案”推进成一个被 README、README.zh-CN、安装后的 host shell、runtime 结果码和 `doctor` 一起证明的可信 first-use path。这个 phase 只澄清如何把现有 QA hero lane 做实，不新增能力，不把宿主边界扩成细粒度选 skill，也不提前做 `familyProofs` 泛化。

</domain>

<decisions>
## Implementation Decisions

### Doctor truth surface
- **D-01:** Phase 1 继续使用 QA 专属 proof surface，不在这一阶段把 `websiteQaLoop` 重构成通用 `familyProofs` 抽象。
- **D-02:** `doctor` 的 operator truth 采用 verdict-first 设计，优先让人一眼读出 `blocked` / `in_progress` / `proven` 这类状态；细节保留下钻，不把首屏变成计数器堆砌。
- **D-03:** strict gate 必须把 unreadable / untrustworthy 的 QA proof rail 当成真实阻塞，而不是在 adoption health 仍然看起来绿色时放过。

### Entry narrative strength
- **D-04:** README、README.zh-CN 和安装后的 `SKILL.md` 都要把 `website QA` 教成唯一的 first move；首屏先教这一条，不把 requirements / investigation / markdown 等 lane 平铺在同一个优先级。
- **D-05:** 其他 maintained lanes 仍然保留，但只能作为 secondary lanes 出现，不能抢走 QA hero lane 的视觉和叙事优先级。

### QA boundary strictness
- **D-06:** 采用 precision-first 边界策略。只有明确表达“做网站 QA / 测网站质量 / 找 website QA skill 或 MCP”的请求，才直接进入 `broker_first` 的 QA hero lane。
- **D-07:** 像“看看这个页面”“分析这个链接”这类缺少 QA intent 的模糊请求，应该进入 `clarify_before_broker`，而不是为了命中 hero lane 被强行吞进去。
- **D-08:** 明确要转 markdown、摘要、翻译或普通页面理解的请求，必须留在 QA hero lane 之外；`website QA` 不能靠扩大语义边界来提高命中率。

### Proof completion bar
- **D-09:** Phase 1 的完成标准必须包含完整 QA 闭环：同一句请求先返回 `INSTALL_REQUIRED`，安装后重跑返回 `HANDOFF_READY`，再由另一宿主复用同一条 lane。
- **D-10:** `doctor` 必须能够以 QA lane 为中心表达这条闭环当前是 `in_progress` 还是 `proven`，而不是要求操作者自己读 traces 或 counters 推断。
- **D-11:** `web_content_to_markdown` 的 family-proof 泛化和第二条 proven lane 抽象，明确留到 Phase 2；Phase 1 不把“跨 family 通用结构”当 done 条件。

### the agent's Discretion
- 文案的具体措辞、标题层级和 example 排布，只要不破坏 “website QA is the first move” 这个优先级，都由 the agent 自行决定。
- 测试文件内部的 helper 抽取、fixture 命名和断言组织方式，由 the agent 自行决定。
- `doctor` 的 text / JSON 输出里如何呈现 QA 专属 verdict 的字段细节，只要保持 verdict-first、strict gate fail-closed 和 operator-facing clarity，即可由 the agent 选择实现方式。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and phase contract
- `.planning/PROJECT.md` — 项目的 validated scope、当前 active focus、边界约束
- `.planning/REQUIREMENTS.md` — Phase 1 对应的 `ENTRY-01`、`ENTRY-02`、`ROUTE-01`、`ROUTE-02`、`ROUTE-03`
- `.planning/ROADMAP.md` — Phase 1 的目标、成功标准与 phase sequencing
- `.planning/STATE.md` — 当前 phase 状态与 workflow settings

### Product narrative and operator truth
- `README.md` — 英文产品叙事、Quick Start、website QA hero lane、`doctor` operator path
- `README.zh-CN.md` — 中文产品叙事、Quick Start、website QA hero lane、`doctor` operator path
- `TODOS.md` — 当前 backlog truth，尤其是 QA default-entry hardening 之后才继续更泛化 semantic contract 的 sequencing
- `STATUS.md` — shipped proof 的 repo-native truth surface

### Existing implementation surfaces
- `src/hosts/skill-markdown.ts` — host shell 的 coarse boundary contract、hero/secondary/other lane 排布与 examples
- `src/bin/skills-broker.ts` — lifecycle CLI、strict `doctor` gate、当前 `websiteQaLoop` truth surface
- `src/shared-home/doctor.ts` — shared-home `doctor` proof 聚合与 operator-facing verdict 来源
- `src/shared-home/format.ts` — lifecycle text/JSON output formatting
- `src/broker/result.ts` — `HANDOFF_READY` / `INSTALL_REQUIRED` 等结构化 outcome 合同
- `src/broker/trace.ts` — routing trace 字段与 proof / resultCode surface

### Existing proof rails
- `tests/e2e/shared-home-smoke.test.ts` — installed shell wording、shared-home adoption health、cross-host smoke
- `tests/e2e/claude-code-smoke.test.ts` — installed Claude Code shell wording与 decline/install guidance
- `tests/e2e/phase1-website-qa-eval.test.ts` — website QA lane 的分层归因 proof
- `tests/integration/broker-flow.test.ts` — website QA 与 web markdown 的 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse` integration proof
- `tests/shared-home/doctor.test.ts` — `doctor` proof rails、strict gate 与 family/operator truth 断言

### Historical design context
- `docs/superpowers/plans/2026-04-16-website-qa-default-entry-implementation.md` — website QA 作为 hero flow 的 first-impression hardening 背景
- `docs/superpowers/plans/2026-04-17-semantic-coarse-boundary-hardening-implementation.md` — 把 website QA 从 docs truth 推进成 operator-visible truth 的 Phase 1 设计意图
- `docs/superpowers/specs/2026-04-18-semantic-resolver-web-markdown-design.md` — 明确说明 web markdown / family-proof 泛化属于 Phase 2 之后的结构演进，不应提前并入本 phase done bar

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hosts/skill-markdown.ts`: 已有 hero lane / secondary maintained lanes / other broker-first lanes 的结构，不需要从零设计 installed shell copy。
- `tests/e2e/shared-home-smoke.test.ts`: 已经锁住 installed shell 的文案顺序、QA hero lane 示例和 decline/install guidance，可直接扩展为更强的一致性 proof。
- `tests/e2e/claude-code-smoke.test.ts`: 已有 Claude Code shell wording 和 install guidance 断言，可复用于 phase 里的 host-surface truth hardening。
- `tests/integration/broker-flow.test.ts`: 已经具备 website QA 与 web markdown 的 install / verify / reuse integration proof，可直接作为 Phase 1 done bar 的 runtime backbone。
- `src/bin/skills-broker.ts` + `src/shared-home/doctor.ts`: 当前 lifecycle CLI 和 doctor gate 已存在，只需要围绕 QA hero loop 做 truth hardening，而不是全新建模。

### Established Patterns
- 宿主只负责 coarse broker boundary，具体 package / skill / workflow 选择必须留在 broker 内部。
- operator-facing truth 通过 lifecycle CLI + shared-home doctor 暴露，并由 smoke / integration tests 锁住。
- proof loop 采用结构化 broker outcome（`INSTALL_REQUIRED` / `HANDOFF_READY`）+ persisted advisory state（acquisition memory、verified downstream manifests、traces）组合证明。
- README 与 installed shell 文案已经采用 hero-first 的倾向，只是强度和 strict truth 还不够收口。

### Integration Points
- 文案层：`README.md`、`README.zh-CN.md`
- 宿主壳层：`src/hosts/skill-markdown.ts` 生成结果与对应 smoke tests
- operator truth 层：`src/shared-home/doctor.ts`、`src/shared-home/format.ts`、`src/bin/skills-broker.ts`
- runtime proof 层：`tests/integration/broker-flow.test.ts`、`tests/e2e/phase1-website-qa-eval.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “One hero path, not one-feature product” — 首屏和 Quick Start 只教 website QA 这一条 first move，但不否认其他 maintained lanes 存在。
- “Precision-first beats hero-lane hit rate padding” — 宁可把模糊请求送去 `clarify_before_broker`，也不要让 QA lane 靠扩大边界吃进不该吃的请求。
- “Verdict-first, drill-down second” — operator 第一眼先知道这条 QA 闭环能不能信，再决定是否看更细的 proof 细节。
- “Phase 1 proves the QA loop; Phase 2 generalizes the proof shape” — family-proof abstraction 是下一 phase 的工作，不是这一 phase 的成功标准。

</specifics>

<deferred>
## Deferred Ideas

- 将当前 `websiteQaLoop` 抽象为通用 `familyProofs` 结构，并把 `web_content_to_markdown` 提升成第二条 fully proven family — Phase 2
- 在 QA 与 web markdown 之外继续增加更多 default-entry families — 后续 phase
- 接入 OpenCode 作为第三个 thin host shell — 后续 phase
- 更泛化的 maintained-family semantic contract 美化 — 在默认入口闭环完全被证明之后再评估

</deferred>

---
*Phase: 01-prove-the-qa-hero-loop*
*Context gathered: 2026-04-22*
