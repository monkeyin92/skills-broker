# skills-broker

## What This Is

`skills-broker` 是一个安装一次、跨宿主复用的共享 broker runtime，当前已在 Claude Code、Codex、OpenCode 三个薄宿主壳上完成 published lifecycle 与 proof/reuse parity。它让用户只表达结果，由 broker 负责归一化请求、发现并排序能力候选、准备赢家，并把已验证的能力、proof rail 与 reuse state 跨宿主复用起来。

v1.2 已经把 canonical shipping truth 收口到 repo-owned `release:gate` / `release:promote` 与 publish automation 上。当前阶段的重点转回默认入口产品面：让 `website QA` 不只是“已经存在的一条 hero lane”，而是在真实宿主里更容易命中、复用、并持续被证明仍然可信。

## Core Value

用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## Current State

- **Latest shipped milestone:** `v1.2 Release Truth And Shipping Closure`（2026-04-23）
- **Supported hosts:** Claude Code、Codex、OpenCode
- **Hero lane:** `website QA`
- **Proven families:** `web markdown`（second）、`social markdown`（next）
- **Broker-owned workflows:** `idea-to-ship`、`investigation-to-fix`
- **Trust posture:** canonical release truth 已闭环到 `release:gate` / `release:promote`，当前产品风险转向“真实宿主里会不会稳定把 `website QA` 当第一跳”

## Current Milestone: v1.3 Website QA Default-Entry Confidence

**Goal:** 把 `website QA` 做成更可信的默认入口，让第一次进来的用户更容易直接命中这条 lane，同时让 maintainer 更容易证明这条 QA-first story 在真实宿主里持续成立。

**Target features:**

- 提升真实会话里的 broker-first 命中率与 coarse QA 自动路由稳定性，让明显的 `website QA` 请求更常在宿主侧进入 broker
- 把 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse -> repeat usage` 收成更强的 repo-owned proof loop，证明 QA-first 不是一次性 demo
- 让 README、README.zh-CN、host shell、`doctor`、`STATUS.md` 与 `TODOS.md` 继续讲同一份 QA-first operator story，而且不打破 coarse broker-first boundary

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

- [ ] 提升真实宿主里的 `website QA` broker-first 命中率与自动路由稳定性，同时继续守住 coarse host boundary
- [ ] 把 `website QA` 的 install/verify/reuse/repeat-usage 证据链做成更可信的 repo-owned proof loop，而不只是一条第一次成功的 smoke
- [ ] 保持 README、README.zh-CN、host shell、`doctor`、`STATUS.md` 与 `TODOS.md` 的 QA-first operator truth 不漂移

### Out of Scope

- 重新打开 release truth / shipped-proof promotion 问题定义 — v1.2 已经闭环，当前更值钱的是默认入口可信度
- 在 `website QA` 默认入口闭环前重新开启第四宿主或新增 proven family / workflow 扩展 — 会稀释当前最值钱的信号
- 重新打开 query-native migration、package-vs-leaf identity migration、或 maintained-family schema 泛化 — 只有当现有 sequencing 明显失效时才值得重提
- 让安装后的 host shell 在入口处细粒度选择具体 skill / package / MCP winner — 它只能判断 `broker_first` / `handle_normally` / `clarify_before_broker`
- 引入 embeddings、语义搜索或模型驱动分类来替换当前 deterministic / metadata-driven 方向 — 不符合当前产品约束
- 把 `skills-broker` 做成 marketplace、聊天产品或直接执行下游能力的系统 — 产品定位仍然是运行时能力决策层

## Context

这个仓库仍然是一个 brownfield TypeScript/Node 项目，但当前 repo truth 已经比 v1.0 明确得多：shared broker home、三宿主 thin host shell、三条 proven family、两条 broker-owned workflow、registry-ready MCP explainability 与 canonical operator truth 已经互相咬合成一套可验证产品面。

v1.2 已经把 release truth 闭环到 repo-owned automation 上，所以当前最高价值问题不再是“ship/release 会不会说同一个故事”，而是“真实宿主会不会稳定把 `website QA` 当第一跳，以及这件事能不能被 repo-owned proof 持续证明”。README、host shell、`doctor` 与 family proof 已经把 QA-first 心智说出来了，但 hit-rate design、routing concerns 与 bilingual/operator truth 风险都说明：这条默认入口还需要更硬的命中率、repeat-usage evidence 与 drift guardrail。

因此 v1.3 不扩 capability surface，也不重开旧迁移主题。它要把现有默认入口从“已证明的一条 hero lane”继续收成“真实宿主里更容易命中、重复使用、更容易被 maintainer 证明仍在工作”的可信产品句子。

## Constraints

- **Tech Stack**: TypeScript + Node ESM + Vitest + file-backed shared-home state — 当前实现与测试基础必须被延续，而不是被重写
- **Architecture**: host shell 只能做 coarse broker-first 边界判断，不能在入口处细粒度选择 skill/package — 具体赢家必须由 broker 选
- **Hero Lane**: `website QA` 继续作为唯一默认入口 hero lane；`web markdown` 与 `social markdown` 仍是后续 proven loops，而不是并列第一步
- **Proof Surface**: 命中率、misroute/fallback、verify/reuse proof 必须尽量复用 routing traces、acquisition memory、verified manifests、`doctor` 与 repo-owned eval/CI rails — 不再发明平行 telemetry 故事
- **Release Truth**: `release:gate` / `release:promote` 已经是 canonical shipping truth，除非发现默认入口闭环被它们直接阻塞，否则不重开这一主题
- **Sequencing**: 在默认入口可信度闭环前，不重新开启 host expansion、更多 proven family/workflow 扩展、或抽象优先的 migration tail 讨论
- **Operator Trust**: README、README.zh-CN、`STATUS.md`、`TODOS.md`、installed shell copy 与 `doctor` 输出必须继续讲同一个产品故事

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 把 `website QA` 固定为唯一 hero lane，直到它被 operator-visible proof 真正锁住 | 避免在没有第一条强默认入口前把产品叙事摊平 | ✓ Good |
| 把 `familyProofs` 固定为 canonical doctor surface，`websiteQaLoop` 只保留兼容 alias | 泛化 proof surface，但不打破既有 strict gate 消费者 | ✓ Good |
| 宿主 runner 在运行时从 managed manifest 解析 `brokerHome` | 避免绝对路径与 awkward install path 继续成为高 blast-radius 回归源 | ✓ Good |
| repo docs / backlog / status / installed shell 必须复用同一份 operator truth contract | 让支持矩阵、hero lane、second proven family 与 lifecycle wording 不再人工漂移 | ✓ Good |
| future third host 必须继续保持 thin-shell、shared-home 与 proof/reuse state 复用 | 为扩展设硬约束，而不是先开例外再补架构 | ✓ Good |
| release automation 必须直接复用现有 CI trust rails，而不是再引入 release-only evaluator | 避免 CI truth 与 release truth 分叉，并让 ship 决策保持可审计 | ✓ Good |
| `shipped_local -> shipped_remote` promotion 必须是 repo-owned、显式且 fail-closed 的动作 | 防止 shipped truth 被静默升级或重新回到 milestone 末尾人工补账 | ✓ Good |
| 默认入口可信度要先靠更强的命中率与 repeat-usage proof 锁住，再扩更多 surface | 当前 bottleneck 是 habit formation，不是 capability breadth | — Pending |
| QA-first wording 必须跟 coarse broker-first boundary 一起被证明，而不是靠 README 单点表述维持 | 否则文案会漂移回“功能列表”，宿主也容易偷做细粒度判断 | — Pending |

## Next Milestone Goals

1. 让真实宿主里的 `website QA` broker-first 命中率与自动路由稳定性更可信，而且不打破 coarse host boundary。
2. 把 `website QA` 的 install/verify/reuse/repeat-usage 证据链补强成 repo-owned default-entry proof，而不是只靠第一次成功的演示回路。
3. 保持 README、README.zh-CN、host shell、`doctor`、`STATUS.md` 与 `TODOS.md` 的 QA-first operator story 单源一致。

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
*Last updated: 2026-04-23 after starting v1.3 milestone*
