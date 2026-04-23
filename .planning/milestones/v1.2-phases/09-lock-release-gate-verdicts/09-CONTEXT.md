# Phase 9: Lock Release Gate Verdicts - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 已经把 blind-spot reporting、focused narrative parity 与 strict repo proof gate 接进了 CI。这个 phase 的边界不是继续增加新的 trust surface，而是把这三条已经存在的 rail 收成一条 canonical release gate，让 ship/publish 可以直接消费同一份 truth，并且明确告诉 maintainer：哪一条 rail 失败、这次评估用的是哪个 shipping ref、remote truth 有没有被刷新。

</domain>

<decisions>
## Implementation Decisions

### Release Gate Contract
- **D-01:** release gate 必须复用现有三条 trust rail：`ci:blind-spot`、`test:ci:narrative-parity`、strict repo-scoped `skills-broker doctor`；不能再造一套 release-only evaluator。
- **D-02:** gate 输出需要 machine-readable verdict，至少包含 rail 级别状态、failing rails、evaluated shipping ref、remote freshness，以及 strict doctor 的关键诊断摘要。
- **D-03:** `verify:local` 继续保持 contributor 本地预检职责；release gate 不能把它误包装成 shipping proof。

### the agent's Discretion
- release gate 采用 repo-local npm script 还是额外 CLI 子命令，由 the agent 决定；前提是 published lifecycle commands 仍保持 `update / doctor / remove` 为对外 contract。
- blind-spot rail 与 strict doctor rail 是直接调用底层函数还是 shell 到现有脚本/CLI，由 the agent 决定；前提是 release gate 真的复用现有 truth source，而不是复制一份逻辑。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/dev/ci-trust.ts` 已经能输出 blind-spot report，并支持 text/json 两种模式。
- `tests/shared-home/operator-truth-parity.test.ts` 与 `tests/hosts/host-shell-install.test.ts` 已经构成 narrative parity rail，可直接由 focused vitest suite 复用。
- `src/shared-home/status.ts` 已经能按 shipping ref、remote refresh 与 canonical `STATUS.md` block 做严格评估。
- `src/bin/skills-broker.ts` 已经提供 `doctor --strict --refresh-remote --repo-root --ship-ref` 契约，且有 `tests/cli/lifecycle-cli.test.ts` 与 `tests/e2e/status-doctor-git.test.ts` 证明它可用于 CI/release gate。
- `.github/workflows/ci.yml` 已经把 trust rails 拆成独立 trust/status jobs，为 release gate 的命令编排提供了现成 source。

### Established Patterns
- repo-facing dev CLIs 放在 `src/dev/*.ts`，通过 `scripts/*.mjs` + `node --import ./scripts/register-ts-node.mjs ...` 暴露成 npm scripts。
- canonical truth 输出默认同时支持 text 与 json，便于人读和 automation 消费。
- 重要 release/proof 行为都要有 repo-native tests，避免 workflow wiring 变化时 silently drift。

### Integration Points
- release gate orchestration: `src/dev/ci-trust.ts`, `src/bin/skills-broker.ts`, `src/shared-home/status.ts`, `src/shared-home/doctor.ts`
- repo-local command surface: `scripts/*.mjs`, `package.json`
- verification: `tests/dev/*.test.ts`, `tests/cli/lifecycle-cli.test.ts`, `tests/e2e/status-doctor-git.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “One release verdict, three existing rails.” 让 maintainer 不必自己拼 blind-spot、narrative parity、strict doctor 的结果。
- “Tell me what failed.” 输出里必须直接给 rail id、shipping ref、remote freshness。
- “Do not widen published lifecycle.” release gate 是 repo-owned flow，不改对外 `update / doctor / remove` contract。

</specifics>

<deferred>
## Deferred Ideas

- 把 publish、promotion、summary 全包成一个单命令 release orchestrator
- 在 GitHub Actions summary 里做更花的 UI 渲染
- 为 release gate 增加 package provenance、npm registry live health 等额外 rails

</deferred>

---
*Phase: 09-lock-release-gate-verdicts*
*Context gathered: 2026-04-23*
