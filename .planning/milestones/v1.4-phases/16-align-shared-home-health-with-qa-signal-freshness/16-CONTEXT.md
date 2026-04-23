# Phase 16: Align Shared-Home Health With QA Signal Freshness - Context

**Gathered:** 2026-04-23
**Status:** Executed and archived

<domain>
## Phase Boundary

Phase 15 定义了 `websiteQaAdoption` packet，但 `adoptionHealth` 仍然可能在 hero-lane signal 缺失或 stale 时给出误导性的 green。这个 phase 要让 health 真正消费 QA packet，而不是只看 host shell / strict rails 是否“没坏”。
</domain>

<decisions>
## Implementation Decisions

- **D-01:** `adoptionHealth` 继续保持 `green / blocked / inactive` 三态，但 blocked 理由显式升级到 website-QA-signal 层。
- **D-02:** 只有当 shared-home / host / strict rails 没有更基础的 blocker 时，才追加 website QA signal blocker，避免次级原因淹没主因。
- **D-03:** `adoptionHealth` 输出显式 `nextAction`，直接复用 website QA packet 的 refresh guidance。
- **D-04:** 用三宿主 shared-home fixture 证明 stale-to-fresh transition，而不是只靠单宿主 unit case。
</decisions>

<code_context>
## Existing Code Insights

- `src/shared-home/adoption-health.ts` 目前只消费 host/strict/proof-rail blocker。
- `tests/shared-home/doctor.test.ts` 已有 managed-host、repo-truth、proof-unreadable 场景，适合升级到 freshness-aware health。
- `tests/e2e/shared-home-smoke.test.ts` 与 `tests/e2e/status-doctor-git.test.ts` 已经是 canonical shared-home / strict-doctor surfaces。
</code_context>

---
*Phase: 16-align-shared-home-health-with-qa-signal-freshness*
