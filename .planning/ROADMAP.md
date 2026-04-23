# Roadmap: skills-broker

**Created:** 2026-04-23
**Source Requirements:** 8 v1.1 requirements from `.planning/REQUIREMENTS.md`
**Granularity:** coarse
**Project Type:** brownfield

## Roadmap Summary

**4 phases** | **8 requirements mapped** | All v1.1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria | UI Hint |
|---|-------|------|--------------|------------------|---------|
| 5 | Ship The OpenCode Thin Host Shell | 把 OpenCode 从 readiness contract 推进成真正 shipping 的第三宿主，同时继续守住 thin-shell 与 shared-home 边界 | HOST-01, HOST-02 | 4 | no |
| 6 | Prove OpenCode Lifecycle And Reuse | 让 OpenCode 拿到与 Claude Code / Codex 对等的 lifecycle、doctor 与 proof / reuse 体验 | HOST-03 | 4 | no |
| 7 | Expand Evidence-Backed Capability Surface | 在不稀释可解释性的前提下，继续增加 proven family、broker-owned workflow 与 registry-ready MCP discovery | CAP-01, CAP-02, CAP-03 | 4 | no |
| 8 | Install CI Trust Guardrails | 把 blind-spot reporting 与 narrative parity 从 repo truth 提升为 CI truth | QUAL-01, QUAL-02 | 4 | no |

## Phase Details

### Phase 5: Ship The OpenCode Thin Host Shell

**Goal:** 把 OpenCode 从 deferred readiness contract 推进成真正 shipping 的第三宿主，同时继续守住 thin-shell 与 shared broker home 边界。

**Requirements:** `HOST-01`, `HOST-02`

**UI hint**: no

**Success criteria:**
1. OpenCode 可以安装 `skills-broker` host shell，并继续复用现有 shared broker home，而不是再创建第二套 runtime
2. OpenCode host shell 的 installed copy 继续只决定 `broker_first` / `handle_normally` / `clarify_before_broker`
3. OpenCode 集成不会让 Claude Code / Codex 的现有 host shell、shared-home 或 routing truth 回归
4. repo docs 与 installed shell 对 OpenCode 的支持表述只在真实 shipping 能力存在后更新，不再停留在 deferred note

**Depends on:** v1.0 third-host readiness contract and existing shared broker home architecture

### Phase 6: Prove OpenCode Lifecycle And Reuse

**Goal:** 让 OpenCode 拿到与 Claude Code / Codex 对等的 lifecycle、doctor 与 proof / reuse 体验，而不是只多了一个安装入口。

**Requirements:** `HOST-03`

**UI hint**: no

**Success criteria:**
1. OpenCode 用户可以执行 `install`、`update`、`doctor`、`remove`，且输出契约与现有宿主保持同级清晰度
2. `doctor` 会把 OpenCode 纳入同一份 adoption / proof / reuse truth，而不是分叉出 OpenCode-only surface
3. OpenCode 运行后的 verified downstream manifests、routing traces 与 acquisition memory 继续写入同一份 shared truth
4. 至少一条跨宿主 proof 证明 OpenCode 与现有宿主之间可以共享 reuse evidence

**Depends on:** Phase 5 shipping OpenCode thin host shell without boundary regression

### Phase 7: Expand Evidence-Backed Capability Surface

**Goal:** 在不稀释 deterministic、metadata-driven、可解释 routing 的前提下，继续增加 proven family、broker-owned workflow 与 registry-ready MCP discovery。

**Requirements:** `CAP-01`, `CAP-02`, `CAP-03`

**UI hint**: no

**Success criteria:**
1. 新增至少一条 default-entry family，且具备 install -> verify -> cross-host reuse 证据，而不是只新增 catalog entry
2. 除 `idea-to-ship` 外至少一条 broker-owned workflow 成为正式 shipped path，并有清晰的 stage / handoff truth
3. MCP discovery source 拿到可验证元数据与解释面，让 broker 能说明“为什么是这个 MCP”
4. 新 surface 的接入不会迫使 broker 重写 routing core 或牺牲 explainable trace fields

**Depends on:** Phase 6 stabilizing OpenCode lifecycle and shared proof / reuse truth

### Phase 8: Install CI Trust Guardrails

**Goal:** 把 blind-spot reporting 与 narrative parity 从 repo truth 提升为 CI truth，让 ship 前的关键回归不再只靠 milestone 末尾人工补账。

**Requirements:** `QUAL-01`, `QUAL-02`

**UI hint**: no

**Success criteria:**
1. CI 会输出 coverage budget 或 blind-spot report，明确标出高风险 runtime / proof surfaces 的覆盖缺口
2. README、README.zh-CN、STATUS、TODOS、installed shell 等关键 narrative truth 的 parity 检查进入 CI
3. 新增宿主、新增 family、新增 workflow 的 narrative / proof drift 会在 CI 中 fail closed，而不是只在人工审阅中暴露
4. 本地 verify 与 CI quality gates 的职责边界清晰，不会重复制造一套新的 operator confusion

**Depends on:** Phase 7 establishing the next wave of product surface worth protecting in CI

## Milestone View

### Milestone 2: Third-Host Expansion And Trust Scaling

Deliver Phases 5-8 to turn `skills-broker` from a two-host trusted broker into a three-host runtime with a broader proven surface and CI-backed trust guardrails.

## Notes

- This roadmap continues numbering from milestone v1.0; no phase renumber reset was used.
- Research was skipped for this milestone because `workflow.research` is currently disabled and repo-native product truth is already specific enough to scope the work.
- The roadmap intentionally sequences OpenCode shipping before broader capability expansion so new surface area inherits the same shared-home and proof/reuse constraints.

---
*Roadmap created: 2026-04-23*
*Last updated: 2026-04-23 after initialization*
