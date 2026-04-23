# Phase 13: Prove Website QA Repeat Usage Loop - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 已经把 `website QA` 的默认入口命中率和 route evidence 收得更稳。Phase 13 的边界是不再只证明“第一次 install 之后可以成功一次”，而是把 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse -> repeat usage` 收成 repo-owned proof loop，并让 maintainer 能直接从 `doctor`、acquisition memory 与 verified downstream manifests 看懂这条 loop 还缺哪一环。

</domain>

<decisions>
## Implementation Decisions

### Proof Semantics
- **D-01:** `reuseRecorded` 继续表示 repeat usage evidence，来源仍是 acquisition memory 的 `firstReuseAt`；它不再被解释成 cross-host reuse。
- **D-02:** `crossHostReuseRecorded` 单独来自 acquisition memory 的 `verifiedHosts.length > 1`，不能再从 `reuseRecorded` 推导。
- **D-03:** `doctor` 的 `phase`、`proofs`、`state` 与 `nextAction` 必须讲同一套故事：先 verify，再 repeat usage，再 cross-host reuse；verified downstream manifest 继续作为 replay readiness rail，而不是额外发明新 proof store。
- **D-04:** 这个 phase 只收紧 `website QA` hero lane 的 reuse proof，不借机重开 maintained-family schema 泛化、query-native migration 或 package-vs-leaf identity migration。

### the agent's Discretion
- canonical repeat-usage proof 走 MCP bundle 还是 local skill bundle 由 the agent 决定；前提是它能覆盖三宿主 shared-home surface。
- `doctor` 是用新增 phase/state 还是只改文案，由 the agent 决定；前提是 operator 能一眼区分 repeat usage 与 cross-host reuse。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/broker/acquisition-memory.ts` 已经记录 `successfulRoutes`、`firstReuseAt` 与 `verifiedHosts`，足够承载 repeat usage / cross-host reuse 的拆分。
- `src/shared-home/doctor.ts`、`src/shared-home/format.ts` 已经是 canonical operator proof surface，且刚在 Phase 12 增加了 `websiteQaRouting` summary。
- `tests/integration/broker-flow.test.ts` 已经有 website QA / web markdown / social markdown 的 install→verify→reuse integration coverage。
- `tests/e2e/shared-home-smoke.test.ts` 与 `tests/cli/lifecycle-cli.test.ts` 已经能验证 published CLI / shared-home doctor surface。

### Observed Gaps
- `doctor` 目前把 repeat usage 与 cross-host reuse 讲得不够清楚，`phase` / `nextAction` / text output 还会把“第一次 reuse”和“跨宿主 reuse”混在一起。
- CLI / doctor tests 还没全面同步新的 proof shape，导致 `repeatUsageConfirmed`、`crossHostReuseRecorded` 与 website QA acquisition proof surface 还不稳定。
- canonical website QA proof 需要明确体现“不是只成功一次”，而是 install 之后还能再次成功，并且跨宿主复用。

### Integration Points
- acquisition memory: `src/broker/acquisition-memory.ts`
- doctor proof surface: `src/shared-home/doctor.ts`, `src/shared-home/format.ts`
- canonical proof tests: `tests/integration/broker-flow.test.ts`, `tests/shared-home/doctor.test.ts`
- CLI / published surface: `tests/e2e/shared-home-smoke.test.ts`, `tests/cli/lifecycle-cli.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “Repeat usage is not cross-host reuse.” 第二次成功路由可以先在同宿主发生；只有 `verifiedHosts` 扩到第二个宿主时，cross-host reuse 才算 confirmed。
- “Doctor should point to the next missing proof.” 当 verify 已经 confirmed 但 repeat usage 没发生时，`doctor` 应明确要求再跑一次同样的 QA request；当 repeat usage 已经 confirmed 但还没跨宿主时，才提示 cross-host reuse。
- “Proof rails stay repo-owned.” repeat usage / cross-host reuse 继续复用 acquisition memory、verified downstream manifests、CLI doctor JSON/text 与 integration tests，不另起 telemetry。

</specifics>

<deferred>
## Deferred Ideas

- 把 repeat-usage / cross-host reuse schema 一次性泛化成所有 maintained family 的统一 adoption dashboard
- 在默认入口 proof 没完全锁住前重新打开第四宿主、更多 family/workflow 扩展或 maintained-family 抽象化
- 重新定义 host shell 入口，让宿主直接挑具体 QA winner

</deferred>

---
*Phase: 13-prove-website-qa-repeat-usage-loop*
*Context gathered: 2026-04-23*
