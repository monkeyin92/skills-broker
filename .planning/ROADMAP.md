# Roadmap: skills-broker

**Created:** 2026-04-22
**Source Requirements:** 13 v1 requirements from `.planning/REQUIREMENTS.md`
**Granularity:** coarse
**Project Type:** brownfield

## Roadmap Summary

**4 phases** | **13 requirements mapped** | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria | UI Hint |
|---|-------|------|--------------|------------------|---------|
| 1 | Prove The QA Hero Loop | 把 website QA 从“文案默认入口”推进成“docs、host shell、runtime、doctor 一起证明的产品闭环” | ENTRY-01, ENTRY-02, ROUTE-01, ROUTE-02, ROUTE-03 | 5 | no |
| 2 | Generalize Family Proofs | 在不重开已完成迁移的前提下，把 QA proof loop 推广到 web markdown / proof families | ENTRY-03, ROUTE-04, GROW-01 | 4 | no |
| 3 | Harden Runtime And Verification | 降低 shared-home 与 runner 高 blast radius 风险，让关键失败路径与 contributor verification 更可靠 | HARD-01, HARD-02, HARD-04 | 4 | no |
| 4 | Lock Operator Truth And Expansion Readiness | 保持多文档、多宿主叙事一致，并为未来第三宿主壳保留稳定接入面 | HARD-03, GROW-02 | 4 | no |

## Phase Details

### Phase 1: Prove The QA Hero Loop

**Goal:** 把 `website QA` 变成一个对新用户、已安装宿主、broker runtime 和 operator proof 都一致可信的第一步。

**Requirements:** `ENTRY-01`, `ENTRY-02`, `ROUTE-01`, `ROUTE-02`, `ROUTE-03`

**Plans:** 3 plans

**UI hint**: no

**Success criteria:**
1. `README.md`、`README.zh-CN.md` 与安装后的宿主说明都把 `website QA` 放在首个 hero example，而不是与其他 family 平铺
2. Quick Start 中存在一条可直接复制的 website QA 请求，以及明确的 `INSTALL_REQUIRED -> install -> rerun -> doctor` 操作顺序
3. 在未安装最佳赢家时，同一句 website QA 请求返回 `INSTALL_REQUIRED`，且失败原因对 operator 可解释
4. 安装后重跑同一句请求得到 `HANDOFF_READY`，不需要更换措辞或走新路径
5. Claude Code 与 Codex 都能复用同一条已验证 QA lane，并保留可读的跨宿主 proof / reuse evidence

Plans:
- [ ] `01-01-PLAN.md` — 对齐 README、README.zh-CN、repo truth 与宿主壳，让 website QA 成为唯一 first move
- [ ] `01-02-PLAN.md` — 收紧 QA precision-first 边界并锁住 miss-layer eval 证明面
- [ ] `01-03-PLAN.md` — 用 verdict-first doctor 与跨宿主 proof loop 证明 same-request QA 闭环

**Depends on:** brownfield runtime truth and existing shared-home lifecycle already shipped

### Phase 2: Generalize Family Proofs

**Goal:** 让 proof family 与 semantic metadata 支撑 `web_content_to_markdown` 等已存在 family，同时保持 `website QA` hero lane 的产品语义不退化。

**Requirements:** `ENTRY-03`, `ROUTE-04`, `GROW-01`

**UI hint**: no

**Success criteria:**
1. `skills-broker doctor` 能以 family-specific summary 展示 `website QA` 与 `web_content_to_markdown` 的 install / verify / reuse truth
2. 明确的网页转 markdown 请求稳定进入 `web_content_to_markdown` family，而不是落入 QA 或 generic unsupported
3. semantic metadata / proof family 结构能支持后续 family 扩展，但不重开 query-native 或 package-vs-leaf 已完成迁移
4. website QA 的默认入口语义、negative boundary 和 operator wording 在泛化后保持稳定

**Depends on:** Phase 1 proof loop and existing deterministic routing model

### Phase 3: Harden Runtime And Verification

**Goal:** 把最容易引发高 blast radius 回归的 shared-home、runner 与 contributor verification 问题压到可控范围内。

**Requirements:** `HARD-01`, `HARD-02`, `HARD-04`

**UI hint**: no

**Success criteria:**
1. 生成的宿主 runner 对 awkward install path 有明确的转义/规避方案，并有针对性测试
2. shared-home repair、rollback、proof rail unreadable、advisory persistence failure 等路径要么被测试锁住，要么以结构化 degraded outcome 暴露给 operator
3. 当前 skipped 的高风险 rollback / recovery 路径被关闭或以明确技术债形式记录并附带防回归保护
4. 本地验证链路提供确定性的依赖健康修复路径，避免贡献者因为 Rollup/Vitest optional dependency 状态不明而卡死

**Depends on:** Phase 1 and Phase 2 preserving current product behavior

### Phase 4: Lock Operator Truth And Expansion Readiness

**Goal:** 让多语言文档、status/backlog 叙事、host shell 边界与未来第三宿主壳的接入条件保持一致。

**Requirements:** `HARD-03`, `GROW-02`

**UI hint**: no

**Success criteria:**
1. `README.md`、`README.zh-CN.md`、`TODOS.md` 与 `STATUS.md` 的支持矩阵、默认入口与 lifecycle 命令表述有 parity 保障
2. host shell 持续只暴露 coarse broker-first boundary，不把 package/skill 决策泄露回宿主入口
3. “何时可以接第三个宿主壳” 有清晰的 readiness 条件，而不是凭感觉扩展
4. 扩展新宿主时不需要拆分 shared broker home，也不需要复制已有 proof / reuse state 设计

**Depends on:** Phases 1-3 stabilizing operator truth and runtime contracts

## Milestone View

### Milestone 1: Default-Entry Trust And Growth Readiness

Deliver Phases 1-4 to turn `skills-broker` from a “small but interesting routed lake” into a product with one trusted first move, reusable proof loops, and a cleaner expansion surface.

## Notes

- This roadmap intentionally treats the repo as a brownfield product, not a greenfield idea.
- Historical shipped capabilities remain in `.planning/PROJECT.md` as validated context; this roadmap only covers the current active scope.
- Research was skipped during initialization because repo-native docs already provide stronger product truth than generic external research would.

---
*Roadmap created: 2026-04-22*
*Last updated: 2026-04-22 after initialization*
