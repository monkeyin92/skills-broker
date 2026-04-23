# Phase 17: Lock Adoption-Signal Audit Truth - Context

**Gathered:** 2026-04-23
**Status:** Executed and archived

<domain>
## Phase Boundary

前两个 phase 已经让 doctor/adoption health 拿到 website QA adoption packet。最后一步要把这份 packet 锁进 repo-owned audit truth：docs、canonical `STATUS.md`、CI trust 与 milestone audit 讲同一套话，不允许 freshness semantics 再漂移。
</domain>

<decisions>
## Implementation Decisions

- **D-01:** 把 adoption-packet wording 提升到 `src/core/operator-truth.ts` 的 canonical operator truth contract。
- **D-02:** `STATUS.md` 增加 v1.4 phase15-17 canonical items，而不是只留 human summary。
- **D-03:** `src/dev/ci-trust.ts` 显式检查 adoption-packet status item 与 doctor coverage，避免只有 narrative 对齐、没有 trust rail。
</decisions>

---
*Phase: 17-lock-adoption-signal-audit-truth*
