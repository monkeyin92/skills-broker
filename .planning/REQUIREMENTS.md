# Requirements: skills-broker

**Defined:** 2026-04-24
**Core Value:** 用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。

## v1.5 Requirements

### QA-First Hierarchy

- [ ] **LOOP-01**: Operator can see from repo-owned surfaces that `website QA` is the single first step, with `web markdown` and `social markdown` presented as the second and third proven loops in that order
- [ ] **LOOP-02**: Installed host shells and repo docs can direct the operator from `website QA` into the next proven loop without telling the host to choose a concrete downstream winner
- [ ] **LOOP-03**: Operator can tell what the recommended next loop is after a successful `website QA` proof without reconstructing the hierarchy from multiple docs or traces

### Family Loop Proof

- [x] **FRESH-01**: `doctor` and shared-home surfaces can show freshness for `web markdown` and `social markdown` alongside the existing `website QA` packet, so maintainers can verify that the full QA-first family loop is currently alive
- [x] **FRESH-02**: Maintainer can distinguish which segment of the family loop is stale or missing (`website QA`, `web markdown`, or `social markdown`) and what concrete refresh action should run next
- [x] **FRESH-03**: Shared-home proof surfaces can show reuse state for the post-QA family loop across Claude Code, Codex, and OpenCode without flattening the hero-lane sequence

### Cross-Surface Trust

- [x] **TRUST-03**: README, README.zh-CN, installed host shell, `STATUS.md`, `TODOS.md`, and `doctor` consume the same QA-first family-loop wording and hierarchy
- [x] **TRUST-04**: CI, parity, and audit rails fail closed when family-loop hierarchy, freshness semantics, or next-step guidance drift across repo-owned surfaces

## Future Requirements

### Host Expansion

- **HOST-04**: 新宿主扩展应能模板化复用 OpenCode 的安装、runner、proof rail 与 lifecycle 契约，而不是每接一个宿主都重做一套集成

### Capability Surface

- **CAP-04**: 新 proven families 的接入不应要求重写 routing core，而应继续依赖 metadata-driven、可解释的 broker contract
- **CAP-05**: MCP registry readiness 需要继续向真实生态集成推进，包括 freshness、health 与 trust scoring
- **LOOP-04**: 新的 proven family 只有在当前 `website QA -> web markdown -> social markdown` 三段 hierarchy 被 operator 稳定理解并且 freshness-aware 之后，才应加入 post-QA sequence

### Shipping Summary

- **SHIP-03**: 发布完成后应产出可审计的 shipping summary，把 package version、shipping ref 与 promoted proof verdict 绑定成后续 milestone audit 可复用的 repo truth

## Out of Scope

| Feature | Reason |
|---------|--------|
| 把 `website QA`、`web markdown`、`social markdown` 打平成并列默认入口 | 当前 milestone 要守住 QA-first hero-lane sequencing，而不是抹平层级 |
| 重新打开 query-native migration、package-vs-leaf identity migration 或 maintained-family schema 泛化 | 当前 sequencing 仍然成立，这轮工作不足以证明它失效 |
| 在本 milestone 里新增第四宿主、proven family 或 broker-owned workflow | 当前 bottleneck 是把已有三段 family loop 讲清楚并锁成可信默认入口延伸 story |
| 让安装后的 host shell 直接选择具体 QA / markdown winner | 这会打破 coarse broker-first boundary |
| 用 embeddings、语义搜索或模型分类替换当前 deterministic / metadata-driven routing | 不符合当前产品方向与 proof-first explainability 约束 |
| 重开 release truth 或 shipping-summary-heavy 主题作为主线 | v1.2 已闭环 canonical shipping truth，这轮更值钱的是 QA-first family loop |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOOP-01 | Phase 18 | Complete |
| LOOP-02 | Phase 18 | Complete |
| LOOP-03 | Phase 18 | Complete |
| FRESH-01 | Phase 19 | Complete |
| FRESH-02 | Phase 19 | Complete |
| FRESH-03 | Phase 19 | Complete |
| TRUST-03 | Phase 20 | Complete |
| TRUST-04 | Phase 20 | Complete |

**Coverage:**

- v1.5 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-24*
*Last updated: 2026-04-24 after completing Phase 20*
