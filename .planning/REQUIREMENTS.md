# Requirements: v1.7 Demand-Guided Capability Growth Health

**Project:** skills-broker
**Milestone:** v1.7 Demand-Guided Capability Growth Health
**Status:** active
**Created:** 2026-04-24

## Goal

让 operator 不只看懂 capability candidates 是否可信，还能看懂哪些增长机会正在被真实请求、哪些已经 stale 或 blocked、以及哪些已经 ready for promotion。

## Scope Principles

- `website QA` 继续是唯一第一步 hero lane；`web markdown` 与 `social markdown` 仍是 post-QA proven loops。
- Host shell 只能判断 `broker_first` / `handle_normally` / `clarify_before_broker`，不能在入口处选择具体 skill、package、workflow、registry candidate 或 promotion winner。
- Demand signal 必须复用 routing traces、`INSTALL_REQUIRED` outcomes、acquisition memory、verified manifests、registry/downstream metadata 与 `doctor`，不能新建平行 telemetry story。
- Registry / MCP candidates 仍是 advisory；有 demand 不等于可以越过已安装/已验证的本地赢家。
- v1.7 不扩第四宿主、不新增 proven family / workflow、不重开 release mechanics、query-native migration、package-vs-leaf identity migration 或 maintained-family schema 泛化。

## Milestone Requirements

### Demand Signal

- [ ] **DEMAND-01**: Operator can see which capability growth opportunities are backed by recent user demand across routing traces, `INSTALL_REQUIRED` outcomes, acquisition memory, and verified manifest misses.
- [ ] **DEMAND-02**: Broker can distinguish proven demand, speculative/advisory candidates, blocked acquisitions, stale registry metadata, and already-satisfied local winners without changing host shell boundaries.
- [ ] **DEMAND-03**: Demand aggregation stays deterministic and repo-owned, with tests covering missing, stale, contradictory, and duplicate demand evidence.

### Capability Health And Readiness

- [ ] **HEALTH-01**: `doctor` exposes a capability growth health packet that reports freshness, blocked next actions, promotion readiness, and reuse status for demanded capabilities.
- [ ] **HEALTH-02**: Refresh guidance reuses existing acquisition memory, verified manifests, routing traces, and registry/downstream metadata instead of inventing a parallel telemetry model.
- [ ] **HEALTH-03**: Capability health can prove stale-to-fresh and blocked-to-ready transitions on the shared broker home while keeping `website QA` and family-loop health green.

### Operator Truth And Guardrails

- [ ] **TRUST-01**: README, README.zh-CN, generated host shell wording, `STATUS.md`, and `TODOS.md` share one demand-guided capability growth story.
- [ ] **TRUST-02**: CI/parity rails fail closed on drift in demand counts, health states, readiness wording, or host-boundary wording.
- [ ] **TRUST-03**: Release gate consumes the same demand-guided capability growth truth without reopening release-promotion mechanics or adding fourth-host scope.

## Future Requirements

- Real registry update / publish feedback loops can be considered after demand-guided capability health proves which capabilities are worth promoting.
- Additional proven families or broker-owned workflows can be considered after the current demand signal shows sustained usage pressure beyond the QA-first family loop.
- Fourth-host expansion remains deferred until existing three-host shared-home demand and health surfaces show a clear host-specific bottleneck.

## Out of Scope

- Adding a fourth host shell or changing the current three-host lifecycle contract.
- Letting host shells select concrete skills, packages, MCP candidates, registry entries, workflows, or promotion winners.
- Replacing deterministic evidence aggregation with embeddings, semantic search, model-driven classification, or external analytics.
- Reopening release-gate / release-promote mechanics beyond consuming their existing canonical verdict.
- Generalizing maintained-family schema, reopening query-native migration, or changing package-vs-leaf identity semantics.

## Traceability

| Requirement | Planned Phase | Coverage |
|-------------|---------------|----------|
| DEMAND-01 | 24 | Demand-backed capability backlog |
| DEMAND-02 | 24 | Demand state classification and host-boundary preservation |
| DEMAND-03 | 24 | Deterministic demand aggregation tests |
| HEALTH-01 | 25 | Doctor capability growth health packet |
| HEALTH-02 | 25 | Refresh guidance from existing proof rails |
| HEALTH-03 | 25 | Stale/blocked transition proof with QA-first health preserved |
| TRUST-01 | 26 | Canonical docs/status/shell story |
| TRUST-02 | 26 | CI/parity drift rails |
| TRUST-03 | 26 | Release-gate consumption without release mechanics scope |

**Coverage:** 9 / 9 requirements mapped exactly once.

---
*Created: 2026-04-24 via $gsd-new-milestone*
