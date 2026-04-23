# Phase 5: Ship The OpenCode Thin Host Shell - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

把 OpenCode 从 deferred readiness contract 推进成真实 shipping 的第三宿主 attach path：通过现有 shared broker home 和 published update path 安装一个仍然保持 coarse broker-first boundary 的 thin host shell，同时保证 Claude Code / Codex 不回归。这个 phase 只负责 “attach + shell truth + support-matrix honesty + no-regression install/smoke”；不在本 phase 完成 OpenCode 的 full doctor/remove/adoptionHealth/familyProofs parity，也不允许分叉 OpenCode-only runtime 或 proof rail。

</domain>

<decisions>
## Implementation Decisions

### Host identity and install contract
- **D-01:** OpenCode 在 runtime、manifest、CLI/envelope validation、docs 与 tests 中统一采用 canonical host id `opencode`；不再引入 `open-code`、`OpenCode` 或其他并列 runtime id。
- **D-02:** OpenCode 的默认宿主根目录检测同时兼容 `~/.config/opencode` 与 `~/.opencode`，并提供 `--opencode-dir` 作为显式 override；planner 可以决定检测优先级和兼容细节，但不能再发明第二套 host naming contract。
- **D-03:** OpenCode 先采用与 Codex 同类的薄 skill shell 形态，而不是 Claude Code 式 plugin 包装；目标是最小化第三宿主接入的专用壳层逻辑。

### Thin-shell boundary
- **D-04:** OpenCode shell 的 invocation mode 先锁定为 `explicit`，不在 Phase 5 引入 `auto`。
- **D-05:** OpenCode installed shell 必须继续复用 `src/hosts/skill-markdown.ts` 这一套 coarse broker-first copy contract，只允许宿主决定 `broker_first` / `handle_normally` / `clarify_before_broker`，不能在入口层选 package、workflow、skill 或 MCP。

### Shipping slice versus lifecycle parity
- **D-06:** Phase 5 的 shipping bar 是：`npx skills-broker update` 能在不分叉 shared-home 的前提下安装或修复 OpenCode host shell，并且已安装 shell 可走通与现有宿主一致的 attach/smoke truth。不要为此新增 OpenCode-only 安装脚本或旁路 lifecycle。
- **D-07:** `doctor`、`remove`、`adoptionHealth`、`familyProofs`、manual-recovery 与 proof/reuse parity 的完整 OpenCode 体验留到 Phase 6；Phase 5 只做保持 repo/runtime 内部一致、不会误导或破坏现有两宿主语义的最小必要 plumbing。

### Operator truth flip rules
- **D-08:** 一旦 OpenCode 的真实 shipping attach path 存在，`README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 与 installed shell copy 的 support matrix 就要从“Claude Code、Codex supported; OpenCode deferred”翻到“OpenCode supported”，不能继续停留在 deferred 叙事。
- **D-09:** 但 docs/operator truth 必须同时明确：OpenCode 在本阶段拿到的是 thin host shell shipping，不等于已完成 lifecycle/proof parity；Phase 6 继续补齐 doctor/remove/proof-reuse 同级体验，避免新的过度承诺。

### Shared truth and no-exception rule
- **D-10:** OpenCode 不允许拥有专属 runtime、专属 cache、专属 acquisition memory、专属 verified downstream manifests 或专属 proof rail；继续沿用同一套 shared broker home 与 ownership/peer-surface 规则。
- **D-11:** 如果为第三宿主接入需要改动 `BROKER_HOSTS`、path resolution、CLI/currentHost validation、host adapter smoke 或 managed manifest 读取逻辑，优先沿用现有 Claude Code/Codex 的 shared seam，而不是给 OpenCode 加条件分支式特例。

### the agent's Discretion
- `~/.config/opencode` 与 `~/.opencode` 的检测顺序、是否在缺省根不存在时降级到另一个根，由 the agent 按最小惊讶原则决定。
- OpenCode shell 的具体目录结构、runner 文件名与 adapter 断言细节，由 the agent 复用现有 host shell pattern 后决定，只要不偏离 Codex-style thin shell。
- Phase 5 为了 compile-through 或 no-regression 而对 `doctor` / `remove` 做到什么最小程度，由 the agent 判断；但不得在 repo truth 上提前宣称完整 parity 已完成。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and active requirements
- `.planning/PROJECT.md` — v1.1 的第三宿主目标、thin-shell/shared-home/proof-reuse 总约束
- `.planning/REQUIREMENTS.md` — Phase 5 对应的 `HOST-01`、`HOST-02`
- `.planning/ROADMAP.md` — Phase 5 goal、success criteria、以及与 Phase 6 的 sequencing
- `.planning/STATE.md` — 当前 active phase 与 workflow state

### Prior phase decisions that must remain locked
- `.planning/phases/04-lock-operator-truth-and-expansion-readiness/04-CONTEXT.md` — canonical operator truth、third-host readiness contract、以及 “host shells stay thin” 约束
- `.planning/phases/03-harden-runtime-and-verification/03-CONTEXT.md` — shared-home/lifecycle/runner hardening 的 fail-closed 边界
- `.planning/phases/02-generalize-family-proofs/02-CONTEXT.md` — `familyProofs` 与 second proven family 的现有 canonical truth
- `.planning/phases/01-prove-the-qa-hero-loop/01-CONTEXT.md` — website QA hero lane 与 installed-shell first impression 约束

### Third-host and lifecycle contracts
- `docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md` — 第三宿主最低 readiness bar、non-goals 与 verification checklist
- `docs/superpowers/specs/2026-03-28-broker-auto-router-design.md` — host-agnostic broker envelope、future OpenCode compatibility 与 thin host shell boundary
- `docs/superpowers/specs/2026-03-27-npx-install-design.md` — shared-home lifecycle、host shell ownership、published `update` / `doctor` / `remove` contract
- `docs/superpowers/specs/2026-03-30-broker-owned-downstream-capabilities.md` — downstream ownership stays broker-side，不把具体选择退回 host shell

### Current operator truth surfaces
- `README.md` — English support matrix、lifecycle wording、OpenCode 现状叙事
- `README.zh-CN.md` — Chinese support matrix、lifecycle wording、OpenCode 现状叙事
- `TODOS.md` — “Add OpenCode as the third thin host shell” backlog truth
- `STATUS.md` — canonical repo truth / shipped status surface
- `src/core/operator-truth.ts` — 当前 supported/deferred hosts 与 lifecycle wording 的 typed contract
- `tests/shared-home/operator-truth-parity.test.ts` — operator truth surface fail-closed parity bar

### Host shell and lifecycle seams
- `src/core/types.ts` — `BROKER_HOSTS`、host support spec、host-specific install directories 与 currentHost typing
- `src/core/envelope.ts` — broker envelope host/invocationMode validation contract
- `src/cli.ts` — currentHost resolution 与 CLI-side host honesty
- `src/shared-home/paths.ts` — host root detection、default install dirs 与 override flags
- `src/shared-home/update.ts` — shared-home update/install orchestration、host attach path、peer-surface handling
- `src/shared-home/doctor.ts` — current lifecycle truth surface；Phase 5 需避免误导但不追求 full parity
- `src/shared-home/remove.ts` — current host detach path；Phase 5 只允许最小一致性改动
- `src/shared-home/ownership.ts` — managed shell manifest contract
- `src/hosts/claude-code/install.ts` — Claude Code host shell install pattern
- `src/hosts/codex/install.ts` — Codex-style thin shell install pattern，是 OpenCode Phase 5 的主要复用参照
- `src/hosts/claude-code/adapter.ts` — Claude host adapter assertion pattern
- `src/hosts/codex/adapter.ts` — Codex host adapter assertion pattern
- `src/hosts/skill-markdown.ts` — installed shell copy single source of truth

### Existing proof rails and regressions
- `tests/hosts/host-shell-install.test.ts` — installed shell wording/layout/order regression bar
- `tests/e2e/shared-home-smoke.test.ts` — shared-home attach/smoke 与 cross-host reuse 基线
- `tests/e2e/host-auto-routing-smoke.test.ts` — installed host adapters 的 broker boundary smoke
- `tests/shared-home/update-lifecycle.test.ts` — published update path 的 host install/repair regression
- `tests/shared-home/doctor.test.ts` — current doctor/adoption truth bar，提醒 Phase 5 不要过度宣称
- `tests/shared-home/host-surface-management.test.ts` — managed host shell/peer-surface 规则

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hosts/codex/install.ts` 已经提供了最接近目标的第三宿主模板：单一 `SKILL.md` + runner + managed manifest，且通过 shared `skill-markdown` 生成 coarse broker-first copy。
- `src/shared-home/paths.ts`、`src/shared-home/update.ts`、`src/shared-home/remove.ts`、`src/shared-home/doctor.ts` 已经把宿主 lifecycle 建模成枚举式 host set；OpenCode 接入应复用这条 shared seam，而不是旁路。
- `src/shared-home/ownership.ts` 已经定义 managed shell manifest，可直接承接 OpenCode 的 brokerHome ownership，而不需要新 manifest 类型。
- `tests/hosts/host-shell-install.test.ts` 与 `tests/e2e/shared-home-smoke.test.ts` 已经锁住 installed shell copy 和 shared-home attach truth，是新增第三宿主最直接的 proof 基线。

### Established Patterns
- host identity 由 `src/core/types.ts` 集中定义，`src/cli.ts` / `src/core/envelope.ts` / lifecycle modules 都依赖这套 typed truth；第三宿主不能只改 docs 或只改 installer。
- installed shell copy 统一从 `src/hosts/skill-markdown.ts` 生成；如果 OpenCode 复制一份专属文案，repo truth 很快会再次漂移。
- shared-home lifecycle 倾向通过同一组 `update` / `doctor` / `remove` command surface 管理宿主壳；新增宿主应该挂到同一 published path，而不是新增 OpenCode-only operator path。
- 现有 smoke/doctor/update tests 假设宿主集合是显式、有限、typed 的；新增第三宿主后，planner 需要优先锁住 no-regression，而不是立即追求广泛新功能。

### Integration Points
- Host identity and path plumbing: `src/core/types.ts`, `src/core/envelope.ts`, `src/cli.ts`, `src/shared-home/paths.ts`
- OpenCode thin shell install/adapter: 新的 `src/hosts/opencode/*` 与现有 Claude/Codex installer/adapter pattern
- Shared-home attach path: `src/shared-home/update.ts`, `tests/shared-home/update-lifecycle.test.ts`
- Operator truth flip: `src/core/operator-truth.ts`, `README.md`, `README.zh-CN.md`, `TODOS.md`, `STATUS.md`, `tests/shared-home/operator-truth-parity.test.ts`
- No-regression proof: `tests/hosts/host-shell-install.test.ts`, `tests/e2e/shared-home-smoke.test.ts`, `tests/e2e/host-auto-routing-smoke.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “Ship OpenCode like Codex first, not like Claude plugin.” 先用最薄、最少专用逻辑的接入形态把第三宿主落地。
- “Support matrix flips only when attach is real.” 一旦真实 shipping path 存在，就更新 operator truth；不能再继续把 OpenCode 挂在 deferred，但也不能把 Phase 6 的 lifecycle/proof parity 偷渡成已完成。
- “No third runtime.” OpenCode 的价值是证明 shared-home / proof-reuse 真的能承接第三宿主，不是复制一套 host-local 最优解。
- 用户对灰区没有追加修正，接受 the agent 的推荐默认值作为本 phase 的锁定决策。

</specifics>

<deferred>
## Deferred Ideas

- OpenCode 的 `doctor` / `remove` / `adoptionHealth` / `familyProofs` / manual-recovery / proof-reuse 完整 parity — 留到 Phase 6
- OpenCode `invocationMode: auto` 或任何宿主特有入口智能化 — 不属于 Phase 5
- OpenCode-only plugin/container/runtime 包装 — 明确不做
- 把第三宿主模板进一步抽象成未来 `HOST-04` 的通用宿主模板系统 — 后续 host expansion phase 再做

</deferred>

---
*Phase: 05-ship-the-opencode-thin-host-shell*
*Context gathered: 2026-04-23*
