# skills-broker

## What This Is

`skills-broker` 是一个安装一次、跨宿主复用的共享 broker runtime，当前已在 Claude Code、Codex、OpenCode 三个薄宿主壳上完成 published lifecycle 与 proof/reuse parity。它让用户只表达结果，由 broker 负责归一化请求、发现并排序能力候选、准备赢家，并把已验证的能力、proof rail 与 reuse state 跨宿主复用起来。

v1.1 之后，这个项目不再主要证明“broker 能不能工作”，而是开始收口“什么才算 shipping truth”：CI、`doctor`、`STATUS.md`、published lifecycle 与 repo docs 必须讲同一个故事，且 ship/release 流程要直接消费这套真相。

## Core Value

用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## Current State

- **Latest shipped milestone:** `v1.1 Third-Host Expansion And Trust Scaling`（2026-04-23）
- **Supported hosts:** Claude Code、Codex、OpenCode
- **Hero lane:** `website QA`
- **Proven families:** `web markdown`（second）、`social markdown`（next）
- **Broker-owned workflows:** `idea-to-ship`、`investigation-to-fix`
- **Trust posture:** CI blind-spot、narrative parity、strict repo proof gate 已经发货，但 ship/release 还没有直接消费这套 truth

## Current Milestone: v1.2 Release Truth And Shipping Closure

**Goal:** 让 ship/release 流程直接消费 CI trust truth，把发布前 gate 和发布后 `shipped_local -> shipped_remote` 提升都纳入默认闭环。

**Target features:**

- 发布前必须用 `npm run ci:blind-spot`、`npm run test:ci:narrative-parity` 与 strict repo-scoped `skills-broker doctor` 共同判定“是否可以 ship”
- 发布后要有明确的 repo-owned shipped-proof promotion 路径，把 `STATUS.md` 里的 eligible truth 从 `shipped_local` 推进到 `shipped_remote`
- publish/release automation、`STATUS.md` truth、doctor/status evaluation 与 repo docs 继续维持单一叙事，不引入第二套 release truth

## Requirements

### Validated

- ✓ 共享 broker home 已经可以在 Claude Code 与 Codex 之间安装一次并复用运行时、缓存与路由历史 — existing
- ✓ broker 已经能接收 coarse broker-first 请求，并在本地 skills、MCP 候选、broker-owned workflow 之间做统一发现、排序与 handoff — existing
- ✓ broker 已经有结构化结果面，包括 `HANDOFF_READY`、`INSTALL_REQUIRED`、`WORKFLOW_STAGE_READY`、`UNSUPPORTED_REQUEST`、`AMBIGUOUS_REQUEST` 等 — existing
- ✓ acquisition memory、verified downstream manifests、routing traces 与 `doctor` 已经形成跨宿主复用与 operator proof 的基础设施 — existing
- ✓ website QA、requirements analysis、investigation、web markdown 与 `idea-to-ship` 等路径已有不同成熟度的运行时支持 — existing
- ✓ `website QA` 已成为 README、installed host shell、routing、doctor 与 cross-host reuse 共同证明的 hero lane — v1.0
- ✓ `web_content_to_markdown` 已成为第二条 proven family，并保持与 hero lane 清晰分层 — v1.0
- ✓ shared-home / runner 高 blast-radius 风险路径已被 fail-closed 或结构化 degraded outcome 锁住 — v1.0
- ✓ repo-owned operator truth contract 与 third-host readiness contract 已经发布并被 parity tests 锁定 — v1.0
- ✓ OpenCode 已成为第三个 thin host shell，并与 Claude Code / Codex 共享 lifecycle、proof 与 reuse truth — v1.1
- ✓ `social_post_to_markdown` 已成为第三条 proven family，并保持在 hero lane / second proven family 之后的层级 — v1.1
- ✓ `investigation-to-fix` 已成为第二条 broker-owned workflow，并保留可重复的 stage / handoff truth — v1.1
- ✓ MCP discovery source 已升级成带验证元数据与 explainability 的 registry-ready advisory source — v1.1
- ✓ blind-spot reporting、narrative parity 与 strict repo proof gate 已进入 CI truth — v1.1

### Active

- [ ] 把 `ci:blind-spot`、`test:ci:narrative-parity` 与 strict repo-scoped `doctor` 变成 release automation 的默认 gate，而不是只停留在 CI 侧
- [ ] 提供显式、repo-owned 的 shipped-proof promotion flow，让 `STATUS.md` 可把 eligible truth 从 `shipped_local` 提升到 `shipped_remote`
- [ ] 保持 publish/release automation、`STATUS.md`、doctor/status 诊断与 repo docs 的 operator wording 继续讲同一个 release truth 故事

### Out of Scope

- 在 release truth 闭环完成前重新开启第四宿主或新增 proven family / workflow 扩展 — 当前更值钱的是把现有 shipping truth 收口成默认发布入口
- 把 `verify:local` 当成 shipping proof 或 release gate — 它只回答本机预检，不回答 repo 是否可发货
- 在没有明确 product consumer 的前提下，为 maintained-family schema 做抽象优先的“美化式泛化” — 当前 sequencing 仍然成立
- 引入 embeddings、语义搜索或模型驱动分类来替换当前 deterministic / metadata-driven 方向 — 不符合当前产品约束
- 把 `skills-broker` 做成 marketplace、聊天产品或直接执行下游能力的系统 — 产品定位仍然是运行时能力决策层

## Context

这个仓库仍然是一个 brownfield TypeScript/Node 项目，但当前 repo truth 已经比 v1.0 明确得多：shared broker home、三宿主 thin host shell、三条 proven family、两条 broker-owned workflow、registry-ready MCP explainability 与 canonical operator truth 已经互相咬合成一套可验证产品面。

Phase 8 已经把 blind-spot reporting、focused narrative parity 与 strict repo proof gate 接进 CI，所以当前缺口已经不在“有没有 trust rail”，而在“ship/release 有没有真正消费这些 trust rail”。同样，`STATUS.md` 里的 `shipped_local` / `shipped_remote` 区分已经存在，strict doctor 也能按 shipping ref 做 canonical evaluation，但 repo 仍缺少正式、repo-owned 的 promotion flow 去把这些 truth 从 milestone 末尾人工补账推进成默认发布动作。

因此 v1.2 的价值不是扩 capability surface，也不是继续 host expansion，而是把现有 shipping truth 收成一条闭环：发布前统一 gate，发布后统一 promotion，发布中途不再发明第二套 evaluator 或 wording。

## Constraints

- **Tech Stack**: TypeScript + Node ESM + Vitest + file-backed shared-home state — 当前实现与测试基础必须被延续，而不是被重写
- **Release Gate**: ship/release 必须复用 `npm run ci:blind-spot`、`npm run test:ci:narrative-parity` 与 strict repo-scoped `doctor` — 不允许再引入第二套 release-only truth evaluator
- **Proof Promotion**: `shipped_local -> shipped_remote` 只能由 canonical `STATUS.md` proof items 对 shipping ref 的重新评估来驱动 — 不能靠手工改字样或隐式升级
- **Verification Scope**: `verify:local` 继续只承担 contributor 机器预检职责 — 不能被 automation 冒充成 repo shipping proof
- **Architecture**: host shell 只能做 coarse broker-first 边界判断，不能在入口处细粒度选择 skill/package — 具体赢家必须由 broker 选
- **Sequencing**: 不重新开启 host expansion 与 capability-surface 扩展主题，直到 release truth 闭环落地 — 否则会稀释当前最值钱的信号
- **Operator Trust**: README、README.zh-CN、`STATUS.md`、`TODOS.md`、installed shell copy 与 release automation 输出必须继续讲同一个产品故事

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 把 `website QA` 固定为唯一 hero lane，直到它被 operator-visible proof 真正锁住 | 避免在没有第一条强默认入口前把产品叙事摊平 | ✓ Good |
| 把 `familyProofs` 固定为 canonical doctor surface，`websiteQaLoop` 只保留兼容 alias | 泛化 proof surface，但不打破既有 strict gate 消费者 | ✓ Good |
| 宿主 runner 在运行时从 managed manifest 解析 `brokerHome` | 避免绝对路径与 awkward install path 继续成为高 blast-radius 回归源 | ✓ Good |
| repo docs / backlog / status / installed shell 必须复用同一份 operator truth contract | 让支持矩阵、hero lane、second proven family 与 lifecycle wording 不再人工漂移 | ✓ Good |
| future third host 必须继续保持 thin-shell、shared-home 与 proof/reuse state 复用 | 为扩展设硬约束，而不是先开例外再补架构 | ✓ Good |
| release automation 必须直接复用现有 CI trust rails，而不是再引入 release-only evaluator | 避免 CI truth 与 release truth 分叉，并让 ship 决策保持可审计 | — Pending |
| `shipped_local -> shipped_remote` promotion 必须是 repo-owned、显式且 fail-closed 的动作 | 防止 shipped truth 被静默升级或重新回到 milestone 末尾人工补账 | — Pending |

## Next Milestone Goals

1. 把现有 CI trust rails 变成 ship/release 的默认 gate，而不是只停留在 CI 层。
2. 让 canonical `STATUS.md` 拿到正式的 shipped-proof promotion flow，结束 milestone 末尾手工补 `shipped_remote` 的做法。
3. 保持 publish automation、doctor/status、repo docs 与 operator wording 的 release truth 单源一致。

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 after starting v1.2 milestone*
