# skills-broker

## What This Is

`skills-broker` 是一个安装一次、跨宿主复用的共享 broker runtime，当前已在 Claude Code、Codex、OpenCode 三个薄宿主壳上完成 published lifecycle 与 proof/reuse parity。它让用户只表达结果，由 broker 负责归一化请求、发现并排序能力候选、准备赢家，并把已验证的能力、proof rail 与 reuse state 跨宿主复用起来。

v1.2 已经把 canonical shipping truth 收口到 repo-owned `release:gate` / `release:promote` 与 publish automation 上，v1.3 把 `website QA` 的 route confidence、repeat-usage proof 与 operator truth 收成一条可信的 default-entry story，v1.4 再把这条 QA-first story 推进到 freshness-aware adoption signal。v1.5 则继续把这条默认入口往后延伸成可审计的 family proof loop：operator 不但知道先做 `website QA`，还能直接看见 `web markdown` 与 `social markdown` 作为后续已证明 loop 的 freshness、reuse 与下一步 guidance。v1.6 现在把注意力转向 CAP-05：在不打破 QA-first 默认入口的前提下，把 verified downstream manifests、MCP registry advisory 与 acquisition memory 收成一条更可信的 capability growth loop。

## Core Value

用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## Current State

- **Latest shipped milestone:** `v1.5 QA-First Family Proof Loop`（2026-04-24）
- **Current milestone:** `v1.6 Registry-Ready Capability Growth Loop`（started 2026-04-24）
- **Supported hosts:** Claude Code、Codex、OpenCode
- **Hero lane:** `website QA`
- **Proven families:** `web markdown`（second）、`social markdown`（next）
- **Broker-owned workflows:** `idea-to-ship`、`investigation-to-fix`
- **Trust posture:** canonical release truth、QA-first adoption signal 与 QA-first family proof loop 都已 shipped；v1.6 正在把 capability growth 的 registry/downstream trust、install/verify/reuse proof 与 operator guidance 收进同一份 repo-owned truth

## Current Milestone: v1.6 Registry-Ready Capability Growth Loop

**Goal:** 让 broker 在保持 `website QA` 默认入口与 coarse broker-first boundary 不漂移的前提下，把 verified downstream manifests、MCP registry advisory 与 acquisition memory 推进成 operator-visible 的 capability growth loop。

**Target features:**

- 强化 registry / downstream manifest 的 trust metadata、eligibility checks 与 explanation surface，让 operator 能看懂为什么某个能力被推荐、是否可安装、是否已验证
- 把 capability install / verify / reuse 的增长路径收成可审计 proof packet，并明确区分 advisory candidate、install-required candidate、verified downstream winner 与 reused capability
- 扩展 `doctor`、README / README.zh-CN、installed host shell、`STATUS.md`、`TODOS.md` 与 CI/parity rails 对 capability growth 的 guidance，且不让宿主入口细粒度选择具体 skill、package 或 workflow winner

## Latest Completed Milestone: v1.5 QA-First Family Proof Loop

**Goal achieved:** 把 `website QA` 这条 hero lane 延伸成一条可审计、可刷新、可复用的 family proof loop，让 operator 先看到 QA-first 默认入口，再自然看到 `web markdown` 与 `social markdown` 作为下一步已证明路径。

**Delivered features:**

- 已把 `website QA -> web markdown -> social markdown` 的 hierarchy 与 next-loop guidance 收成 README、README.zh-CN、generated host shell、`doctor`、`STATUS.md` 与 `TODOS.md` 共享的 canonical operator truth
- 已让 shared-home / `doctor` 直接输出 `familyLoopSignals`，让 maintainer 不用翻 raw trace 就能看懂三段 loop 的 freshness、reuse 与 sequence-aware refresh action
- 已把 docs、installed host shell、`STATUS.md`、`TODOS.md`、parity suite 与 CI trust rails 锁到同一份 QA-first family-loop packet wording，并在 drift 时 fail closed

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
- ✓ `website QA` 的 recent broker-first hits、repeat usage、cross-host reuse 与 host coverage 已被收成 repo-owned adoption signal，而不是只剩历史成功痕迹 — v1.4 Phase 15
- ✓ shared-home adoption health、`doctor` 与 `STATUS.md` 现在能区分 active / stale / missing，并指出下一步 refresh action — v1.4 Phase 16
- ✓ canonical `STATUS.md`、milestone audit 与 CI trust rails 现在消费同一份 website QA adoption packet，并对 wording / counts / freshness drift fail closed — v1.4 Phase 17
- ✓ QA-first family hierarchy 与 post-QA next-loop guidance 现在已在 README、README.zh-CN、generated host shell、`doctor` text、`STATUS.md` 与 `TODOS.md` 上使用同一份 canonical wording — v1.5 Phase 18
- ✓ `doctor` 与 shared-home surfaces 现在会把 `website QA`、`web markdown`、`social markdown` 的 family-loop freshness、reuse 与 sequence-aware refresh guidance 收成同一份 repo-owned packet — v1.5 Phase 19
- ✓ README、README.zh-CN、generated host shell、`STATUS.md`、`TODOS.md`、`doctor`、parity tests 与 CI trust rails 现在会一起消费同一份 QA-first family-loop packet wording，并在 drift 时 fail closed — v1.5 Phase 20

### Active

- v1.6 要把 CAP-05 做成 registry-ready capability growth loop：registry / downstream manifest trust metadata 必须可解释、install / verify / reuse proof 必须可审计、operator-facing docs / doctor / host shell / CI truth 必须保持同一份 coarse-boundary guidance。

### Out of Scope

- 重新打开 release truth / shipped-proof promotion 主题 — v1.2 已经闭环，当前更值钱的是 QA-first adoption signal
- 在 adoption signal packet 稳定前重新开启第四宿主或新增 proven family / workflow 扩展 — 会稀释当前最值钱的默认入口信号
- 重新打开 query-native migration、package-vs-leaf identity migration、或 maintained-family schema 泛化 — 当前 sequencing 仍然成立，除非 QA-first 方案被证明显著失效
- 让安装后的 host shell 在入口处细粒度选择具体 skill / package / MCP winner — 它只能判断 `broker_first` / `handle_normally` / `clarify_before_broker`
- 引入 embeddings、语义搜索或模型驱动分类来替换当前 deterministic / metadata-driven 方向 — 不符合当前产品约束
- 把 `skills-broker` 做成 marketplace、聊天产品或直接执行下游能力的系统 — 产品定位仍然是运行时能力决策层

## Context

这个仓库仍然是一个 brownfield TypeScript/Node 项目，但当前 repo truth 已经比 v1.0 明确得多：shared broker home、三宿主 thin host shell、三条 proven family、两条 broker-owned workflow、registry-ready MCP explainability 与 canonical operator truth 已经互相咬合成一套可验证产品面。

v1.3 已经把 `website QA` 这条默认入口的三层真相都补齐了：Phase 12 锁住 route confidence 与 repo-owned routing evidence，Phase 13 锁住 repeat usage / cross-host reuse proof loop，Phase 14 把 README、host shell、`STATUS.md`、`TODOS.md` 与 CI/parity guardrail 对齐到同一份 coarse-boundary operator story。v1.4 又补上 freshness / adoption / auditability 这一层：Phase 15 收 recent adoption packet，Phase 16 把 adoption health 与 refresh guidance 对齐到 freshness，Phase 17 把 `STATUS.md`、milestone audit 与 CI/parity guardrails 锁到同一份 packet。repo 不再需要靠一次 demo 或手工读 trace 去解释默认入口是否还活着。

现成可复用的 rail 也已经很多：routing traces、acquisition memory、verified downstream manifests、`doctor`、canonical `STATUS.md`、milestone audit、CI trust report、three-host shared-home smoke。v1.5 在这些既有 rail 上继续前推，而没有另起平行故事：Phase 18 把 QA-first hierarchy 与 post-QA next-loop wording 对齐成同一份 canonical operator truth；Phase 19 把三段 family loop 的 freshness / reuse / next action 收成 shared-home proof packet；Phase 20 再把这份 packet 锁进 docs、installed shell、`STATUS.md`、`TODOS.md`、parity tests 与 CI trust rails。

因此当前 repo truth 已经把默认入口 journey 从 single hero-lane proof 推进到 full family-loop truth：operator 可以直接看懂“先 QA、再 web markdown、再 social markdown”是否仍然新鲜、可复用、且由 shared broker home truth 支撑。v1.6 选择 CAP-05 作为新 bottleneck：默认入口已经可信，下一步不是马上扩第四宿主或打平更多 family，而是让 broker 的能力增长面同样具备 registry/downstream provenance、installability、verification 与 reuse proof。

## Constraints

- **Tech Stack**: TypeScript + Node ESM + Vitest + file-backed shared-home state — 当前实现与测试基础必须被延续，而不是被重写
- **Architecture**: host shell 只能做 coarse broker-first 边界判断，不能在入口处细粒度选择 skill/package — 具体赢家必须由 broker 选
- **Hero Lane**: `website QA` 继续作为唯一默认入口 hero lane；`web markdown` 与 `social markdown` 仍是后续 proven loops，而不是并列第一步
- **Proof Surface**: adoption signal、freshness、next-action guidance 必须尽量复用 routing traces、acquisition memory、verified manifests、`doctor`、`STATUS.md` 与 repo-owned CI/audit rails — 不再发明平行 telemetry 故事
- **Release Truth**: `release:gate` / `release:promote` 已经是 canonical shipping truth，除非发现 adoption signal 被它们直接阻塞，否则不重开这一主题
- **Sequencing**: 在 QA-first adoption signal 与 family loop truth 可信前，不重新开启 host expansion、更多 proven family/workflow 扩展、或 shipping-summary-heavy 的新主题
- **Operator Trust**: `doctor`、`STATUS.md`、milestone audit、README / README.zh-CN 与 installed shell copy 必须继续讲同一个 coarse-boundary 产品故事
- **Capability Growth**: registry / downstream manifest / acquisition memory 可以共同参与发现与解释，但 host shell 仍不能在入口处选择具体 winner，且 advisory registry candidate 不能越过已安装/已验证的本地赢家

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
| v1.4 优先把 QA-first proof 升级成 adoption signal，而不是先扩 capability surface 或重开 shipping truth | 当前剩余产品风险是 freshness / auditability，而不是 breadth / ship mechanics | ✓ Good |
| v1.5 继续保持 `website QA` 为唯一第一步，并把 `web markdown`、`social markdown` 收成后续 family proof loop | 现在要补的是默认入口的延伸 story，而不是把三条 family 打平或重开泛化迁移 | ✓ Good |
| QA-first hierarchy 与 post-QA next-loop guidance 必须复用同一份 canonical phrasing 跨 docs、doctor、installed shells 和 trust rails | 否则 operator 仍要靠多份 surface 自己拼 hierarchy | ✓ Good |
| v1.6 优先做 CAP-05 capability growth loop，而不是 HOST-04 / LOOP-04 / SHIP-03 | 默认入口与 family proof 已经可信，当前更高杠杆是让 broker 的下一批能力发现、安装、验证和复用同样可解释、可审计 | Active |

## Next Milestone Direction

1. v1.6 已选择 `CAP-05`：把 registry / downstream manifest / acquisition memory 推进成 registry-ready capability growth loop。
2. 继续保持 coarse broker-first boundary、shared broker home reuse 与 `website QA` 作为唯一第一步的 sequencing，直到新的 repo-owned proof 明确要求调整。
3. 除非现有 sequencing 被证明失效，否则不重开 query-native migration、package-vs-leaf identity migration、maintained-family schema 泛化或第四宿主扩展。

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
*Last updated: 2026-04-24 after starting milestone v1.6*
