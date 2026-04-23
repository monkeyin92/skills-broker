# Requirements: skills-broker

**Defined:** 2026-04-23
**Core Value:** 用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## v1.4 Requirements

### Adoption Signals

- [ ] **ADOPT-01**: Maintainer can inspect recent website QA default-entry signal from repo-owned surfaces, including broker-first hits, repeat usage, and per-host coverage, without reading raw traces
- [ ] **ADOPT-02**: Repo can distinguish active website QA adoption from stale historical proof, so one successful demo does not masquerade as a healthy current default-entry habit forever
- [ ] **ADOPT-03**: When website QA adoption signal is incomplete or stale, operator surfaces point to the next concrete refresh action instead of leaving maintainers to infer it from low-level counters

### Shared-Home Health

- [ ] **HEALTH-01**: Shared-home adoption health stays aligned with the website QA default-entry signal and does not report a misleading green/default-ready posture when the hero-lane signal is stale, missing, or contradicted
- [ ] **HEALTH-02**: Maintainer can prove website QA signal freshness and refresh transitions on the canonical Claude Code / Codex / OpenCode shared-home surface with repo-owned tests or fixtures

### Audit Truth

- [ ] **TRUST-01**: `doctor`、canonical `STATUS.md`、and CI trust surfaces summarize the same website QA adoption packet and fail closed when counts, freshness semantics, or wording drift
- [ ] **TRUST-02**: Milestone audit output can reuse the current website QA adoption packet directly instead of reconstructing freshness / repeat-usage truth from raw traces after ship

## Future Requirements

### Host Expansion

- **HOST-04**: 新宿主扩展应能模板化复用 OpenCode 的安装、runner、proof rail 与 lifecycle 契约，而不是每接一个宿主都重做一套集成

### Capability Surface

- **CAP-04**: 新 proven families 的接入不应要求重写 routing core，而应继续依赖 metadata-driven、可解释的 broker contract
- **CAP-05**: MCP registry readiness 需要继续向真实生态集成推进，包括 freshness、health 与 trust scoring

### Shipping Summary

- **SHIP-03**: 发布完成后应产出可审计的 shipping summary，把 package version、shipping ref 与 promoted proof verdict 绑定成后续 milestone audit 可复用的 repo truth

## Out of Scope

| Feature | Reason |
|---------|--------|
| 重新打开 release truth / shipped-proof promotion 主题 | v1.2 已经闭环，当前更值钱的是 QA-first adoption signal |
| 在本 milestone 里重新开启第四宿主或新增 proven family / workflow 扩展 | 当前 bottleneck 是默认入口 freshness / habit proof，不是 capability breadth |
| 重新打开 query-native migration、package-vs-leaf identity migration 或 maintained-family schema 泛化 | 当前 sequencing 仍然成立，除非 QA-first adoption signal 方案被证明显著失效 |
| 让安装后的 host shell 直接选择具体 QA skill / package / MCP winner | 这会打破 coarse broker-first boundary |
| 引入 embeddings、语义搜索或模型分类来替换当前 deterministic / metadata-driven routing | 不符合当前产品方向与 proof-first 可解释性约束 |
| 把 broker 变成 marketplace 或直接执行下游能力的平台 | 产品定位仍然是运行时能力决策层与 handoff 协调层 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADOPT-01 | Phase 15 | Pending |
| ADOPT-02 | Phase 15 | Pending |
| ADOPT-03 | Phase 16 | Pending |
| HEALTH-01 | Phase 16 | Pending |
| HEALTH-02 | Phase 16 | Pending |
| TRUST-01 | Phase 17 | Pending |
| TRUST-02 | Phase 17 | Pending |

**Coverage:**

- v1.4 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after defining v1.4 requirements*
