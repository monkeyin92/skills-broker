# Phase 14: Lock QA-First Operator Truth - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12/13 已经把 `website QA` 默认入口的 runtime 真相收实了：route evidence 在 `doctor` 里可见，repeat usage / cross-host reuse proof 也已经在三宿主 shared-home surface 上成立。Phase 14 的边界是把这些已经落地的 runtime truth 同步进 README、README.zh-CN、generated host shell、`STATUS.md`、`TODOS.md` 和 repo-native guardrails，避免 operator-facing wording 漂回旧的 release-truth 叙事或 generic capability list。

</domain>

<decisions>
## Implementation Decisions

### Operator Truth Contract
- **D-01:** `website QA` 继续是唯一 default-entry hero lane；`web markdown` 仍是 second proven family，`social markdown` 仍是 next proven family。
- **D-02:** operator-facing 文案必须明确 coarse broker-first boundary：宿主只决定 `broker_first` / `handle_normally` / `clarify_before_broker`，具体 QA winner 仍由 broker 选。
- **D-03:** `doctor` 的新 truth 也要进 operator story：`websiteQaRouting` summary 以及 repeat usage / cross-host reuse 的拆分不能只停留在 CLI JSON 或单元测试里。
- **D-04:** drift guardrail 优先复用现有 `operator-truth-parity`、host-shell wording tests 与 `ci:blind-spot` / `test:ci:narrative-parity`，不再发明平行检查器。

### the agent's Discretion
- 是否把新的 operator truth 句子提升进 `src/core/operator-truth.ts`，由 the agent 决定；前提是 README、README.zh-CN、generated host shell、STATUS、TODOS 至少有一份 canonical phrasing 可以复用。
- `STATUS.md` 是只更新 human summary 还是新增 canonical board item，由 the agent 决定；前提是 phase12/13 的 QA-first story 能被 repo-native proof surface 追踪。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/operator-truth.ts` 已经保存支持矩阵、hero lane / second / third proven family 与 lifecycle parity 的 canonical wording。
- `src/hosts/skill-markdown.ts` 已经把 coarse broker-first boundary 与 QA-first host-shell copy 写得比 README 更清楚。
- `tests/shared-home/operator-truth-parity.test.ts` 已经在 README / README.zh-CN / TODOS / STATUS 之间做 support-matrix / hierarchy / lifecycle wording parity。
- `src/dev/ci-trust.ts` 已经把 narrative parity suite 纳入 CI trust rail，可继续扩 canonical snippets。

### Observed Gaps
- `TODOS.md` 还停在“v1.2 shipped; next milestone not yet defined”，与当前 v1.3 Phase 14 真实状态明显漂移。
- README / README.zh-CN 还没有把 coarse broker-first boundary 和新的 website QA proof surface 讲成一个统一 operator story；一些 `doctor` 示例仍只讲 cross-host reuse，没有讲 repeat usage 区分或 routing evidence。
- `STATUS.md` 的 human summary 还没有吸收 Phase 12/13 的 QA-first routing confidence 与 repeat-usage proof loop。
- 现有 operator-truth parity / CI snippets 还没有把 coarse boundary 和 website QA proof surface 当成 canonical drift guardrail。

### Integration Points
- canonical wording: `src/core/operator-truth.ts`
- generated host shell copy: `src/hosts/skill-markdown.ts`
- docs / status surfaces: `README.md`, `README.zh-CN.md`, `STATUS.md`, `TODOS.md`
- parity / CI guardrails: `tests/shared-home/operator-truth-parity.test.ts`, `tests/hosts/host-shell-install.test.ts`, `tests/e2e/shared-home-smoke.test.ts`, `src/dev/ci-trust.ts`

</code_context>

<specifics>
## Specific Ideas

- “One boundary sentence everywhere.” README、STATUS、TODOS 和 host shell 都应该说同一句真话：宿主只决定 coarse broker-first boundary，broker 继续选择具体 QA winner。
- “Proof surface should sound current.” operator-facing docs 不该还停在“verify + cross-host reuse”两段式，而要反映 routing evidence + repeat usage / cross-host reuse 的当前 doctor truth。
- “Guardrails should fail closed.” 这轮文案不是只靠人工 review；README / README.zh-CN / TODOS / STATUS / host shell 的 QA-first story 应该被 parity test 和 CI snippet 直接锁住。

</specifics>

<deferred>
## Deferred Ideas

- 把 operator truth contract 泛化成一个更大的 docs-generation system
- 重开 maintained-family schema 泛化、query-native migration 或 package-vs-leaf migration 讨论
- 在默认入口 story 完全锁住前扩新宿主、第四条 proven family 或新的 workflow headline

</deferred>

---
*Phase: 14-lock-qa-first-operator-truth*
*Context gathered: 2026-04-23*
