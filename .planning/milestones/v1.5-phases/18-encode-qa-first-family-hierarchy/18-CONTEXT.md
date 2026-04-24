# Phase 18: Encode QA-First Family Hierarchy - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

v1.4 已经把 `website QA` 的 adoption packet、freshness-aware health 与 audit truth 收成 repo-owned surfaces。Phase 18 的边界不是去扩 freshness semantics 或 reuse proof 本身，而是先把 `website QA -> web markdown -> social markdown` 这条顺序清晰的 QA-first family hierarchy 收成 canonical operator truth：让 README、README.zh-CN、generated host shell、`STATUS.md`、`TODOS.md` 与相关 canonical wording surface 都讲同一件事，且继续坚持 `website QA` 是唯一第一步。

</domain>

<decisions>
## Implementation Decisions

### Family Hierarchy Contract
- **D-01:** `website QA` 继续是唯一 default-entry hero lane；`web markdown` 是第二条 proven family；`social markdown` 是第三条 proven family，三者是顺序关系，不是并列入口。
- **D-02:** “下一步跑哪条 loop” 只能停留在 family-level operator guidance，不能让宿主、README 或 generated shell 偷做具体 package / skill / MCP winner 选择。
- **D-03:** canonical wording 优先复用并扩展现有 `src/core/operator-truth.ts`、`src/hosts/skill-markdown.ts`、`operator-truth-parity` / host-shell tests / CI truth rails，而不是新建一套平行 contract。
- **D-04:** 本 phase 只收 hierarchy 与 next-loop guidance，不提前把 `web markdown` / `social markdown` 的 freshness、reuse 或 refresh-action 语义做成新 surface；那是 Phase 19 的边界。

### the agent's Discretion
- 是否把新的 hierarchy / next-loop wording 提升到 `src/core/operator-truth.ts` 作为 canonical snippet，由 the agent 决定；前提是 README、README.zh-CN、generated host shell、STATUS、TODOS 与 tests 都能复用同一份 phrasing。
- `STATUS.md` 是新增新的 packet summary 还是只改现有 human summary 里的 hierarchy story，由 the agent 决定；前提是 repo-native truth 仍然清晰可审计。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/operator-truth.ts` 已经保存支持矩阵、hero lane / second proven / third proven family、coarse boundary 与 `website QA` adoption packet 的 canonical wording。
- `src/hosts/skill-markdown.ts` 已经把 host shell 的 hierarchy story 生成出来，并且 tests 会校验 “website QA first -> web markdown -> social markdown” 的顺序。
- `tests/shared-home/operator-truth-parity.test.ts` 已经在 README / README.zh-CN / TODOS / STATUS 之间做 operator-truth parity 校验。
- `src/dev/ci-trust.ts` 已经把 operator-truth / host-shell wording 纳入 repo-native CI truth rail。

### Observed Gaps
- 当前 canonical proof-surface wording 还主要聚焦 `website QA adoption packet`，没有把 “QA 成功后下一条 proven family 是谁、再下一条是谁” 收成一份可复用的 canonical phrasing。
- README / README.zh-CN 虽然已经写了 hierarchy，但当前更多是散落在不同章节，没有明显的 post-QA next-loop contract 可复用。
- `STATUS.md` 与 `TODOS.md` 还停留在 milestone 历史条目叠加，缺少一段更直接的 v1.5 QA-first family-loop wording。

### Integration Points
- canonical operator truth: `src/core/operator-truth.ts`
- generated host shell copy: `src/hosts/skill-markdown.ts`
- repo docs / status surfaces: `README.md`, `README.zh-CN.md`, `STATUS.md`, `TODOS.md`
- parity / CI guardrails: `tests/shared-home/operator-truth-parity.test.ts`, `tests/hosts/host-shell-install.test.ts`, `tests/e2e/shared-home-smoke.test.ts`, `src/dev/ci-trust.ts`

</code_context>

<specifics>
## Specific Ideas

- “One hierarchy sentence everywhere.” operator-facing surfaces 应该能复用同一份话术表达 `website QA` 是第一步，`web markdown` / `social markdown` 是后续两条 proven loop。
- “Next loop, not next winner.” phase 18 要教的是下一条 family loop，不是让宿主或 docs 暗示具体 downstream winner。
- “Keep phase boundaries sharp.” hierarchy wording 这轮先锁住；family-loop freshness / reuse / refresh guidance 的新语义留给 Phase 19。

</specifics>

<deferred>
## Deferred Ideas

- 把 family-loop contract 泛化成 maintained-family schema migration
- 在这轮 hierarchy contract 稳定之前新增第四宿主、新 proven family 或新 workflow headline
- 提前在 Phase 18 里把 `web markdown` / `social markdown` adoption packet 全部扩进 `doctor`

</deferred>

---
*Phase: 18-encode-qa-first-family-hierarchy*
*Context gathered: 2026-04-24*
