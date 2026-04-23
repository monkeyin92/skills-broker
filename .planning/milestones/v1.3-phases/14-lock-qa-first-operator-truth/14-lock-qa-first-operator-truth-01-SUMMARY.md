---
phase: 14-lock-qa-first-operator-truth
plan: 01
subsystem: qa-first-operator-story-alignment
tags: [website-qa, docs, operator-truth, status]
requires:
  - phase: 13-prove-website-qa-repeat-usage-loop
    plan: 02
    provides: current website QA routing and repeat-usage proof truth
provides:
  - Canonical coarse-boundary wording shared across docs and generated host shells
  - README / README.zh-CN wording aligned with the current website QA proof surface
  - STATUS / TODOS updated to the real v1.3 milestone focus and landed QA-first runtime truth
affects: [phase-14, docs, host-shell, status, backlog]
tech-stack:
  added: []
  patterns: [canonical-boundary-sentence, bilingual-qa-first-proof-story, current-milestone-status-truth]
key-files:
  created:
    - .planning/milestones/v1.3-phases/14-lock-qa-first-operator-truth/14-lock-qa-first-operator-truth-01-SUMMARY.md
  modified:
    - src/core/operator-truth.ts
    - src/hosts/skill-markdown.ts
    - README.md
    - README.zh-CN.md
    - STATUS.md
    - TODOS.md
key-decisions:
  - "coarse broker-first boundary 与 website QA proof surface 都提升进 `src/core/operator-truth.ts`，避免 docs/status/todos 各说各话。"
  - "README 双语不再只讲 verify -> cross-host reuse，而是明确 current doctor truth：routing evidence + repeat usage / cross-host reuse proof states。"
  - "`TODOS.md` 当前焦点从 v1.2 release truth 切到 v1.3 Phase 14 operator-truth lock，避免 backlog 页面继续讲旧 milestone。"
patterns-established:
  - "operator-facing wording 发生变化时，优先抽 canonical phrase，再回写到 README、README.zh-CN、STATUS、TODOS 和 generated host shell，而不是逐文件手工改句子。"
requirements-completed: [TRUTH-01, TRUTH-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 14 Plan 01 Summary

**Phase 14 的第一部分把 QA-first operator story 对齐到了当前 runtime 真相上。现在 README 双语、generated host shell、STATUS 和 TODOS 都会讲同一句边界真话，也会反映 `doctor` 当前已经有 website QA routing evidence 和 repeat-usage proof surface。**

## Accomplishments

- `src/core/operator-truth.ts` 新增 coarse-boundary 与 website QA proof-surface canonical lines，作为 docs / status / host-shell 的复用来源。
- `src/hosts/skill-markdown.ts` 现在直接复用 canonical coarse-boundary 句子，保持 generated host shell 与 README/operator truth 一致。
- `README.md` 与 `README.zh-CN.md` 现在明确说明“宿主只决定 `broker_first` / `handle_normally` / `clarify_before_broker`，具体 QA winner 仍由 broker 选”，并同步更新了 `doctor` proof story。
- `STATUS.md` 与 `TODOS.md` 不再停留在 v1.2 release-truth 叙事，已经写回 Phase 12/13 的 routing confidence 与 repeat-usage truth，以及当前 Phase 14 的剩余工作。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/shared-home-smoke.test.ts`

## Deviations

- `STATUS.md` 仍然保留旧 milestone 的历史 packet 记录；本轮只补齐 current QA-first story，没有重写整个 canonical board 历史结构。

## Next Readiness

- operator story 已经对齐，下一步只剩把 parity / CI trust rail 扩到这份新 wording，让 drift 能 fail closed。
