# Phase 11: Close Publish Flow On Canonical Release Truth - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9/10 已经把 repo-local release truth surface 建成了 `release:gate` + `release:promote`。这个 phase 的边界是把 npm publish automation 直接接到这条 canonical truth 上，并把 operator-facing wording 锁成一个故事：published lifecycle commands 继续是 `update / doctor / remove`，而 repo-owned release flow 通过 `release:gate` / `release:promote` 收口 shipped-local 与 shipped-remote。

</domain>

<decisions>
## Implementation Decisions

### Publish Closure Contract
- **D-01:** publish workflow 在真正 `npm publish` 之前必须先跑 `release:gate`，直接复用 blind-spot、narrative parity 与 strict doctor truth。
- **D-02:** publish 成功后必须显式运行 `release:promote`，并把 canonical `STATUS.md` 写回默认分支，结束人工补 shipped truth 的 release 尾巴。
- **D-03:** publish closeout 要继续复用 Phase 9 的 release gate，而不是再引入一套 release-only post-publish checker。
- **D-04:** operator-facing wording 必须清楚地区分 repo-local release truth commands 与 published lifecycle commands，避免 README / STATUS / TODOS / automation logs 漂移。

### the agent's Discretion
- post-publish pushback 的 git strategy 由 the agent 决定；前提是 detached tag publish 也能 fail closed，并且不会静默写错分支。
- publish workflow 是否额外输出 JSON logs / step names 由 the agent 设计；前提是 maintainer 能从 workflow log 看懂 gate、promotion 与 closeout 各自发生了什么。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/publish-npm.yml` 已经完成 tag/version/publish 基本流程，但还没有接 canonical release truth。
- `src/dev/release-truth.ts` 现在已经提供 `gate` 与 `promote` repo-local commands，可直接被 publish automation 调用。
- `tests/dev/release-truth.test.ts` 已经能覆盖 repo-local release truth CLI，可继续扩展 publish workflow wiring asserts。
- `README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md` 已经承载 operator-facing lifecycle truth，是 Phase 11 wording sync 的主要 surface。

### Established Patterns
- workflow wiring 变化要有 repo-native test/assert，避免 automation drift 只在 release 时才被发现。
- published lifecycle CLI 和 repo-local dev/release helpers 要刻意分层，避免用户以为 `npx skills-broker` 会直接做 repo publish bookkeeping。
- canonical shipped truth 继续优先收敛在 `STATUS.md`，workflow log 只是对这份 truth 的消费与传播。

### Integration Points
- publish automation: `.github/workflows/publish-npm.yml`
- repo-owned release truth: `src/dev/release-truth.ts`, `scripts/release-truth.mjs`, `package.json`
- operator wording: `README.md`, `README.zh-CN.md`, `STATUS.md`, `TODOS.md`
- verification: `tests/dev/release-truth.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “Pre-publish gate, post-publish promotion, final closeout.” 三步都消费同一条 canonical release truth。
- “Detached tag should still fail closed.” workflow 需要能在 tag checkout 上推进 truth，而不是偷偷依赖本地分支状态。
- “One operator story.” published lifecycle CLI 仍然是 shared-home maintenance；repo-local release truth 只服务 ship/publish。

</specifics>

<deferred>
## Deferred Ideas

- 自动生成 GitHub job summary / release note shipping recap
- richer `SHIP-03` shipping summary artifact
- 多分支 release trains / non-default shipping ref policy

</deferred>

---
*Phase: 11-close-publish-flow-on-canonical-release-truth*
*Context gathered: 2026-04-23*
