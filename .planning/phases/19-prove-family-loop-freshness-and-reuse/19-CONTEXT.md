# Phase 19: Prove Family-Loop Freshness And Reuse - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 18 已经把 `website QA -> web markdown -> social markdown` 的 hierarchy 与 post-QA next-loop wording 收成 canonical operator truth。Phase 19 的边界不是去重开 maintained-family schema 泛化，也不是把三条 family 打平；而是继续复用 acquisition memory、verified downstream manifests、`doctor` 与 shared-home text/json surfaces，把三段 QA-first family loop 各自的 freshness、reuse 与 refresh action 直接做成可读 proof surface。

</domain>

<decisions>
## Implementation Decisions

### Family-Loop Freshness Packet
- **D-01:** 新增一个顶层 family-loop freshness/reuse packet 来补足 `doctor` surface，但不改写现有 `familyProofs` 的结构；`familyProofs` 继续作为 proof summary，freshness packet 负责“当前是否还活着、哪一段 stale、下一步该刷新什么”。
- **D-02:** freshness window 默认继续沿用 `website QA adoption` 的 7 天窗口，避免引入第二套 freshness 口径。
- **D-03:** freshness 语义优先复用现有 acquisition memory、verified downstream manifests 与 shared-home traces；不新增平行 telemetry，也不要求新存储格式。

### Sequence-Preserving Guidance
- **D-04:** `website QA` 继续是唯一第一步；当 post-QA family 缺失或 stale 时，next action 必须保留顺序约束。
- **D-05:** `web markdown` 的 refresh guidance 在 `website QA` 不新鲜时，必须先提示刷新 `website QA`；`social markdown` 则必须在 `website QA` 与 `web markdown` 都站稳后，才把自己作为下一步动作。
- **D-06:** reuse/freshness surface 可以显示 Claude Code、Codex、OpenCode 的 host coverage，但不能借此暗示宿主去选择具体 downstream winner。

### the agent's Discretion
- freshness packet 的字段形状由 the agent 决定；前提是 text 与 json surface 都能直接读出三段 loop 的 freshness、reuse 与 next action。
- 是否给 post-QA family 输出逐 host 细节行，或只输出 hosts coverage + verified hosts summary，由 the agent 决定；前提是 maintainer 能直接读懂跨宿主复用状态。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared-home/doctor.ts` 已有 `collectFamilyAcquisitionMetrics()`、`familyLatestVerifiedAt`、`hostFamilyLatestVerifiedAt`、`familyNextAction()` 与 `websiteQaAdoption` packet，可直接复用来计算 freshness / reuse。
- `src/shared-home/format.ts` 已经会输出 `websiteQaAdoption`、`familyProofs` 与 canonical QA-first wording，是最自然的 text surface 接入点。
- `tests/shared-home/doctor.test.ts` 已经有 reusable family proof fixtures、stale/fresh website QA adoption fixtures 与大量精确断言，可直接扩展成 family-loop freshness regression rail。
- `tests/e2e/shared-home-smoke.test.ts` 已有三宿主 shared-home smoke，可继续验证 post-QA family reuse 在 published-style surface 上仍可读。

### Established Patterns
- hero lane 的 freshness packet 与 family proof summary 分层已经存在：`websiteQaAdoption` 讲 freshness / routing，`familyProofs` 讲 verify / reuse 阶段。
- `doctor.test.ts` 对 `familyProofs` 有多处 `toEqual` 精确断言，因此 Phase 19 应优先新增顶层 surface，而不是直接给 `DoctorFamilyProofSummary` 塞新字段。
- shared-home text surface 习惯输出一组 summary line + next action line；新的 family-loop freshness 也应延续这个风格。

### Integration Points
- freshness / reuse aggregation: `src/shared-home/doctor.ts`
- text rendering: `src/shared-home/format.ts`
- regression rail: `tests/shared-home/doctor.test.ts`
- shared-home parity smoke: `tests/e2e/shared-home-smoke.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “One fresh packet, not three hacks.” 用一份顶层 family-loop signal 收住三段 freshness/reuse，而不是把信息零散塞进 `familyProofs` 或 docs。
- “Website QA stays the hero.” `website QA` 继续保留专属 adoption packet；新增 surface 只是把 web/social 的 freshness 拉到同一层可读度，不是稀释 hero lane。
- “Next action must respect sequence.” stale `social markdown` 不能直接压过 stale `website QA` 或 `web markdown`，否则 operator story 会重新打平。

</specifics>

<deferred>
## Deferred Ideas

- 重开 maintained-family schema 泛化或 package-vs-leaf identity migration
- 在 Phase 19 里同步扩 README / STATUS / TODOS / CI trust wording；这些 truth-rail 对齐留给 Phase 20
- 把 adoption health 从 website QA hero-lane 语义泛化成所有 family 的统一 blocker 面板

</deferred>

---
*Phase: 19-prove-family-loop-freshness-and-reuse*
*Context gathered: 2026-04-24*
