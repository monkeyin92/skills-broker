---
phase: 06-prove-opencode-lifecycle-and-reuse
status: passed
verified: 2026-04-23
requirements:
  - HOST-03
evidence:
  - 06-prove-opencode-lifecycle-and-reuse-01-SUMMARY.md
  - 06-prove-opencode-lifecycle-and-reuse-02-SUMMARY.md
  - 06-prove-opencode-lifecycle-and-reuse-03-SUMMARY.md
---

# Phase 6 Verification

## Result

`passed`

## Goal Check

Phase goal: 让 OpenCode 拿到与 Claude Code / Codex 对等的 lifecycle、doctor 与 proof / reuse 体验，而不是只多了一个安装入口。

Verdict: 达成。OpenCode 现在已经拿到 published `remove` / `doctor` / `--opencode-dir` lifecycle parity、进入 shared `verifiedDownstreamManifests` / `familyProofs` / `adoptionHealth` proof rails，并且 repo docs、STATUS/TODOS、installed shell 全部翻到“三宿主 full lifecycle parity 已成立”的 canonical operator truth。

## Requirement Traceability

- `HOST-03`: `tests/shared-home/remove.test.ts`、`tests/cli/lifecycle-cli.test.ts`、`tests/shared-home/doctor.test.ts`、`tests/e2e/shared-home-smoke.test.ts`、`tests/e2e/status-doctor-git.test.ts`、`src/core/operator-truth.ts`、`src/hosts/skill-markdown.ts`、`README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 共同证明 OpenCode 已经进入与 Claude Code / Codex 同级的 lifecycle、doctor、proof/reuse、operator truth contract，而没有引入 OpenCode-only runtime surface。

## Automated Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/remove.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/cli/lifecycle-cli.test.ts tests/e2e/shared-home-smoke.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/doctor.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/shared-home-smoke.test.ts tests/e2e/status-doctor-git.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts`
- `rg -n "opencode|--opencode-dir|verifiedDownstreamManifests|familyProofs|adoptionHealth|cacheHit|cachedCandidateId" tests/shared-home/remove.test.ts tests/cli/lifecycle-cli.test.ts tests/shared-home/doctor.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/status-doctor-git.test.ts`
- `rg -n "Phase 6|lifecycle / proof parity continues|继续在 Phase 6 补齐|OpenCode thin host shell is shipping in Phase 5|Phase 6 keeps the same" src/core/operator-truth.ts README.md README.zh-CN.md TODOS.md STATUS.md tests/shared-home/operator-truth-parity.test.ts`
  Result: no matches

## Must-Haves

- OpenCode published `remove` / `doctor` / CLI option surface 与现有宿主保持同级 clarity: passed
- doctor 通过 shared `verifiedDownstreamManifests` / `familyProofs` / `adoptionHealth` 表达 OpenCode parity，而不是分叉出 host-local counters: passed
- 至少一条跨宿主 evidence 证明 OpenCode 与现有宿主共享 reuse state: passed
- repo docs、STATUS/TODOS、installed shell truth 不再保留 “Phase 6 parity 待补” caveat: passed

## Gaps

无。

## Verification Notes

- `shared-home-smoke` 现在会在发布态 e2e 前显式重建 `dist/`，否则 installed-shell truth 可能误读旧 copy；这是验证链路修正，不是产品语义回退。
- 本 phase 的实现主要落在 regression proof 与 operator truth 收口，而不是新增产品 runtime 分叉；这正符合 `HOST-03` 对 shared rails / no-fork 的约束。
