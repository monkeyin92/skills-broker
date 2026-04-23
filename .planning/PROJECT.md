# skills-broker

## What This Is

`skills-broker` 是一个安装一次、跨宿主复用的共享 broker runtime，当前已在 Claude Code、Codex、OpenCode 三个薄宿主壳上完成 published lifecycle 与 proof/reuse parity。它让用户只表达结果，由 broker 负责归一化请求、发现并排序能力候选、准备赢家，并把已验证的能力、proof rail 与 reuse state 跨宿主复用起来。

v1.2 已经把 canonical shipping truth 收口到 repo-owned `release:gate` / `release:promote` 与 publish automation 上，v1.3 又把 `website QA` 的 route confidence、repeat-usage proof 与 operator truth 收成一条可信的 default-entry story。当前阶段的重点转向 v1.4：证明这条 QA-first story 不是“曾经成功过一次”，而是仍然在真实宿主里持续活着、可审计、可刷新。

## Core Value

用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## Current State

- **Latest shipped milestone:** `v1.3 Website QA Default-Entry Confidence`（2026-04-23）
- **Supported hosts:** Claude Code、Codex、OpenCode
- **Hero lane:** `website QA`
- **Proven families:** `web markdown`（second）、`social markdown`（next）
- **Broker-owned workflows:** `idea-to-ship`、`investigation-to-fix`
- **Trust posture:** canonical release truth 与 QA-first default-entry confidence 都已 shipped；当前最高价值问题变成“`website QA` 这条默认入口现在是否仍然是活的、近期被使用的、而且可被 repo-owned surfaces 审计”

## Current Milestone: v1.4 Website QA Adoption Signals

**Goal:** 把 `website QA` 默认入口从“已被证明可行”推进到“持续可审计地仍在被使用且健康”，让 maintainer 能从 repo-owned surfaces 看出最近的 default-entry habit、staleness 与下一步动作。

**Target features:**

- 把 `website QA` 的 broker-first hits、repeat usage、cross-host reuse 与 host coverage 收成近期 adoption signal，而不是只剩历史成功痕迹
- 让 shared-home adoption health 与 `doctor` / `STATUS.md` 能区分 active、stale、missing 这三种 QA-first 状态，并明确指出下一步 refresh action
- 让 canonical `STATUS.md`、milestone audit 与 CI trust rails 消费同一份 adoption packet，而不是让 maintainer 重新手工拼 trace / counters

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
- ✓ 支持宿主里的 `website QA` broker-first 命中率、近邻 fail-closed contract 与 hero-lane route evidence 已被 repo-owned tests / doctor surface 锁住 — v1.3 Phase 12
- ✓ `website QA` 的 install / verify / repeat-usage / cross-host reuse proof loop 已在三宿主 shared-home surface 上成立，且 `doctor` 已能区分 repeat usage 与 cross-host reuse — v1.3 Phase 13
- ✓ README、README.zh-CN、generated host shell、`STATUS.md`、`TODOS.md` 与 repo-native guardrails 现在共享同一份 QA-first operator truth，并明确坚持 coarse broker-first boundary — v1.3 Phase 14

### Active

- [ ] 把 `website QA` 的 route confidence / repeat usage / cross-host reuse 从一次性 proof 升级成可审计的近期 adoption signal
- [ ] 让 adoption health、`doctor` 与 `STATUS.md` 能说清这条默认入口现在是 active、stale 还是 missing，并指出下一步 refresh action
- [ ] 保持 CI trust / audit surfaces 与 shared-home truth 同步，且不借机重开 capability breadth、shipping truth 或旧 migration 主题

### Out of Scope

- 重新打开 release truth / shipped-proof promotion 主题 — v1.2 已经闭环，当前更值钱的是 QA-first adoption signal
- 在 adoption signal packet 稳定前重新开启第四宿主或新增 proven family / workflow 扩展 — 会稀释当前最值钱的默认入口信号
- 重新打开 query-native migration、package-vs-leaf identity migration、或 maintained-family schema 泛化 — 当前 sequencing 仍然成立，除非 QA-first 方案被证明显著失效
- 让安装后的 host shell 在入口处细粒度选择具体 skill / package / MCP winner — 它只能判断 `broker_first` / `handle_normally` / `clarify_before_broker`
- 引入 embeddings、语义搜索或模型驱动分类来替换当前 deterministic / metadata-driven 方向 — 不符合当前产品约束
- 把 `skills-broker` 做成 marketplace、聊天产品或直接执行下游能力的系统 — 产品定位仍然是运行时能力决策层

## Context

这个仓库仍然是一个 brownfield TypeScript/Node 项目，但当前 repo truth 已经比 v1.0 明确得多：shared broker home、三宿主 thin host shell、三条 proven family、两条 broker-owned workflow、registry-ready MCP explainability 与 canonical operator truth 已经互相咬合成一套可验证产品面。

v1.3 已经把 `website QA` 这条默认入口的三层真相都补齐了：Phase 12 锁住 route confidence 与 repo-owned routing evidence，Phase 13 锁住 repeat usage / cross-host reuse proof loop，Phase 14 把 README、host shell、STATUS、TODOS 与 CI/parity guardrail 对齐到同一份 coarse-boundary operator story。当前缺的已经不再是“能不能证明一次”，而是“这条默认入口最近是否仍然健康、仍然在被使用、如果 stale 了 repo 能不能自己说清楚”。

现成可复用的 rail 已经很多：routing traces、acquisition memory、verified downstream manifests、`doctor`、canonical `STATUS.md`、milestone audit、CI trust report、three-host shared-home smoke。v1.4 应该优先复用这些 surface 把 QA-first story 升级成 adoption signal，而不是急着扩更多 capability surface、宿主模板化，或重开 release truth 的新抽象。

因此 v1.4 的重点是 freshness / adoption / auditability，而不是 breadth。它要回答的是：`website QA` 作为默认入口，今天是否仍然在真实宿主里工作、被重复使用、跨宿主复用，而且 maintainer 能不能不翻 raw trace 就看懂这件事。

## Constraints

- **Tech Stack**: TypeScript + Node ESM + Vitest + file-backed shared-home state — 当前实现与测试基础必须被延续，而不是被重写
- **Architecture**: host shell 只能做 coarse broker-first 边界判断，不能在入口处细粒度选择 skill/package — 具体赢家必须由 broker 选
- **Hero Lane**: `website QA` 继续作为唯一默认入口 hero lane；`web markdown` 与 `social markdown` 仍是后续 proven loops，而不是并列第一步
- **Proof Surface**: adoption signal、freshness、next-action guidance 必须尽量复用 routing traces、acquisition memory、verified manifests、`doctor`、`STATUS.md` 与 repo-owned CI/audit rails — 不再发明平行 telemetry 故事
- **Release Truth**: `release:gate` / `release:promote` 已经是 canonical shipping truth，除非发现 adoption signal 被它们直接阻塞，否则不重开这一主题
- **Sequencing**: 在 QA-first adoption signal 可信前，不重新开启 host expansion、更多 proven family/workflow 扩展、或 shipping-summary-heavy 的新主题
- **Operator Trust**: `doctor`、`STATUS.md`、milestone audit、README / README.zh-CN 与 installed shell copy 必须继续讲同一个 coarse-boundary 产品故事

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
| 默认入口可信度要先靠更强的命中率与 repeat-usage proof 锁住，再扩更多 surface | 当前 bottleneck 是 habit formation，不是 capability breadth | ✓ Good |
| repeat usage 与 cross-host reuse 必须在 acquisition memory / doctor surface 上被明确拆开 | 否则 maintainer 看不出默认入口缺的是“再跑一次”还是“换个宿主再跑一次” | ✓ Good |
| QA-first wording 必须跟 coarse broker-first boundary 一起被证明，而不是靠 README 单点表述维持 | 否则文案会漂移回“功能列表”，宿主也容易偷做细粒度判断 | ✓ Good |
| v1.4 优先把 QA-first proof 升级成 adoption signal，而不是先扩 capability surface 或重开 shipping truth | 当前剩余产品风险是 freshness / auditability，而不是 breadth / ship mechanics | — Pending |

## Next Milestone Goals

1. 把 `website QA` 的 route confidence、repeat usage 与 cross-host reuse 从“已经证明过”升级成带 freshness 的 adoption signal。
2. 让 adoption health、`doctor`、`STATUS.md` 与 milestone audit 能说清这条默认入口当前是 active、stale 还是 missing，以及下一步怎么 refresh。
3. 在不重开 capability breadth、shipping truth 或旧 migration 主题的前提下，继续守住 coarse broker-first boundary 与 shared broker home reuse value。

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
*Last updated: 2026-04-23 after starting v1.4 milestone*
