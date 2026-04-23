# Phase 10: Ship Repo-Owned Proof Promotion - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 已经把 blind-spot、narrative parity 与 strict repo-scoped doctor 收成了 canonical `release:gate`。这个 phase 的边界不是再扩 gate，而是给 canonical `STATUS.md` truth 一个显式、repo-owned、fail-closed 的 promotion flow：只有 truly eligible 的 `shipped_local` 项才能升级成 `shipped_remote`，其余情况一律阻断，不再靠 milestone 末尾人工补账。

</domain>

<decisions>
## Implementation Decisions

### Proof Promotion Contract
- **D-01:** promotion 只允许升级 `declared=shipped_local` 且 `evaluated=shipped_remote` 的 canonical status item；其他 mismatch 仍然视为 blocking issue。
- **D-02:** promotion 必须复用现有 `evaluateStatusBoard()` / strict doctor 的 shipping-ref、remote refresh 与 proof evaluation 逻辑，不能发明第二套 shipped-truth evaluator。
- **D-03:** ship ref 未解析、remote refresh 失败、proof invalid、canonical block 损坏、或 non-promotion mismatch 时都必须 fail closed，并且不写 `STATUS.md`。
- **D-04:** 写回只修改 canonical JSON block 中 eligible item 的 `status`，保持 repo-owned truth 在同一个 `STATUS.md` seam 收敛。

### the agent's Discretion
- promotion 输出 shape、text/json 呈现与 CLI flags 由 the agent 决定；前提是 automation 可以读出 promoted item、blocking issues、shipping ref 与 remote freshness。
- promotion 逻辑继续扩在 `src/dev/release-truth.ts` 还是拆分新模块，由 the agent 决定；前提是 repo-local release truth surface 仍然集中、易测、易复用。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared-home/status.ts` 已经提供 canonical `STATUS.md` parser、shipping ref 解析、remote refresh、proof evaluation、declared/evaluated mismatch 诊断。
- `tests/shared-home/status.test.ts` 与 `tests/e2e/status-doctor-git.test.ts` 已经覆盖 detached HEAD、remote refresh failure、local-vs-remote shipped truth 等关键边界。
- `src/dev/release-truth.ts` 已经在 Phase 9 建立了 repo-local `gate` CLI，可继续承载 `promote` 子命令与 JSON/text output。
- `STATUS.md` 已经把 `shipped_local` / `shipped_remote` 作为 canonical board contract，而不是 README 文案约定。

### Established Patterns
- repo-facing dev/release CLIs 走 `src/dev/*.ts` + `scripts/*.mjs` + `package.json` npm scripts。
- canonical truth 写回必须是可审计、可重复执行、fail-closed 的 repo-owned contract。
- 重要 repo truth 变更要用真实 git repo fixtures 测试 ship ref / remote refresh / rewrite 行为，而不是只做纯字符串单测。

### Integration Points
- truth evaluator: `src/shared-home/status.ts`
- repo-local release flow: `src/dev/release-truth.ts`, `scripts/release-truth.mjs`, `package.json`
- proof board: `STATUS.md`
- verification: `tests/dev/release-truth.test.ts`, `tests/shared-home/status.test.ts`, `tests/e2e/status-doctor-git.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “Only promote what is already remotely true.” promotion 不负责替你修 proof，只负责把 canonical truth 从 local 升到 remote。
- “No silent partial rewrite.” 只要还有 blocking issue，就不写 `STATUS.md`，避免一半 promotion 成功、一半真相继续飘。
- “Keep release truth repo-owned.” promotion 是 repo-local flow，不扩大 published lifecycle CLI surface。

</specifics>

<deferred>
## Deferred Ideas

- 自动重写 `STATUS.md` human summary 的所有自然语言 bullet
- promotion 完成后自动生成 richer shipping summary / changelog
- 在 promotion flow 中顺手处理 future tag / npm provenance / release-note synthesis

</deferred>

---
*Phase: 10-ship-repo-owned-proof-promotion*
*Context gathered: 2026-04-23*
