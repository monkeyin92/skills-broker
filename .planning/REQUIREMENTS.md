# Requirements: skills-broker

**Defined:** 2026-04-23
**Core Value:** 用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## v1.1 Requirements

### Host Expansion

- [ ] **HOST-01**: OpenCode 用户可以安装 `skills-broker` thin host shell，并继续复用现有 shared broker home，而不需要初始化第二套 broker runtime
- [ ] **HOST-02**: OpenCode host shell 只暴露 coarse broker-first boundary（`broker_first` / `handle_normally` / `clarify_before_broker`），不在宿主入口层泄露 package、skill 或 MCP 选择
- [ ] **HOST-03**: OpenCode 用户可以执行与 Claude Code / Codex 对等的 `install`、`update`、`doctor`、`remove` 生命周期命令，并在 `doctor` 中看到同级 proof / reuse truth

### Capability Surface

- [ ] **CAP-01**: 在 `website QA` 与 `web markdown` 之外，至少新增一条有 install -> verify -> cross-host reuse 证据的 default-entry family
- [ ] **CAP-02**: 除 `idea-to-ship` 之外，至少新增一条 broker-owned workflow 成为正式 shipped path，并保留可重复的 stage / handoff truth
- [ ] **CAP-03**: MCP discovery source 需要从演示级 seed 提升为带验证元数据的 registry-ready source，使 broker 能解释为什么推荐某个 MCP

### Quality Infrastructure

- [ ] **QUAL-01**: CI 必须输出 coverage budget 或 blind-spot report，明确指出高风险 runtime / proof surfaces 是否仍有未覆盖区域
- [ ] **QUAL-02**: narrative docs parity 检查必须进入 CI，至少覆盖支持矩阵、hero lane / proven family hierarchy 与 lifecycle commands

## Future Requirements

### Host Expansion

- **HOST-04**: 新宿主扩展应能模板化复用 OpenCode 的安装、runner、proof rail 与 lifecycle 契约，而不是每接一个宿主都重做一套集成

### Capability Surface

- **CAP-04**: 新 proven families 的接入不应要求重写 routing core，而应继续依赖 metadata-driven、可解释的 broker contract
- **CAP-05**: MCP registry readiness 需要继续向真实生态集成推进，包括 freshness、health 与 trust scoring

### Quality Infrastructure

- **QUAL-03**: milestone shipping 前的 verify / ship 流程应能自动利用 CI 结果，而不是只依赖本地 spot-check 和 phase-level verification

## Out of Scope

| Feature | Reason |
|---------|--------|
| 在 OpenCode shipping 前继续做 broad semantic contract 美化 | 当前更值钱的是把第三宿主与新 surface 做成可验证产品真相 |
| 引入 embeddings、语义搜索或模型分类来替换当前 deterministic / metadata-driven routing | 不符合当前产品方向与 proof-first 可解释性约束 |
| 把 broker 变成 marketplace 或直接执行下游能力的平台 | 产品定位仍然是运行时能力决策层与 handoff 协调层 |
| 一次 milestone 同时接多个新宿主 | 风险过高，会让 shared-home / lifecycle / proof-reuse 真相一起失焦 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOST-01 | Phase 5 | Pending |
| HOST-02 | Phase 5 | Pending |
| HOST-03 | Phase 6 | Pending |
| CAP-01 | Phase 7 | Pending |
| CAP-02 | Phase 7 | Pending |
| CAP-03 | Phase 7 | Pending |
| QUAL-01 | Phase 8 | Pending |
| QUAL-02 | Phase 8 | Pending |

**Coverage:**

- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after initial definition*
