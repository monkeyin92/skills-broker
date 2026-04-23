# Phase 15: Quantify Website QA Adoption Signals - Context

**Gathered:** 2026-04-23
**Status:** Executed and archived

<domain>
## Phase Boundary

v1.4 的第一步不是再证明一次 `website QA` 这条 lane “曾经可用”，而是把它收成 repo-owned、可审计的近期 adoption signal。已有 `websiteQaLoop` / `websiteQaRouting` / acquisition memory / verified downstream manifests，但 maintainer 仍然要自己拼出“最近有没有人在用、现在是 active 还是 stale、三宿主各自覆盖到哪”。
</domain>

<decisions>
## Implementation Decisions

- **D-01:** 不重开 maintained-family 泛化；本 phase 只为 `website QA` 增加 recent adoption packet。
- **D-02:** 继续只复用现有 rails: routing traces、acquisition memory、verified downstream manifests，不再造平行 telemetry。
- **D-03:** recent signal 语义用 `active / stale / missing`，并显式给出 latest timestamps、per-host coverage、next action。
- **D-04:** 维持 `websiteQaLoop` / `websiteQaRouting` 兼容表面，新 packet 作为并列、面向 maintainer 的 surface。
</decisions>

<code_context>
## Existing Code Insights

- `src/shared-home/doctor.ts` 已能汇总 family proof 与 website QA routing，但缺 freshness / per-host adoption packet。
- `src/shared-home/format.ts` 已能输出 proof loop 与 routing summary，适合接入新的 packet 文本 surface。
- `tests/shared-home/doctor.test.ts` 已有 website QA routing 与 repeat-usage fixtures，可直接扩展 active/stale contract。
</code_context>

<deferred>
## Deferred Ideas

- 不把 `active / stale / missing` 一次性抽象成所有 family 的通用 freshness schema。
- 不在本 phase 修改 `adoptionHealth` 语义；health 对齐放到 Phase 16。
</deferred>

---
*Phase: 15-quantify-website-qa-adoption-signals*
