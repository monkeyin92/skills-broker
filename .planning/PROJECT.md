# skills-broker

## What This Is

`skills-broker` 是一个安装一次、跨宿主复用的共享 broker runtime，当前服务于 Claude Code 和 Codex 这两个薄宿主壳。它让用户只表达结果，由 broker 负责归一化请求、发现并排序能力候选、准备赢家，并把已验证的能力与证明状态跨宿主复用起来。

当前产品叙事已经收口到一个清晰的默认入口：先把 `website QA` 做成最容易上手、最容易被证明、最容易复用的第一条 hero lane，同时继续扩展 broker 作为运行时能力决策层的长期价值。

## Core Value

用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## Requirements

### Validated

- ✓ 共享 broker home 已经可以在 Claude Code 与 Codex 之间安装一次并复用运行时、缓存与路由历史 — existing
- ✓ broker 已经能接收 coarse broker-first 请求，并在本地 skills、MCP 候选、broker-owned workflow 之间做统一发现、排序与 handoff — existing
- ✓ broker 已经有结构化结果面，包括 `HANDOFF_READY`、`INSTALL_REQUIRED`、`WORKFLOW_STAGE_READY`、`UNSUPPORTED_REQUEST`、`AMBIGUOUS_REQUEST` 等 — existing
- ✓ acquisition memory、verified downstream manifests、routing traces 与 `doctor` 已经形成跨宿主复用与 operator proof 的基础设施 — existing
- ✓ website QA、requirements analysis、investigation、web markdown 与 `idea-to-ship` 等路径已有不同成熟度的运行时支持 — existing

### Active

- [ ] 把 `website QA` / `web_content_to_markdown` 做成 operator 可见、host 首屏可感知、`doctor` 可证明的默认入口闭环
- [ ] 在保持 adoption health 为绿色真相的前提下，继续增强 discovery/install reuse flywheel，而不是重新打开已完成的 query-native 与 package-vs-leaf 迁移
- [ ] 缩小 shared-home / routing 高 blast radius 模块的风险，补上高优先级测试盲区与 operator-facing degraded truth
- [ ] 在不拆分共享 runtime 的前提下，为更多 proven family 与未来第三个薄宿主壳保留清晰扩展面

### Out of Scope

- 当前阶段直接接入 OpenCode — 仍然是后续薄宿主扩展，不属于这轮初始化后的主战场
- 在 `website QA` 默认入口闭环没被 operator-visible proof 锁住之前，先做更泛化的 maintained-family semantic contract 美化 — 明确延后
- 引入 embeddings、语义搜索或模型驱动分类来替换当前 deterministic / metadata-driven 方向 — 不符合当前产品约束
- 把 `skills-broker` 做成 marketplace、聊天产品或直接执行下游能力的系统 — 产品定位仍然是运行时能力决策层

## Context

这个仓库已经是一个 brownfield TypeScript/Node 项目，具备共享 broker home、生命周期 CLI、跨宿主复用、broker-owned workflow runtime 与较完整的测试面。仓库内的 `README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md` 以及 `docs/superpowers/` 已经写明了当前产品阶段与下一步方向。

当前 repo truth 很明确：产品正处于“保持 adoption health 为绿色，同时把 discovery/install 做成更强复用飞轮”的阶段。最清楚的 first-use path 是 `website QA`，最值钱的当前工作是让这条默认入口从文案 truth 变成 operator-visible truth，并把同一套 proof loop 推广到 `web_content_to_markdown` 等已存在 family。

代码地图显示当前的主要工程风险不在“有没有核心架构”，而在“高 blast radius 模块过大、proof/doc truth 可能漂移、shell 路径与回滚分支不够硬、部分 smoke 仍然是演示级而不是产品级证据”。这决定了初始化后的 roadmap 应该围绕 trust hardening、proof closure、runtime hardening 与 growth readiness 展开。

## Constraints

- **Tech Stack**: TypeScript + Node ESM + Vitest + file-backed shared-home state — 当前实现与测试基础必须被延续，而不是被重写
- **Supported Hosts**: 当前支持矩阵必须保持诚实，只写 Claude Code 与 Codex — 因为这是 repo 文档与运行时的一致 truth
- **Architecture**: host shell 只能做 coarse broker-first 边界判断，不能在入口处细粒度选择 skill/package — 具体赢家必须由 broker 选
- **Sequencing**: 不重新开启 query-native migration 与 package-vs-leaf identity migration — 这些已经 shipped，应当视为已定基础
- **Operator Trust**: README、README.zh-CN、installed shell copy、`doctor`、`STATUS.md` 与测试必须讲同一个产品故事，否则默认入口叙事无效

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 用仓库现有文档与代码地图作为初始化的 source of truth | 用户已经在 repo 中持续维护产品真相，重复做 greenfield 式问询只会制造噪音 | — Pending |
| 以 brownfield 方式初始化项目，而不是重写“项目是什么” | 当前代码已经交付出真实能力，初始化应围绕“已有能力 + 当前焦点 + 下一步阶段”建立上下文 | — Pending |
| 当前 roadmap 先聚焦默认入口闭环、proof family 泛化、runtime hardening 与 growth readiness | 这四件事同时覆盖了 README 当前产品阶段、TODOS 活跃项与 codebase concerns 的高优先级缺口 | — Pending |
| 初始化配置采用保守可审阅默认值：`interactive`、`coarse`、`parallel`、提交 planning docs、跳过额外 research | repo 内部真相已经足够清晰，这一轮需要的是可执行项目骨架，而不是再做一轮外部域研究 | — Pending |

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
*Last updated: 2026-04-22 after initialization*
