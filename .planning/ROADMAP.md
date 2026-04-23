# Roadmap: skills-broker

**Created:** 2026-04-23
**Source Requirements:** 7 v1.4 requirements from `.planning/REQUIREMENTS.md`
**Granularity:** coarse
**Project Type:** brownfield

## Roadmap Summary

**3 phases** | **7 requirements mapped** | All v1.4 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria | UI Hint |
|---|-------|------|--------------|------------------|---------|
| 15 | Quantify Website QA Adoption Signals | 把 `website QA` 的近期 broker-first / repeat-usage / cross-host reuse 证据收成可读的 adoption signal，而不是只剩历史 proof 痕迹 | ADOPT-01, ADOPT-02 | 4 | no |
| 16 | Align Shared-Home Health With QA Signal Freshness | 让 adoption health、next-action guidance 与三宿主 shared-home proof 一起对齐到 “QA-first 现在是否还活着” 这件事上 | ADOPT-03, HEALTH-01, HEALTH-02 | 4 | no |
| 17 | Lock Adoption-Signal Audit Truth | 把 website QA adoption packet 锁进 canonical `STATUS.md`、milestone audit 与 CI trust rail，让 drift fail closed | TRUST-01, TRUST-02 | 4 | no |

## Phase Details

### Phase 15: Quantify Website QA Adoption Signals

**Goal:** 把 `website QA` 的近期 broker-first hits、repeat usage、cross-host reuse 与 per-host coverage 从 raw traces / counters 里收成 maintainer 可直接读取的 adoption signal。

**Requirements:** `ADOPT-01`, `ADOPT-02`

**Status:** pending

**Verification:** —

**UI hint**: no

Plans:

- [ ] `15-01-PLAN.md` — Define time-windowed website QA signal aggregation from routing traces, acquisition memory, and host coverage rails
- [ ] `15-02-PLAN.md` — Surface the recent website QA adoption packet on doctor / CLI / status-facing surfaces without breaking existing proof contracts

**Success criteria:**
1. maintainer 可以从 repo-owned surfaces 直接读到近期 website QA broker-first hits、repeat usage 与 host breakdown，而不需要手工读 raw trace
2. repo 能区分“proof 曾经存在”与“近期 adoption signal 仍然活着”，不让一次性 demo 永久伪装成健康默认入口
3. signal aggregation 尽量复用现有 routing trace、acquisition memory 与 verified-manifest rail，而不是发明平行 telemetry
4. 对 signal aggregation 或 freshness semantics 的回归会在 tests / fixtures / doctor contract 中 fail closed

**Depends on:** v1.3 已经把 route confidence、repeat-usage proof 与 QA-first operator truth shipped 到 `main`

### Phase 16: Align Shared-Home Health With QA Signal Freshness

**Goal:** 让 adoption health 与 website QA recent-signal freshness 真正对齐，并在 signal 缺口出现时给 maintainer 一条明确的 refresh action。

**Requirements:** `ADOPT-03`, `HEALTH-01`, `HEALTH-02`

**Status:** pending

**Verification:** —

**UI hint**: no

Plans:

- [ ] `16-01-PLAN.md` — Wire website QA signal freshness into adoption-health semantics and next-action guidance
- [ ] `16-02-PLAN.md` — Prove stale-to-fresh refresh transitions for website QA on the Claude Code / Codex / OpenCode shared-home surface

**Success criteria:**
1. adoption health 不会在 website QA hero-lane signal stale / missing / contradicted 时继续给出误导性的 green/default-ready posture
2. `doctor` / status-facing surfaces 会直接指出当前缺的是 refresh signal、repeat usage、还是 cross-host reuse freshness
3. repo 可以在 canonical 三宿主 shared-home surface 上证明 stale-to-fresh refresh transitions，而不是只停在单宿主或一次性 smoke
4. coarse broker-first boundary、thin host shell 与现有 proof/reuse contract 不会因为 freshness logic 回归

**Depends on:** Phase 15 已先把 recent website QA adoption packet 定义并 surfaced 出来

### Phase 17: Lock Adoption-Signal Audit Truth

**Goal:** 让 canonical `STATUS.md`、milestone audit 与 CI trust rail 消费同一份 website QA adoption packet，并在语义或计数漂移时 fail closed。

**Requirements:** `TRUST-01`, `TRUST-02`

**Status:** pending

**Verification:** —

**UI hint**: no

Plans:

- [ ] `17-01-PLAN.md` — Align canonical STATUS and milestone-audit surfaces on the website QA adoption packet
- [ ] `17-02-PLAN.md` — Add parity / CI trust guardrails so adoption-signal wording, counts, and freshness semantics fail closed

**Success criteria:**
1. `doctor`、canonical `STATUS.md`、milestone audit 与 CI trust rail 会讲同一份 website QA adoption packet，而不是各自发明 summary
2. maintainer 在 ship / audit 时可以直接复用 adoption packet，而不是回头手工拼 freshness / repeat-usage truth
3. adoption-signal wording、counts、thresholds 或 stale semantics 的漂移会在 repo-native guardrail 中爆红，而不是留给人工 review
4. milestone 继续专注 adoption signal / auditability，不借机重开 capability breadth、host templating 或 release-truth 主题

**Depends on:** Phase 16 先把 adoption health 与 refresh guidance 对齐到 QA-first freshness

## Milestone View

### Milestone 5: Website QA Adoption Signals

Deliver Phases 15-17 to turn `website QA` from a historically proven default-entry lane into a currently auditable adoption signal: quantify recent usage first, align shared-home health second, and lock audit truth last.

## Notes

- This roadmap continues numbering from milestone v1.3; no phase renumber reset was used.
- Research was skipped for this milestone because `workflow.research` is currently disabled and repo-native product truth is already specific enough to scope the work.
- Previous milestone artifacts are already archived under `.planning/milestones/v1.3-phases/`, so the active planning workspace is clean before Phase 15.
- The roadmap intentionally prioritizes adoption-signal freshness over capability-breadth expansion, host templating, or shipping-summary-heavy work, because the highest remaining product risk is whether QA-first is still a living default-entry habit.

---
*Roadmap created: 2026-04-23*
*Last updated: 2026-04-23 after creating the v1.4 roadmap*
