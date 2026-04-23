---
phase: 06-prove-opencode-lifecycle-and-reuse
plan: 01
subsystem: lifecycle-parity
tags: [opencode, remove, doctor, cli, regression]
requires:
  - phase: 05-ship-the-opencode-thin-host-shell
    provides: shipped OpenCode thin host shell and shared lifecycle plumbing
provides:
  - OpenCode remove parity coverage for managed, preserve, and conflict states
  - Published lifecycle CLI proof that `doctor` and `remove` both accept `--opencode-dir`
  - No-regression evidence that three-host shared-home smoke still passes after lifecycle parity hardening
affects: [06-02, 06-03, shared-home]
tech-stack:
  added: []
  patterns: [proof-before-truth-flip, default-root-remove-parity, npm-free-test-build]
key-files:
  created:
    - .planning/phases/06-prove-opencode-lifecycle-and-reuse/06-prove-opencode-lifecycle-and-reuse-01-SUMMARY.md
  modified:
    - tests/shared-home/remove.test.ts
    - tests/cli/lifecycle-cli.test.ts
key-decisions:
  - "Phase 6-01 先补 proof seam，不为了 OpenCode 再造任何 remove/doctor 特例实现。"
  - "OpenCode remove parity 直接沿用 shared-home 默认 root detection，而不是只测显式 override。"
  - "published build verification 在测试里改为直接调用 `tsc`，避开当前 Codex 桌面环境缺失 npm CLI 的噪音。"
patterns-established:
  - "Lifecycle parity 先靠 regression proof 补齐，再翻 operator truth。"
  - "Host-specific parity 要覆盖 removed / preserved / skipped_conflict 三种结果契约，而不只是 happy path。"
requirements-completed: [HOST-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 6 Plan 01 Summary

**OpenCode 现在已经拿到 published remove/doctor lifecycle surface 的第一层 parity proof：default-root remove、reset-acquisition-memory preserve、conflict skip，以及 CLI `--opencode-dir` 的 doctor/remove 路径都已锁住，同时三宿主 shared-home smoke 仍保持绿色**

## Accomplishments

- `tests/shared-home/remove.test.ts` 新增 OpenCode 的三组 remove regression：默认 root 下的 managed remove、`resetAcquisitionMemory` preserve、以及 conflicting manifest 的 `skipped_conflict`。
- `tests/cli/lifecycle-cli.test.ts` 新增 `--opencode-dir` 在 `doctor` 和 `remove` 上的 parsing proof，并补了两条 CLI JSON behavior proof，确认目标 host 会被识别/移除。
- `tests/cli/lifecycle-cli.test.ts` 内的 published build 路径改成直接调用 `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`，不再依赖当前环境里不存在的 npm CLI。
- `tests/e2e/shared-home-smoke.test.ts` 无需改动即可继续通过，证明这轮 parity 补强没有破坏现有 Claude Code / Codex / OpenCode 共用 shared-home 的 shipped smoke。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/remove.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/cli/lifecycle-cli.test.ts tests/e2e/shared-home-smoke.test.ts`
- `rg -n "opencode|--opencode-dir" tests/shared-home/remove.test.ts tests/cli/lifecycle-cli.test.ts tests/e2e/shared-home-smoke.test.ts src/shared-home/remove.ts`

## Deviations

- 这轮没有修改 `src/shared-home/remove.ts` 或 `src/bin/skills-broker.ts`，因为现有实现已经满足 OpenCode lifecycle parity；缺口主要在 regression proof。
- CLI doctor 的新 OpenCode 用例只断言 host detection 与 managed-host membership，没有把 `adoptionHealth` 绑死为绿色，因为 strict status / broker-first gate 会受当前 repo truth 影响，那不是 `--opencode-dir` routing contract 本身。

## Next Readiness

- `06-02` 可以直接推进 `doctor` / proof-reuse parity，把 OpenCode 明确纳入 shared `adoptionHealth`、`familyProofs`、`verifiedDownstreamManifests` 证据面。
- `06-03` 的 truth flip 现在已经少了 remove/CLI 空洞，后续只需要等 doctor/proof parity 也成立后再统一移除 caveat。
