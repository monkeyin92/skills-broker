# Phase 20: Lock Family-Loop Truth Rails - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 18 已经把 QA-first hierarchy 与 post-QA next-loop wording 收成 canonical operator truth；Phase 19 又把三段 family loop 的 freshness / reuse / refresh guidance 收成 `doctor` 上的 `familyLoopSignals` packet。Phase 20 的边界不是继续扩 runtime semantics，而是把这套新的 family-loop truth 同步进 README、README.zh-CN、installed host shell、`STATUS.md`、`TODOS.md`、parity/CI/audit rails，并在 drift 时 fail closed。

</domain>

<decisions>
## Implementation Decisions

### Canonical Truth Contract
- **D-01:** 新增 family-loop freshness/reuse 的 canonical wording 应优先进入 `src/core/operator-truth.ts`，而不是让 docs、installed shell 与 `doctor` 各自发明描述。
- **D-02:** `website QA adoption packet` 这条既有 truth 继续保留，但 v1.5 需要再加一条更高层的 QA-first family-loop packet wording，明确 `doctor` 现在也会直接暴露 web/social 的 freshness、reuse 与 sequence-aware next action。
- **D-03:** `doctor` text surface 也要输出这条 canonical wording，确保 README / STATUS / installed shell / doctor 说的是同一件事。

### Trust Rails
- **D-04:** drift guardrail 优先复用现有 `operator-truth-parity`、host-shell wording tests、`ci-trust` 与 canonical `STATUS.md` item proof，不新增平行 checker。
- **D-05:** `STATUS.md` 需要把 v1.5 的 hierarchy / freshness / truth-rail 三个 phase 作为 canonical status items 记录下来，给 CI 与后续 milestone audit 直接复用。
- **D-06:** adoption health 继续保持 website QA hero-lane 语义；Phase 20 只锁 docs / wording / guardrails，不把它泛化成 family-wide blocker board。

### the agent's Discretion
- family-loop proof surface 的 canonical sentence 具体措辞由 the agent 决定；前提是英文、中文、installed shell、STATUS、TODOS 与 doctor text 都能复用同一份 wording。
- `STATUS.md` 里 v1.5 item 的粒度与 proof 列表由 the agent 决定；前提是 hierarchy、freshness/reuse 与 truth-rail 三层真相都能被 canonical board 审计。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/operator-truth.ts` 已经收了 support matrix、coarse boundary、QA-first hierarchy、post-QA next-loop 与 website QA adoption packet 的 canonical wording。
- `src/hosts/skill-markdown.ts` 已经复用 operator-truth contract 生成 installed shell 文案，是加新 canonical snippet 的首选接点。
- `tests/shared-home/operator-truth-parity.test.ts` 已经锁 README / README.zh-CN / STATUS / TODOS 的 canonical snippets，并且会解析 `STATUS.md` canonical block。
- `src/dev/ci-trust.ts` 已经把 narrative truth 与 repo-proof truth 变成 live repo gate，可继续扩 docs / status / doctor proof snippets。

### Observed Gaps
- README / README.zh-CN / STATUS / TODOS 当前还主要停在 `website QA adoption packet` 这一层，没有共享一条关于 `familyLoopSignals` / family-loop freshness 的 canonical wording。
- installed host shell 目前只教 hierarchy 与 next-loop，还没直接告诉 operator `doctor` 现在也能看 family-loop freshness / reuse。
- `STATUS.md` canonical block 目前只有 v1.4 phase15-17 的 adoption item；v1.5 的 phase18/19/20 还没进入 canonical board。
- `ci-trust.ts` 的 docs/status/doctor proof snippets 还没有覆盖 family-loop packet 这层 truth。

### Integration Points
- canonical wording: `src/core/operator-truth.ts`
- installed shell copy: `src/hosts/skill-markdown.ts`
- doctor text surface: `src/shared-home/format.ts`
- repo docs/status surfaces: `README.md`, `README.zh-CN.md`, `STATUS.md`, `TODOS.md`
- trust rails: `tests/shared-home/operator-truth-parity.test.ts`, `tests/hosts/host-shell-install.test.ts`, `src/dev/ci-trust.ts`, `tests/dev/ci-trust.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “One packet sentence everywhere.” hierarchy、next-loop、family-loop packet 这三句 canonical truth 应该一起复用，而不是 README 讲一个版本、doctor 讲另一个版本。
- “Status board should remember v1.5.” canonical `STATUS.md` 不能只记到 v1.4 adoption packet，就让 maintainer 去猜 v1.5 的 family-loop truth 是否已经 landed。
- “Guardrails should follow the new truth.” 这轮不是简单补文案，而是把新 family-loop packet 接进 parity / host-shell / CI / audit rails。

</specifics>

<deferred>
## Deferred Ideas

- 重开 maintained-family schema 泛化、query-native migration 或 package-vs-leaf identity 迁移
- 把 adoption health 泛化成 family-wide blocker panel
- 借 Phase 20 顺手扩第四宿主、新 proven family 或 shipping-summary-heavy 主题

</deferred>

---
*Phase: 20-lock-family-loop-truth-rails*
*Context gathered: 2026-04-24*
