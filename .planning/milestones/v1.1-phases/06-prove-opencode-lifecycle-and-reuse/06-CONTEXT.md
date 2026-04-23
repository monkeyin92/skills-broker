# Phase 6: Prove OpenCode Lifecycle And Reuse - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 已经把 OpenCode 变成真正 shipping 的第三宿主壳，但当前 truth 仍明确写着“full lifecycle / proof parity 继续在 Phase 6”。因此本 phase 的边界不是再做一次 attach，而是把 OpenCode 补到与 Claude Code / Codex 同级的 lifecycle、doctor 与 proof/reuse 体验，同时继续守住 thin shell、shared broker home、shared proof state 这三条边界。

</domain>

<decisions>
## Implementation Decisions

### Lifecycle Parity
- **D-01:** OpenCode 必须继续只走同一套发布态 lifecycle surface：`npx skills-broker update` / `doctor` / `remove`。不允许引入 OpenCode-only command、旁路 CLI 或独立 maintenance path。
- **D-02:** `remove` parity 必须包含受管 OpenCode 壳的 remove / preserve / conflict truth，与现有宿主的 result contract 保持同级粒度。
- **D-03:** `doctor` parity 必须继续复用同一份 `adoptionHealth`、`verifiedDownstreamManifests`、`familyProofs`、manual-recovery 和 strict status truth，而不是追加 OpenCode-only summary surface。

### Proof / Reuse Parity
- **D-04:** OpenCode 需要成为 shared proof/reuse state 的真实参与者，而不只是 host inventory 里的一个名字；至少要有一条 cross-host 证据能证明 OpenCode 与现有宿主共享 acquisition memory、verified downstream manifests 和 doctor evidence。
- **D-05:** 这条 proof/reuse 证据应优先沿用现有 `website QA` / `web markdown` canonical loop，而不是为 OpenCode 发明新 family。
- **D-06:** OpenCode parity 只能靠 shared proof rails 完成；不允许增加 OpenCode-only counters、proof rail fork、或 host-local cache/memory 例外。

### Operator Truth Flip
- **D-07:** 只有在 lifecycle parity 和 proof/reuse evidence 都成立之后，Phase 5 遗留的 “Phase 6 caveat” 才能从 repo truth 和 installed shell truth 中移除。
- **D-08:** Phase 6 truth flip 后，README / README.zh-CN / STATUS / TODOS / operator-truth contract 需要改成“三宿主 full lifecycle parity 已成立”，不再保留 “OpenCode 仍待 parity” 的旧叙事。

### the agent's Discretion
- OpenCode parity 的最小 proof family 选用 `website QA` 还是 `web markdown` 作为主证据，由 the agent 依据现有测试 seam 和 no-regression 风险选择；但至少要有一条跨宿主 reuse 证据落在 `doctor` 可见 surface 上。
- Phase 6 是否需要单独增加 dist-backed remove/doctor smoke，还是通过现有 unit/e2e 组合证明发布态 contract，由 the agent 选择；前提是验证结果能覆盖 `update` / `doctor` / `remove` 三条 published surface。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared-home/update.ts`、`src/shared-home/doctor.ts`、`src/shared-home/remove.ts` 已经都接受 `opencodeInstallDirectory`，且 Phase 5 已证明 OpenCode 可以 attach 到 shared broker home。
- `tests/shared-home/doctor.test.ts` 已有 OpenCode host inventory 与 `verifiedDownstreamManifests.hosts` 的基础断言。
- `tests/e2e/shared-home-smoke.test.ts`、`tests/e2e/host-auto-routing-smoke.test.ts` 已证明 OpenCode installed shell 与 shared-home attach/routing no-regression 成立。
- `src/core/operator-truth.ts`、`tests/shared-home/operator-truth-parity.test.ts`、README 双语、STATUS、TODOS 已经围绕 Phase 5 的三宿主 support matrix + Phase 6 caveat 对齐。

### Established Patterns
- lifecycle truth 通过 `src/shared-home/format.ts` 和相关 tests 同步到 text/json output；OpenCode parity 应继续沿用 typed result + formatting seam，而不是写特例字符串。
- shipped truth 翻面时，总是先收敛到 `src/core/operator-truth.ts` 这份 typed contract，再由 parity tests fail closed 锁住 docs/status/shell copy。
- e2e 如果要证明发布态 contract，先重建 `dist/` 再跑 test，避免吃到旧 dist 的假阴性。

### Integration Points
- remove parity: `src/shared-home/remove.ts`, `tests/shared-home/remove.test.ts`, `tests/cli/lifecycle-cli.test.ts`
- doctor/proof parity: `src/shared-home/doctor.ts`, `src/shared-home/format.ts`, `tests/shared-home/doctor.test.ts`, `tests/e2e/shared-home-smoke.test.ts`, `tests/e2e/status-doctor-git.test.ts`
- truth flip: `src/core/operator-truth.ts`, `tests/shared-home/operator-truth-parity.test.ts`, `README.md`, `README.zh-CN.md`, `TODOS.md`, `STATUS.md`

</code_context>

<specifics>
## Specific Ideas

- “Phase 6 should delete the caveat, not add a new one.” 这次重点是把 Phase 5 保留下来的 caveat 清掉，而不是再发明更细的新 caveat。
- “No proof without shared rails.” 任何 OpenCode parity 证明都应建立在现有 acquisition memory / verified downstream manifests / doctor familyProofs 上，而不是 host-local snapshots。
- “Remove counts too.” 如果 `remove` 没有 OpenCode parity，这个 phase 不能算完成，因为 published lifecycle surface 仍然是不对称的。

</specifics>

<deferred>
## Deferred Ideas

- 在 Phase 6 完成前就提前增加更多 proven family / workflow / MCP registry 功能 — 留到 Phase 7
- 为 future host templating 抽象通用宿主模板系统 — 留到 `HOST-04`
- 将 OpenCode 从 `explicit` 升级到其他 invocation mode — 不属于当前 parity phase

</deferred>

---
*Phase: 06-prove-opencode-lifecycle-and-reuse*
*Context gathered: 2026-04-23*
