# Requirements: skills-broker

**Defined:** 2026-04-22
**Core Value:** 用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## v1 Requirements

### Default Entry

- [x] **ENTRY-01**: 新用户在 `README.md`、`README.zh-CN.md` 和安装后的宿主说明中，都能在首屏明确知道 `website QA` 是第一条推荐尝试路径
- [x] **ENTRY-02**: 快速开始必须给出一条可复制的 website QA 请求，以及 `INSTALL_REQUIRED -> install -> rerun -> doctor` 的明确顺序
- [ ] **ENTRY-03**: `skills-broker doctor` 能用 family-specific 证明面解释默认入口是否健康，而不是只输出通用计数

### Routing And Reuse

- [x] **ROUTE-01**: 当 website QA 的最佳下游能力尚未安装时，broker 必须返回明确的 `INSTALL_REQUIRED`，而不是模糊失败或错误 family
- [x] **ROUTE-02**: 在安装完成后，重跑同一句 website QA 请求必须能得到 `HANDOFF_READY`
- [x] **ROUTE-03**: website QA 的已验证赢家与证明状态必须可在 Claude Code 与 Codex 之间复用，而不需要重新发现
- [ ] **ROUTE-04**: 明确要求“把网页转成 markdown”的请求必须能进入 `web_content_to_markdown` family，且不回归 website QA 的 hero lane 语义

### Runtime Hardening

- [ ] **HARD-01**: 共享 broker home 与宿主 runner 在遇到包含空格、引号、`$` 或其他 awkward path 的安装路径时，要么安全工作，要么给出可操作诊断
- [ ] **HARD-02**: shared-home repair、rollback、proof rail unreadable 与 advisory persistence failure 等高风险路径，必须有测试覆盖或结构化 degraded outcome
- [ ] **HARD-03**: `README.md`、`README.zh-CN.md`、`TODOS.md` 与 `STATUS.md` 的 operator-facing 叙事必须保持一致，不允许默认入口、支持矩阵或 lifecycle 命令漂移
- [ ] **HARD-04**: 本地贡献者必须能稳定运行验证命令，或者在依赖损坏时得到确定性的修复/重装指导

### Growth Readiness

- [ ] **GROW-01**: proof family / semantic metadata 需要支持新增 proven family，而不重开 query-native 或 package-vs-leaf 迁移
- [ ] **GROW-02**: 当前宿主契约需要继续保持 thin-shell 边界，为未来第三个宿主壳保留接入空间，但不在本轮直接实现 OpenCode

## v2 Requirements

### Host Expansion

- **HOST-01**: 增加 OpenCode 作为第三个 thin host shell，并继续复用同一套 shared broker home
- **HOST-02**: 为新增宿主提供与 Claude Code / Codex 对等的 install、doctor、remove 与 proof rail 体验

### Capability Surface

- **CAP-01**: 在 website QA 与 web markdown 之外，继续增加更多被证据证明过的 default-entry families
- **CAP-02**: 增加更多 broker-owned workflow，而不只保留 `idea-to-ship` 这一条主链路
- **CAP-03**: 让 MCP 发现默认源从演示级 seed 走向可验证、可产品化的真实 registry readiness

### Quality Infrastructure

- **QUAL-01**: 在 CI 中增加 coverage budget 或 blind-spot reporting，而不只依赖绿/红测试结果
- **QUAL-02**: 为 narrative docs parity 增加自动检查，至少覆盖支持矩阵、默认入口与 lifecycle 命令

## Out of Scope

| Feature | Reason |
|---------|--------|
| 现在就接 OpenCode | 当前 active milestone 先证明默认入口与 proof loop，宿主扩展排在后面 |
| 重新设计 broker 主路由为 embeddings / model classifier | 当前产品方向强调 deterministic、metadata-driven、可解释 proof |
| 把 broker 变成 marketplace 或直接执行下游 skill 的平台 | 产品定位仍然是运行时能力决策层与 handoff 协调层 |
| 在默认入口闭环落地前泛化 maintained-family schema | 会在没有 product consumer 的情况下提前增加结构复杂度 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENTRY-01 | Phase 1 | Complete |
| ENTRY-02 | Phase 1 | Complete |
| ENTRY-03 | Phase 2 | Pending |
| ROUTE-01 | Phase 1 | Complete |
| ROUTE-02 | Phase 1 | Complete |
| ROUTE-03 | Phase 1 | Complete |
| ROUTE-04 | Phase 2 | Pending |
| HARD-01 | Phase 3 | Pending |
| HARD-02 | Phase 3 | Pending |
| HARD-03 | Phase 4 | Pending |
| HARD-04 | Phase 3 | Pending |
| GROW-01 | Phase 2 | Pending |
| GROW-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after Phase 1 execution*
