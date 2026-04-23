---
phase: 03-harden-runtime-and-verification
plan: 04
subsystem: developer-experience
tags: [verify-local, node-22, rollup, vitest, npm, contributor]
requires: [01, 02, 03]
provides:
  - Repo-owned `verify:local` preflight and repair path aligned to CI baseline
  - Typed local verification health contract for Node, npm CLI, Rollup native, and Vitest entry readiness
  - Shared npm CLI path resolution between contributor scripts and test helpers
affects: [phase-04-operator-truth, contributor-onboarding]
tech-stack:
  added: []
  patterns: [preflight-before-suite, repo-owned-repair-steps, shared-npm-cli-resolution]
key-files:
  created:
    - src/dev/local-verification.ts
    - scripts/verify-local.mjs
    - scripts/register-ts-node.mjs
    - tests/dev/local-verification.test.ts
  modified:
    - package.json
    - tests/helpers/npm.ts
    - README.md
    - README.zh-CN.md
key-decisions:
  - "本地 contributor verification 的 canonical 入口是 `npm run verify:local`，不是 trial-and-error 的命令拼接。"
  - "preflight 先检查 Node 22、npm CLI、Rollup native、Vitest entry，再决定是否进入 `npm run build` / `npm test`。"
  - "测试 helper 和 contributor script 共用同一套 npm CLI path 推导，避免再次分叉。"
patterns-established:
  - "Preflight before expensive suite: 先给 deterministic health verdict，再跑 build/test。"
  - "Repo-owned repair guidance: 环境坏掉时输出固定修复步骤，而不是把 stack trace 当说明文档。"
requirements-completed: [HARD-04]
duration: 1 session
completed: 2026-04-22
---

# Phase 3 Plan 04 Summary

**仓库现在自带 `verify:local` 预检与修复指引，贡献者会先拿到 Node 22 / npm / Rollup / Vitest 的健康结论，再决定是否运行 `npm run build` 和 `npm test`**

## Accomplishments

- `src/dev/local-verification.ts` 新增 typed health contract，覆盖 Node 22 baseline、npm CLI path、Rollup native、Vitest entry 与 repair steps。
- `package.json`、`scripts/verify-local.mjs`、`scripts/register-ts-node.mjs` 新增 repo-owned `verify:local`、`verify:local:check`、`verify:local:repair` 入口。
- `tests/helpers/npm.ts` 现在复用同一套 npm CLI path resolver，不再和 contributor verification script 各走各路。
- `README.md` / `README.zh-CN.md` 把本地验证基线收口成 “Node 22 + npm ci + npm run verify:local”，并明确说明 `--check-only` 修复路径。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /tmp/skills-broker-npm-shim.mjs run build`
- `npm_execpath=/tmp/skills-broker-npm-shim.mjs /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/dev/local-verification.test.ts tests/cli/lifecycle-cli.test.ts`
- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --import ./scripts/register-ts-node.mjs ./scripts/verify-local.mjs --check-only`（在当前 Node 24 runtime 下按预期 fail closed，并输出 deterministic repair steps）

## Deviations

- 当前 worktree 已有无关修改与未跟踪文件，因此没有为本 plan 单独 commit；Phase 3 收尾文档统一记录这个 deviation。
- 当前可用 workspace runtime Node 是 v24.14.0，而本 plan 的 canonical baseline 是 Node 22；因此预检脚本验证的是“正确拒绝并给出 repair guidance”，不是“在本机直接跑绿 Node 22 baseline”。

## Next Readiness

- contributor verification 的入口和修复路径已经 repo-owned 化，Phase 4 可以把重点放到 README / STATUS / TODOS / host shell 的 operator truth parity 与扩展 readiness 上。
