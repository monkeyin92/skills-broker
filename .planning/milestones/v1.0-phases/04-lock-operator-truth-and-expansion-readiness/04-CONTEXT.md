# Phase 4: Lock Operator Truth And Expansion Readiness - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 只做两件事：把 repo 内所有 operator-facing truth surface 收口成同一套可验证叙事，并把“什么时候可以接第三个 thin host shell”从口头共识变成 repo-owned readiness contract。这个 phase 不实现 OpenCode，不新增 routed family，不重开 shared-home/runtime hardening，也不把 host shell 从 coarse broker-first boundary 扩成细粒度 skill/package 选择层。

</domain>

<decisions>
## Implementation Decisions

### Operator truth and doc parity
- **D-01:** `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md`、以及安装后的 host shell copy，必须围绕同一套 canonical operator truth 工作；至少要对齐 support matrix、default-entry hierarchy、second proven family、以及 lifecycle command wording。
- **D-02:** 当前 v0 支持矩阵继续只包含 Claude Code 和 Codex。OpenCode 保持 deferred but planned；Phase 4 只能把这个 truth 讲清楚，不能偷渡成“半支持”。
- **D-03:** lifecycle 命令的 operator-facing wording 必须显式收口到 `npx skills-broker update`、`npx skills-broker doctor`、`npx skills-broker remove` 这三条 canonical published path，不允许 README、README.zh-CN、TODOS、STATUS 各写各的。

### Thin-host boundary
- **D-04:** host shell 继续只暴露 coarse broker-first boundary：宿主只决定 `broker_first`、`handle_normally`、`clarify_before_broker`，不替 broker 选 package、workflow、skill 或 MCP。
- **D-05:** Phase 4 只能强化 “host shells stay thin” 这一条 contract，不能为了 future host readiness 把现有 host shell copy 改回 family list、tool list，或给宿主入口新增具体能力决策。

### Third-host readiness
- **D-06:** “future third host readiness” 必须被写成显式 checklist / contract，至少覆盖：共享 broker envelope、共享 broker home、`update` / `doctor` / `remove` lifecycle parity、proof/reuse state 复用、以及 smoke / regression bar。
- **D-07:** 新宿主 readiness 的成功标准是 “复用现有 shared-home 与 proof/reuse design”，不是 “再复制一套 OpenCode 专用 runtime 或 operator truth”。

### the agent's Discretion
- canonical operator truth 究竟落在 typed module、config contract、shared snippet 还是 parity test helper，由 the agent 选择，只要能被 repo-native tests 验证。
- third-host readiness artifact 究竟落在 README section、spec/ADR、status item 还是 backlog contract，由 the agent 决定，只要 operator 能查到、后续 phase 能直接引用。
- doc parity tests 是直接 parse markdown，还是读取 canonical status block / generated copy 再对比，由 the agent 决定，只要 drift 会 fail closed。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and active requirements
- `.planning/PROJECT.md` — brownfield 产品边界、shared broker home 模型、thin-host contract、以及 OpenCode 仍然 deferred 的全局约束
- `.planning/REQUIREMENTS.md` — Phase 4 对应的 `HARD-03` 与 `GROW-02`
- `.planning/ROADMAP.md` — Phase 4 goal、success criteria、以及对 prior phases 的依赖
- `.planning/STATE.md` — 当前 workflow 状态与 active phase

### Prior phase truth that Phase 4 must preserve
- `.planning/phases/01-prove-the-qa-hero-loop/01-VERIFICATION.md` — website QA hero lane、default-entry truth、installed-shell first impression bar
- `.planning/phases/02-generalize-family-proofs/02-VERIFICATION.md` — `familyProofs` canonical surface、web markdown second proven family、repo/docs/host shell parity
- `.planning/phases/03-harden-runtime-and-verification/03-VERIFICATION.md` — lifecycle truth、rollback/manual recovery operator wording、contributor verification preflight
- `.planning/phases/03-harden-runtime-and-verification/03-harden-runtime-and-verification-04-SUMMARY.md` — Phase 4 需要承接的 doc / status / host shell truth parity focus

### Codebase risk maps
- `.planning/codebase/CONCERNS.md` — narrative doc drift、thin-host contract、shared-home / status truth 的当前风险
- `.planning/codebase/ARCHITECTURE.md` — shared broker home、host shell、status / doctor proof surface 的系统边界
- `.planning/codebase/CONVENTIONS.md` — status board contract、host-shell markdown generation、CLI wording 与 docs/testing 约定
- `.planning/codebase/TESTING.md` — 现有 tests 拓扑，尤其是 `tests/shared-home/`、`tests/hosts/`、`tests/e2e/`

### Operator truth surfaces
- `README.md` — English product truth、support matrix、lifecycle wording、current phase narrative
- `README.zh-CN.md` — Chinese product truth、support matrix、lifecycle wording、current phase narrative
- `TODOS.md` — backlog truth、OpenCode deferred context、completed packet summaries
- `STATUS.md` — canonical shipped_local / shipped_remote status board contract
- `src/shared-home/status.ts` — STATUS evaluation semantics
- `tests/shared-home/status.test.ts` — STATUS canonical block proof bar

### Thin-host and future-host references
- `src/hosts/skill-markdown.ts` — installed host shell copy、coarse broker-first boundary、hero/secondary lane hierarchy
- `tests/hosts/host-shell-install.test.ts` — installed shell wording/order regression
- `tests/e2e/shared-home-smoke.test.ts` — installed shell / shared-home smoke proof
- `docs/superpowers/specs/2026-03-28-broker-auto-router-design.md` — host-agnostic broker envelope 与 future OpenCode compatibility
- `docs/superpowers/specs/2026-03-27-npx-install-design.md` — shared-home lifecycle、host shell ownership、OpenCode deferred truth
- `docs/superpowers/specs/2026-03-31-broker-first-capability-scaling-design.md` — host shells stay thin、family growth 不应要求宿主 copy 跟着膨胀

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `STATUS.md` 已经有 canonical JSON block，`tests/shared-home/status.test.ts` 也已经把它当 contract 在跑；Phase 4 可以在这个模式上扩 doc parity，而不是另起炉灶。
- `src/hosts/skill-markdown.ts` 已经是 installed host shell copy 的单一生成源；Phase 4 只需要继续把它和 repo docs / status/backlog truth 对齐。
- `TODOS.md` 已经明确挂着 “Add OpenCode as the third thin host shell”，说明 backlog truth 不是空白，而是缺少一个 readiness contract 与 cross-surface parity bar。
- `README.md` / `README.zh-CN.md` 已经都在声明 “Claude Code + Codex 支持、OpenCode deferred、website QA first、web markdown second proven family”，但目前这些 truth 仍主要靠人工同步。

### Established Patterns
- operator truth 必须 fail closed：如果 narrative docs 或 host shell wording 与 canonical truth 漂移，测试应该红，而不是继续放行。
- repo 倾向用真实 docs / real generated markdown / canonical status block 做 proof，而不是只在代码里放常量不验证。
- host shell copy 是 product surface，不只是 implementation detail；它和 README 一样属于必须上测试的 operator-facing contract。
- 新宿主扩展一直被定义成 “沿用同一个 shared broker contract”，而不是为每个 host 复制一套 runtime。

### Integration Points
- doc parity side: `README.md`, `README.zh-CN.md`, `TODOS.md`, `STATUS.md`, `tests/shared-home/status.test.ts`
- host boundary side: `src/hosts/skill-markdown.ts`, `tests/hosts/host-shell-install.test.ts`, `tests/e2e/shared-home-smoke.test.ts`
- readiness side: `docs/superpowers/specs/2026-03-28-broker-auto-router-design.md`, `docs/superpowers/specs/2026-03-27-npx-install-design.md`, `TODOS.md`, `STATUS.md`

</code_context>

<specifics>
## Specific Ideas

- “One truth, many surfaces.” README、README.zh-CN、TODOS、STATUS、installed shell 不该继续靠人工记忆同步。
- “Deferred does not mean vague.” OpenCode 不实现，但 readiness bar 必须清晰到可以被 Phase 5/6 直接引用。
- “Thin host shells stay thin.” future host readiness 依赖的是 contract clarity，不是往 host shell 塞更多具体能力选择。
- “Docs are product behavior.” 如果当前支持矩阵、default-entry hierarchy、lifecycle command wording 漂了，本质上就是产品行为漂了。

</specifics>

<deferred>
## Deferred Ideas

- 直接实现 OpenCode host shell / adapter / lifecycle support — 后续宿主扩展 phase
- 扩更多 proven family 或重开 semantic routing growth — 不属于本 phase
- shared-home / broker runtime 的系统性模块拆分 — 已在 Phase 3 之后继续 deferred
- coverage budget / blind-spot reporting — 更偏向 v2 `QUAL-01`

</deferred>

---
*Phase: 04-lock-operator-truth-and-expansion-readiness*
*Context gathered: 2026-04-22*
