# Requirements: v1.6 Registry-Ready Capability Growth Loop

**Project:** skills-broker
**Milestone:** v1.6 Registry-Ready Capability Growth Loop
**Status:** active
**Created:** 2026-04-24

## Goal

让 broker 在保持 `website QA` 默认入口与 coarse broker-first boundary 不漂移的前提下，把 verified downstream manifests、MCP registry advisory 与 acquisition memory 推进成 operator-visible 的 capability growth loop。

## Scope Principles

- `website QA` 继续是唯一第一步 hero lane；`web markdown` 与 `social markdown` 仍是 post-QA proven loops。
- Host shell 只能判断 `broker_first` / `handle_normally` / `clarify_before_broker`，不能在入口处选择具体 skill、package、workflow 或 downstream winner。
- Registry / MCP candidates 仍是 advisory，不能越过已安装或已验证的本地/downstream winner。
- Capability growth truth 必须复用 shared broker home、verified manifests、acquisition memory、routing traces、`doctor`、docs 与 CI/parity rails，不能发明平行 telemetry story。

## Milestone Requirements

### Registry And Manifest Trust

- [ ] **CAP-01**: Operator can inspect capability candidates with normalized provenance that distinguishes installed local skills, verified downstream manifests, MCP registry advisory candidates, and broker-owned workflows.
- [ ] **CAP-02**: Operator can see why a registry or downstream manifest candidate is eligible, degraded, or rejected based on explicit trust metadata such as source, version, transport, installability, verification status, and query coverage.
- [ ] **CAP-03**: Maintainer can run a repo-owned check that fails closed when registry/downstream manifest metadata is missing, stale, contradictory, or capable of outranking a verified installed winner without proof.

### Acquisition Proof Loop

- [ ] **ACQ-01**: Operator can follow a single capability growth path from advisory candidate to `INSTALL_REQUIRED`, successful install/verify, and later reuse without reading raw routing traces.
- [ ] **ACQ-02**: Shared broker home records capability acquisition outcomes in a way that separates first install, verification success, repeat usage, cross-host reuse, and degraded/failed acquisition.
- [ ] **ACQ-03**: Broker results and `doctor` expose enough acquisition proof to explain whether the next action is install, verify, rerun, refresh metadata, or prefer an already verified local/downstream winner.

### Operator Truth And Guardrails

- [ ] **TRUST-01**: README, README.zh-CN, generated host shell copy, `STATUS.md`, and `TODOS.md` describe capability growth using one canonical coarse-boundary story.
- [ ] **TRUST-02**: Narrative parity and CI trust rails fail when capability growth wording, counts, provenance labels, or next-action guidance drift across docs, installed shell, `doctor`, and status surfaces.
- [ ] **TRUST-03**: Host shell tests prove capability growth requests still enter only through the coarse broker-first boundary and never select concrete skills, packages, MCP candidates, or workflows at the host layer.

## Future Requirements

- [ ] **FUTURE-01**: Add a fourth host only after capability growth truth is stable enough to avoid multiplying unclear registry/downstream semantics.
- [ ] **FUTURE-02**: Promote additional maintained/proven families only after the registry-ready capability growth loop can explain their provenance, installability, verification, and reuse state.
- [ ] **FUTURE-03**: Build richer registry scoring only after deterministic metadata, eligibility, and fail-closed precedence are proven.

## Out of Scope

- Query-native migration, package-vs-leaf identity migration, or maintained-family schema generalization — current sequencing still holds.
- Letting installed host shells pick a specific skill, package, MCP candidate, or workflow winner — this would violate the host coarse-boundary contract.
- Replacing deterministic metadata checks with embeddings, semantic search, or model-driven classification.
- Reopening release truth / shipped-proof promotion unless capability growth proof is directly blocked by release automation.
- Turning `skills-broker` into a marketplace, chat product, or direct downstream capability executor.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAP-01 | Phase 21 | completed |
| CAP-02 | Phase 21 | completed |
| CAP-03 | Phase 21 | completed |
| ACQ-01 | Phase 22 | completed |
| ACQ-02 | Phase 22 | completed |
| ACQ-03 | Phase 22 | completed |
| TRUST-01 | Phase 23 | planned |
| TRUST-02 | Phase 23 | planned |
| TRUST-03 | Phase 23 | planned |

---
*Last updated: 2026-04-24 after completing Phase 22*
