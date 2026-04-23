---
phase: 05-ship-the-opencode-thin-host-shell
plan: 03
subsystem: e2e-smoke
tags: [opencode, smoke, e2e, shared-home, routing]
requires:
  - phase: 05-ship-the-opencode-thin-host-shell
    provides: OpenCode thin shell installer, adapter, and lifecycle inventory plumbing
provides:
  - Three-host shared-home attach/no-regression smoke
  - OpenCode installed-shell routing proof for broker-owned handoff and decline outcomes
  - Evidence that Claude Code and Codex remain green after third-host attach
affects: [05-04, release-readiness, e2e]
tech-stack:
  added: []
  patterns: [three-host-shared-home-smoke, installed-shell-opencode-routing, dist-backed-e2e-proof]
key-files:
  created:
    - .planning/phases/05-ship-the-opencode-thin-host-shell/05-ship-the-opencode-thin-host-shell-03-SUMMARY.md
  modified:
    - tests/e2e/shared-home-smoke.test.ts
    - tests/e2e/host-auto-routing-smoke.test.ts
    - dist/bin/skills-broker.js
    - dist/hosts/opencode/install.js
    - dist/hosts/opencode/adapter.js
key-decisions:
  - "OpenCode smoke 直接走发布态 `dist/bin/skills-broker.js`，确保验证的是 shipping surface，不是只在 `src/` 中自洽。"
  - "shared-home smoke 同时验证 managedHosts 变成三宿主与 OpenCode adapter `currentHost` truth。"
  - "installed-shell routing smoke 让 OpenCode 同时覆盖 `HANDOFF_READY` 与 `UNSUPPORTED_REQUEST`，证明它仍停留在 broker-owned coarse boundary。"
patterns-established:
  - "E2E proofs must run against built dist when the contract is a published lifecycle CLI."
  - "Third-host smoke is no-regression smoke: new host added without dropping the incumbent hosts."
requirements-completed: [HOST-01, HOST-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 5 Plan 03 Summary

**三宿主 smoke 现已成立：Claude Code、Codex、OpenCode 能挂到同一 shared broker home，OpenCode installed shell 也会返回与现有宿主同一类 broker-owned routed/declined outcome**

## Accomplishments

- `tests/e2e/shared-home-smoke.test.ts` 扩成三宿主 attach proof，`doctor --json` 的 `managedHosts` 现在要求 `["claude-code", "codex", "opencode"]`，并且 `runOpenCodeAdapter()` 断言 `handoff.context.currentHost === "opencode"`。
- `tests/e2e/shared-home-smoke.test.ts` 还验证了 OpenCode shell 的 `SKILL.md` / runner 仍沿用同一 coarse broker-first contract，没有引入单独的 host-native copy。
- `tests/e2e/host-auto-routing-smoke.test.ts` 把 OpenCode 纳入 installed-shell routing smoke，覆盖 `HANDOFF_READY` 与 `UNSUPPORTED_REQUEST`，并保留 Claude/Codex 的原有 routed/declined case。
- 重新构建 `dist/` 后，发布态 lifecycle CLI 已经认识 `--opencode-dir`，因此 smoke 证明的是实际 shipping surface，而不是只在源码层通过。

## Verification

- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json && node -e "const fs=require('fs');const file='dist/bin/skills-broker.js';const content=fs.readFileSync(file,'utf8');if(!content.startsWith('#!'))fs.writeFileSync(file,'#!/usr/bin/env node\\n'+content);"`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/shared-home-smoke.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/host-auto-routing-smoke.test.ts`

## Deviations

- e2e smoke 依赖发布态 `dist/bin/skills-broker.js`，因此在新增 `--opencode-dir` 后需要显式重建 dist 才能让 smoke 覆盖真实 shipping contract。
- 当前 worktree 仍保留既存未跟踪 planning/噪音文件，因此本 plan 没有生成原子 commit。

## Next Readiness

- OpenCode 的真实 attach path 与 e2e no-regression 证据都已成立，`05-04` 可以把 operator truth 从 deferred 翻到 supported。
- Phase 6 caveat 仍需保留，因为当前 smoke 证明的是 shipping shell 与 coarse routing，不是 full lifecycle/proof parity。
