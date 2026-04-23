---
phase: 03-harden-runtime-and-verification
plan: 01
subsystem: host-shell
tags: [runner, awkward-path, codex, claude-code, manifest, shared-home]
requires: []
provides:
  - Runtime-derived host runners that read `brokerHome` from `.skills-broker.json` instead of embedding absolute paths
  - Awkward-path smoke coverage for shared-home, Codex, and Claude Code installs
  - Host-shell assertions that lock website QA first and web markdown second in installed skill docs
affects: [03-02, 03-03, 03-04, phase-04-operator-truth]
tech-stack:
  added: []
  patterns: [runner-manifest-indirection, awkward-path-smoke, installed-shell-order-lock]
key-files:
  created: []
  modified:
    - src/hosts/codex/install.ts
    - src/hosts/claude-code/install.ts
    - tests/hosts/host-shell-install.test.ts
    - tests/e2e/shared-home-smoke.test.ts
    - tests/e2e/claude-code-smoke.test.ts
key-decisions:
  - "runner 不再把 shared-home 绝对路径写进 shell 源，而是在运行时从宿主安装目录下的 `.skills-broker.json` 读取 `brokerHome`。"
  - "awkward path proof 必须覆盖 spaces、quotes、`$` 与 command-substitution 风格片段，而不是只测普通路径。"
  - "installed shell wording 顺序继续固定为 website QA first、web markdown second。"
patterns-established:
  - "Manifest-derived runner path: host runner 只依赖安装目录附近的 managed manifest，不依赖生成时路径常量。"
  - "Awkward path smoke as release gate: 路径安全回归必须通过 e2e / installer tests 一起锁住。"
requirements-completed: [HARD-01]
duration: 1 session
completed: 2026-04-22
---

# Phase 3 Plan 01 Summary

**宿主 runner 现在在运行时从 managed manifest 解析 `brokerHome`，并且 Codex / Claude Code / shared-home awkward path 安装都被 smoke tests 锁成可回归 proof**

## Accomplishments

- `src/hosts/codex/install.ts` 与 `src/hosts/claude-code/install.ts` 不再把 `brokerHomeDirectory` 绝对路径硬编码进 runner，而是从 `.skills-broker.json` 读取。
- `tests/e2e/shared-home-smoke.test.ts` 与 `tests/e2e/claude-code-smoke.test.ts` 现在会在带 spaces、quotes、`$HOME`、`$(...)` 片段的路径下安装并执行 runner。
- `tests/hosts/host-shell-install.test.ts` 同时锁住 runner 必须引用 manifest、不能泄露绝对 broker-home 路径，以及 installed shell 的 lane 顺序。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /tmp/skills-broker-npm-shim.mjs run build`
- `npm_execpath=/tmp/skills-broker-npm-shim.mjs /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/claude-code-smoke.test.ts`

## Deviations

- 当前 worktree 已有无关修改与未跟踪文件，因此没有为本 plan 单独 commit；Phase 3 收尾文档统一记录这个 deviation。
- 验证阶段没有使用 Codex app 内置 Node，因为它会在本仓库上被 Rollup optional native dependency 卡住；改用 workspace runtime Node。

## Next Readiness

- runner path hardening 已落地，后续 advisory persistence、rollback/manual-recovery 和 contributor verification 都可以直接建立在同一套 shared-home / host-shell 产物上。
