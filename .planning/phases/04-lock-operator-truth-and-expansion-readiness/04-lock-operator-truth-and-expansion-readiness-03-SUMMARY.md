---
phase: 04-lock-operator-truth-and-expansion-readiness
plan: 03
subsystem: growth-readiness
tags: [readiness, opencode, docs, backlog, status]
requires: [01, 02]
provides:
  - Explicit third-host readiness contract for a future thin host shell such as OpenCode
  - Repo truth that explains why OpenCode is still deferred and what must stay true before it ships
  - STATUS/TODOS visibility for readiness progress without overclaiming current support
affects: [phase-close, roadmap, future-host-expansion]
tech-stack:
  added: []
  patterns: [repo-owned-readiness-checklist, deferred-but-well-defined, status-backed-growth-guardrail]
key-files:
  created:
    - docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md
  modified:
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
    - tests/shared-home/operator-truth-parity.test.ts
key-decisions:
  - "OpenCode 在本 phase 里只允许被定义成 deferred-but-well-defined，不允许被写成半支持或隐含承诺。"
  - "third-host readiness 的 done bar 明确要求复用 shared broker home、thin host shell、published lifecycle parity 与 proof/reuse state。"
  - "readiness contract 必须同时落到 spec、README 双语、TODOS、STATUS 和 parity test，不能只停留在 spec。"
patterns-established:
  - "Deferred does not mean vague: backlog 中的未来宿主扩展必须有显式准入条件。"
  - "Growth readiness as repo truth: readiness contract 与 operator-facing docs/status 一起维护，而不是会前口头共识。"
requirements-completed: [HARD-03, GROW-02]
duration: 1 session
completed: 2026-04-22
---

# Phase 4 Plan 03 Summary

**未来第三宿主现在有了可引用的 readiness contract，OpenCode 保持 deferred，但不再是模糊待办**

## Accomplishments

- 新增 `docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md`，把 third host / OpenCode 的准入条件明确成 checklist：共享 broker envelope、shared broker home、thin host shell、`npx skills-broker update` / `doctor` / `remove` parity、`adoptionHealth` / `familyProofs` / manual-recovery truth，以及 proof/reuse state reuse。
- `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 现在都能解释“为什么现在只支持 Claude Code + Codex，以及第三宿主需要满足什么条件”。
- `STATUS.md` canonical block 新增 `phase4-operator-truth-readiness` shipped_local item，repo status board 可以直接显示 Phase 4 的 operator-truth / readiness 落地情况。

## Verification

- `rg -n "OpenCode|third host|shared broker home|thin host shell|update|doctor|remove|adoptionHealth|familyProofs|proof/reuse" docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md README.md README.zh-CN.md TODOS.md STATUS.md`
- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`

## Deviations

- 当前 worktree 已有大量无关修改与未跟踪文件，因此没有为本 plan 单独生成原子 commit。

## Next Readiness

- Phase 4 已经把 future third-host expansion 变成显式 contract；后续 phase 如果真的实现 OpenCode，可以直接围绕这份 checklist 补 install、doctor、remove 和 smoke proof。
