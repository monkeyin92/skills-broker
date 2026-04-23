# Phase 7: Expand Evidence-Backed Capability Surface - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 已经把 Claude Code、Codex、OpenCode 收敛到同一套 published lifecycle 与 proof/reuse parity。这个 phase 的边界不再是“能不能接第三宿主”，而是要证明 broker 可以在不牺牲 deterministic、metadata-driven、可解释 routing 的前提下，继续扩 surface：新增第三条 proven family、把第二条 broker-owned workflow 做成正式 shipped path，并把 MCP discovery source 从 demo seed 提升到 registry-ready truth。

</domain>

<decisions>
## Implementation Decisions

### CAP-01: Third Proven Family
- **D-01:** `social_post_to_markdown` 应该直接沿用现有 `install_required -> verify -> cross-host reuse` proof rail 升格，不允许为 social markdown 另造一套 proof storage、doctor counter 或 host-local cache 例外。
- **D-02:** social family 的 operator truth 必须建立在同一份 shared `acquisition-memory`、`verifiedDownstreamManifests`、`familyProofs` 与 installed-shell truth 上，而不是只在 host catalog 里多一个条目。
- **D-03:** website QA 继续是唯一 hero lane，web markdown 继续是第二条 proven family；social markdown 只能作为下一条已证明 family 出现，不能改写 hero/default-entry hierarchy。
- **D-04:** 新 family 的最小 proof 应该至少覆盖两个支持宿主；优先让 OpenCode 参与其中一跳，证明新增 surface 继承了三宿主 parity，而不是只在旧双宿主上成立。

### CAP-02: Second Broker-Owned Workflow
- **D-05:** 新 workflow 必须优先从已有 maintained lane 升格，而不是再发明一个新 domain；`investigation` 是当前最合适的升格对象，因为它已经有稳定 query seam、现成 downstream capability、也已经在 host shell 里以“reusable workflow”语义出现。
- **D-06:** shipped workflow 需要有明确的 stage / handoff truth、typed artifact contract、resume semantics 与 host-native handoff 边界；不能只是把一个 skill 改个名字。
- **D-07:** workflow 扩张不能迫使 host 层做更细判断；host 继续只决定 `broker_first` / `handle_normally` / `clarify_before_broker`，具体选哪个 workflow 仍由 broker runtime 决定。

### CAP-03: Registry-Ready MCP Discovery
- **D-08:** MCP registry source 不能再只读 `name/title/description`；至少需要校验 version、remote transport、endpoint presence，并把这些验证结果写进 candidate metadata。
- **D-09:** broker 必须能解释“为什么是这个 MCP”，所以 registry source 需要输出 query coverage / validation truth，`explainDecision()` 也需要把 MCP-specific evidence 讲出来。
- **D-10:** registry-ready 的目标是“可验证、可解释”，不是引入新的黑盒打分；已安装本地 winner、verified downstream manifest 与 acquisition memory 的优先级不能被 registry metadata 反超。

### the agent's Discretion
- social family proof 是通过 local skill 还是 MCP-backed candidate 作为主证明路径，由 the agent 选择；但最终必须落在 shared `doctor` / proof rails 可见 surface 上。
- 新 workflow 的具体命名与 stage 拆分由 the agent 决定；前提是它能复用现有 `investigate` / `review` / `qa` / host-native execution seams，而不是引入新的 runtime primitive。
- registry metadata 具体字段与 explain 文案由 the agent 设计；前提是它们可测试、可验证、且不会把 packaged demo seed 冒充成 production-ready registry truth。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config/host-skills.seed.json` 已经有 `social-post-to-markdown`、`requirements-analysis`、`website-qa`、`investigation` 等 skill metadata，以及 `idea-to-ship` workflow recipe，可直接复用 catalog/workflow loader 现有能力。
- `src/shared-home/doctor.ts` 已经把 `website_qa` 与 `web_content_to_markdown` 变成 canonical `familyProofs`，说明第三条 proven family 可以沿现有 doctor seam 扩展。
- `tests/integration/broker-flow.test.ts` 已经有 `website QA` 与 `web markdown` 的完整 `INSTALL_REQUIRED -> verify -> cross-host reuse` 证明模式，可直接平移到 social family。
- `src/core/workflow.ts`、`src/broker/workflow-runtime.ts`、`tests/broker/workflow-runtime.test.ts`、`tests/e2e/workflow-host-smoke.test.ts` 已经证明 broker-native workflow contract 可运行、可 resume、可跨宿主对齐。
- `src/sources/mcp-registry.ts` 已经有 intent/query-based MCP matching 基础，但当前只消费 `name/title/description`，缺少 registry validation 与 explainability metadata。

### Established Patterns
- proven family 的 truth 总是先收敛到 typed `familyProofs` / acquisition-memory / verified manifest surface，再由 README / STATUS / installed shell / parity tests 翻面。
- workflow shipped path 依赖显式 `producesArtifacts`、`requiresArtifacts`、`requiredCompletedStageIds` 和 stage handoff，而不是靠自然语言约定。
- source metadata 允许把 discovery provenance 和 explainability truth 写进 candidate/card，并在 replay / advisory surfaces 中保留。

### Integration Points
- third family proof: `src/shared-home/doctor.ts`, `tests/shared-home/doctor.test.ts`, `tests/integration/broker-flow.test.ts`, `tests/e2e/shared-home-smoke.test.ts`
- second workflow: `config/host-skills.seed.json`, `src/sources/host-skill-catalog.ts`, `src/broker/workflow-runtime.ts`, `tests/broker/workflow-runtime.test.ts`, `tests/integration/broker-flow.test.ts`, `tests/e2e/workflow-host-smoke.test.ts`
- registry-ready MCP source: `src/sources/mcp-registry.ts`, `src/broker/explain.ts`, `tests/sources/mcp-registry.test.ts`, `tests/broker/rank.test.ts`, `tests/integration/broker-flow.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “No third family without doctor truth.” 只新增 catalog intent 不算 Phase 7 完成，必须把 social proof 推进到 shared doctor 与 cross-host reuse surface。
- “Promote an existing lane, don’t invent a fake workflow.” investigation 已经带有明显 workflow semantics，最值钱的是把它从 direct handoff 升到 broker-owned staged path。
- “Registry-ready means verifiable, not just matchable.” MCP 推荐如果说不清 transport / version / query coverage，就还只是 demo seed，不是 operator truth。

</specifics>

<deferred>
## Deferred Ideas

- 真实联网 MCP registry freshness / health / trust scoring — 留到 `CAP-05`
- 在同一个 phase 里再增加多条 broker-owned workflow — 留到后续 milestone
- 增加第四宿主或宿主模板化 — 不属于当前 capability surface 扩张 phase

</deferred>

---
*Phase: 07-expand-evidence-backed-capability-surface*
*Context gathered: 2026-04-23*
