---
phase: 06-prove-opencode-lifecycle-and-reuse
plan: 03
subsystem: operator-truth
tags: [opencode, operator-truth, docs, status, installed-shell]
requires:
  - phase: 06-prove-opencode-lifecycle-and-reuse
    provides: remove parity, doctor parity, and shared proof/reuse evidence
provides:
  - Canonical post-Phase-6 operator truth for three-host full lifecycle parity
  - Repo docs and STATUS/TODOS wording aligned to the same full-parity contract
  - Installed-shell truth updated to match repo-native operator truth
affects: [phase-7, phase-8, release-narrative]
tech-stack:
  added: []
  patterns: [typed-truth-source, stale-caveat-removal, dist-backed-installed-shell-proof]
key-files:
  created:
    - .planning/phases/06-prove-opencode-lifecycle-and-reuse/06-prove-opencode-lifecycle-and-reuse-03-SUMMARY.md
  modified:
    - src/core/operator-truth.ts
    - src/hosts/skill-markdown.ts
    - tests/shared-home/operator-truth-parity.test.ts
    - tests/hosts/host-shell-install.test.ts
    - tests/e2e/shared-home-smoke.test.ts
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
key-decisions:
  - "Phase 6 完成后，canonical truth 不再保留任何 'parity 继续在 Phase 6' 的文案；改成 full lifecycle / proof parity 已成立。"
  - "installed shell truth 必须和 repo docs 同源，所以 `src/core/operator-truth.ts` 先翻面，再由 host-shell markdown 和 parity tests 跟进。"
  - "dist-backed shared-home smoke 需要显式重建 `dist/`，否则会误用旧的 published shell wording。"
patterns-established:
  - "先翻 typed operator truth，再翻 repo docs，再用 installed-shell smoke 把发布态 copy 锁住。"
  - "删除过期 caveat 时，测试不仅要校验新文案存在，也要 fail-closed 地拒绝旧文案回流。"
requirements-completed: [HOST-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 6 Plan 03 Summary

**OpenCode parity 已经从 lingering caveat 变成 canonical operator truth：Claude Code、Codex、OpenCode 现在统一被表述为 full published lifecycle / proof parity 已成立，而且这份 truth 已同时写进 repo docs、STATUS/TODOS、以及 installed shell 文案**

## Accomplishments

- `src/core/operator-truth.ts` 删除了旧的 Phase 6 caveat contract，改成 full lifecycle parity contract，并把第三宿主 readiness 句子翻成 post-Phase-6 的共享 truth。
- `src/hosts/skill-markdown.ts`、`tests/hosts/host-shell-install.test.ts`、`tests/e2e/shared-home-smoke.test.ts` 同步切到新的 operator truth helper，确保 installed shell 不会继续说过期的话。
- `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 全部移除了 “OpenCode parity 继续在 Phase 6” 的旧叙事，把当前重点前移到 capability surface、CI trust guardrails、future hosts。
- `tests/shared-home/operator-truth-parity.test.ts` 现在既要求 full-parity truth 出现在所有 repo truth surface 上，也显式拒绝旧 caveat 文案回流。

## Verification

- `rg -n "Phase 6|lifecycle / proof parity continues|继续在 Phase 6 补齐|OpenCode thin host shell is shipping in Phase 5|Phase 6 keeps the same" src/core/operator-truth.ts README.md README.zh-CN.md TODOS.md STATUS.md tests/shared-home/operator-truth-parity.test.ts`
  Result: no matches
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts`

## Deviations

- `shared-home-smoke` 新增了一个 repo-local build step，因为这轮验证的是 published installed-shell wording；不先重建 `dist/` 就可能误读旧 copy。
- Phase 6 的 operator-facing 收口没有新增 STATUS item id，而是把现有三宿主 packet 直接翻成 post-parity truth，避免同一条 shipped packet 在 status board 上拆成两套叙事。

## Next Readiness

- Phase 6 已整体完成，下一步可以直接推进 Phase 7 的 evidence-backed capability surface 扩展，而不需要再回头补 OpenCode lifecycle/proof 对称性。
- README / STATUS / installed shell 现在已经统一承认三宿主 full parity，后续 phase 只需要在这个基线上扩展 family、workflow、registry、CI，而不是再维护过期 caveat。
