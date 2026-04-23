# skills-broker

## What This Is

`skills-broker` 是一个安装一次、跨宿主复用的共享 broker runtime，当前已在 Claude Code 与 Codex 这两个薄宿主壳上完成 v1.0 级产品闭环。它让用户只表达结果，由 broker 负责归一化请求、发现并排序能力候选、准备赢家，并把已验证的能力、proof rail 与 reuse state 跨宿主复用起来。

v1.0 之后，这个项目不再只是“会路由能力”的 broker，而是一个已经拥有明确默认入口、第二条 proven family、runtime hardening 与未来第三宿主扩展契约的运行时决策层。

## Core Value

用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## Current State

- **Shipped milestone:** `v1.0 Default-Entry Trust And Growth Readiness`（2026-04-23）
- **Supported hosts:** Claude Code、Codex
- **Hero lane:** `website QA`
- **Second proven family:** `web markdown`
- **Runtime posture:** awkward path 安装、advisory persistence、rollback/manual-recovery、以及 contributor verification 已具备更硬的 fail-closed / deterministic truth
- **Expansion posture:** OpenCode 仍然 deferred，但 third-host readiness contract 已明确要求 thin host shell、shared broker home、published lifecycle parity 与 proof/reuse state 复用

## Current Milestone: v1.1 Third-Host Expansion And Trust Scaling

**Goal:** 在不打破 thin-shell / shared-home / proof-reuse 边界的前提下，把 OpenCode 落成真正的第三宿主，并把 proven surface 与 CI trust guardrails 推进到可持续扩展状态。

**Target features:**

- OpenCode thin host shell 正式落地，并与现有 shared broker home、broker-first contract、lifecycle surface 保持一致
- 在 `website QA` / `web markdown` 之外继续增加 evidence-backed default-entry family、broker-owned workflow 与 registry-ready MCP discovery
- 把 docs parity、coverage blind-spot reporting 与质量门禁推进到 CI 级 guardrail

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

### Active

- [ ] 把 OpenCode readiness contract 推进成真正的第三个 thin host shell，同时继续复用 shared broker home 与 coarse broker-first boundary
- [ ] 在 `website QA` 与 `web markdown` 之外，增加更多 evidence-backed default-entry families、broker-owned workflows 与 registry-ready MCP discovery
- [ ] 把 coverage budget / blind-spot reporting 与 narrative docs parity 提升到 CI 级质量门禁

### Out of Scope

- 在不满足 readiness contract 的情况下直接接入 OpenCode — 仍然是后续薄宿主扩展，不属于当前安全扩展路径
- 在没有明确 product consumer 的前提下，为 maintained-family schema 做抽象优先的“美化式泛化” — 明确延后
- 引入 embeddings、语义搜索或模型驱动分类来替换当前 deterministic / metadata-driven 方向 — 不符合当前产品约束
- 把 `skills-broker` 做成 marketplace、聊天产品或直接执行下游能力的系统 — 产品定位仍然是运行时能力决策层

## Context

这个仓库仍然是一个 brownfield TypeScript/Node 项目，但在 v1.0 之后，shared broker home、Claude Code / Codex thin host shell、familyProofs、verified downstream manifests、routing traces、operator truth parity 与 third-host readiness contract 已经形成一组相互咬合的产品真相。

当前 repo truth 也比初始化时更清晰：默认入口已经不是文案承诺，而是被 tests、installed shell、doctor 与 integration proof 锁住的 `website QA` hero lane。`web markdown` 也已经从“可用 lane”提升到第二条 proven family。下一轮工作的价值不再是证明这些东西存在，而是扩大 proven surface，同时保持 thin-shell、shared-home 与 proof/reuse state 的架构边界不被扩展需求击穿。

主要工程风险已经从“默认入口闭环不够硬”迁移为三类：第三宿主扩展时是否还能守住既有边界、更多 proven families / workflows 会不会稀释可解释性、以及质量基础设施能否在 CI 层持续收紧 blind spots。

当前 milestone 直接承接这些风险：先把 OpenCode 从 deferred contract 变成真正 shipping 的第三宿主，再把新增 family / workflow / MCP registry surface 放到可验证的 trust rail 上，最后用 CI 把这些真相锁成日常回归门禁，而不是继续依赖 milestone 末尾的人工补账。

## Constraints

- **Tech Stack**: TypeScript + Node ESM + Vitest + file-backed shared-home state — 当前实现与测试基础必须被延续，而不是被重写
- **Supported Hosts**: 当前 shipping truth 仍然只写 Claude Code 与 Codex；OpenCode 只能以 deferred-but-defined 的方式出现
- **Architecture**: host shell 只能做 coarse broker-first 边界判断，不能在入口处细粒度选择 skill/package — 具体赢家必须由 broker 选
- **Sequencing**: 不重新开启 query-native migration 与 package-vs-leaf identity migration — 这些已经 shipped，应当视为基础设施而不是下一轮主题
- **Operator Trust**: README、README.zh-CN、installed shell copy、`doctor`、`STATUS.md` 与测试必须继续讲同一个产品故事，否则 hero lane / second proven family 叙事会退化
- **Expansion Discipline**: 新宿主与新 family 必须复用 shared broker home、published lifecycle surface、proof/reuse state，而不是分叉出第二套真相

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 把 `website QA` 固定为唯一 hero lane，直到它被 operator-visible proof 真正锁住 | 避免在没有第一条强默认入口前把产品叙事摊平 | ✓ Good |
| 把 `familyProofs` 固定为 canonical doctor surface，`websiteQaLoop` 只保留兼容 alias | 泛化 proof surface，但不打破既有 strict gate 消费者 | ✓ Good |
| 宿主 runner 在运行时从 managed manifest 解析 `brokerHome` | 避免绝对路径与 awkward install path 继续成为高 blast-radius 回归源 | ✓ Good |
| repo docs / backlog / status / installed shell 必须复用同一份 operator truth contract | 让支持矩阵、hero lane、second proven family 与 lifecycle wording 不再人工漂移 | ✓ Good |
| future third host 必须继续保持 thin-shell、shared-home 与 proof/reuse state 复用 | 为扩展设硬约束，而不是先开例外再补架构 | ✓ Good |

## Next Milestone Goals

1. 把 OpenCode / third-host readiness contract 转成真实实现，但不能破坏当前两宿主共享的 runtime truth。
2. 增加更多 proven families 与 broker-owned workflows，同时保持 deterministic、metadata-driven、可解释的路由方式。
3. 把 docs parity、coverage blind spots 与 verification noise 收口到更自动化的质量门禁。

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
*Last updated: 2026-04-23 after starting v1.1 milestone*
