# Phase 12: Harden Website QA Broker-First Hit Rate - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

v1.3 的第一步不是扩更多 family，也不是重做 host/broker 分工，而是把 `website QA` 这条默认入口真正收成“在真实宿主里更容易命中”的可信入口。当前 repo 已经有 coarse broker-first boundary、三宿主薄壳、QA hero lane、routing trace 与 doctor proof rail，但仍有两个明显缺口：一类是明显 QA/找 QA 能力的话术还没有被稳定归一化；另一类是 maintainer 还不能直接从 repo-owned 证据面里隔离出 `website QA` 自己的 hit / misroute / fallback 表现。

</domain>

<decisions>
## Implementation Decisions

### Routing Defaults
- **D-01:** 继续保持 coarse broker-first boundary。宿主只能决定 `broker_first` / `handle_normally` / `clarify_before_broker`，不能在入口层细分具体 QA winner。
- **D-02:** “想找 / 安装一个做 website QA 的 skill/MCP” 仍然属于 broker-first，但 broker 归一化时应进入 capability-discovery / install lane，而不是被误当成直接 QA 执行请求。
- **D-03:** `website QA` 的命中扩展应优先覆盖明显 paraphrase 与中英混合 install-help 话术；像 `check this page` / `test this page` 这种 page-level、非明确 website QA 的近邻表达要继续 fail closed，而不是被吞进 hero lane。
- **D-04:** 路由证据面先做 `website QA` 专用 surface，而不是借机泛化 maintained-family routing schema；当前 sequencing 仍然应该服务默认入口闭环。

### the agent's Discretion
- phase 2 coarse-boundary eval 是否扩到 OpenCode，由 the agent 决定；前提是支持宿主的默认入口证据不能只停在 Claude Code / Codex。
- `website QA` 路由证据可挂在 `routingMetrics` 下的新 hero-lane summary，或并列 doctor surface；前提是 operator 不需要从原始 trace 手工拼结论。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hosts/skill-markdown.ts` 已经把 `website QA` 放在 hero lane，并明确写了 coarse broker-first boundary 与 capability lookup 入口。
- `config/maintained-broker-first-families.json` 已经保存 requirements / QA / investigation 三条 maintained broker-first family 与 boundary examples。
- `src/broker/query-compiler.ts` 已经能把 raw envelope 归一化为 `quality_assurance`、requirements analysis、investigation、web/social markdown 与 capability discovery query。
- `src/broker/trace.ts` 与 `src/shared-home/doctor.ts` 已经能持久化并汇总 request surface / contract 级别的 hit、misroute、fallback 指标。
- `tests/e2e/phase2-coarse-boundary-eval.test.ts`、`tests/fixtures/phase2-coarse-boundary-eval.json` 已经构成跨宿主 coarse-boundary eval harness。

### Observed Gaps
- 英文 capability-discovery 话术如 `find a skill or MCP for website QA` 已经会进入 discovery lane，但中文/混合话术如 `有没有现成 skill 能做这个网站 QA`、`推荐一个 skill 做网站 QA` 仍会被误归一化成直接 QA 请求。
- 当前 `website QA` 识别对带 URL 的 `test this page` 一类 page-level 表达过宽，容易把接近 clarify 的语句误吞进 hero lane。
- doctor 目前只按 request surface / contract 汇总 routing metrics，maintainer 还不能直接看 `website QA` 自己的 observed / hit / misroute / fallback / host-skip 证据。
- phase 2 coarse-boundary eval 仍停留在 Claude Code / Codex 双宿主，和当前三宿主 shipped truth 不完全对齐。

### Integration Points
- routing normalization: `src/broker/query-compiler.ts`, `src/core/request.ts`
- host-shell truth / maintained examples: `config/maintained-broker-first-families.json`, `src/hosts/skill-markdown.ts`
- trace + doctor evidence: `src/broker/trace.ts`, `src/shared-home/doctor.ts`, `src/shared-home/format.ts`
- verification: `tests/broker/query-compiler.test.ts`, `tests/core/request-normalization.test.ts`, `tests/e2e/phase2-coarse-boundary-eval.test.ts`, `tests/e2e/host-auto-routing-smoke.test.ts`, `tests/shared-home/doctor.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “Capability lookup for QA is still QA-first.” 用户要找做 website QA 的能力时，宿主仍应进 broker，但 broker 内部应该产出 acquisition query，而不是伪装成直接 handoff。
- “Page ambiguity should stay ambiguous.” `page` / `link` / `test this` 这种近邻表达不能靠 URL 存在就自动升级成 website QA。
- “Show me the hero lane metrics.” `doctor` 应该直接给出 `website QA` 这条 lane 的 repo-owned routing summary，而不是只给泛 request-surface 比例。

</specifics>

<deferred>
## Deferred Ideas

- 把 routing evidence 一次性泛化成所有 maintained family 的统一 schema
- 重开 query-native migration、package-vs-leaf identity migration、maintained-family schema 抽象化
- 重新定义 host-side boundary，让宿主直接选具体 QA skill / package / workflow

</deferred>

---
*Phase: 12-harden-website-qa-broker-first-hit-rate*
*Context gathered: 2026-04-23*
