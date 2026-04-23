---
phase: 03-harden-runtime-and-verification
status: passed
verified: 2026-04-22
requirements:
  - HARD-01
  - HARD-02
  - HARD-04
evidence:
  - 03-harden-runtime-and-verification-01-SUMMARY.md
  - 03-harden-runtime-and-verification-02-SUMMARY.md
  - 03-harden-runtime-and-verification-03-SUMMARY.md
  - 03-harden-runtime-and-verification-04-SUMMARY.md
---

# Phase 3 Verification

## Result

`passed`

## Goal Check

Phase goal: 把最容易引发高 blast radius 回归的 shared-home、runner 与 contributor verification 问题压到可控范围内。

Verdict: 达成。runner path 不再依赖生成时绝对路径，advisory persistence failure 已变成结构化 degraded signal，shared-home 的最高风险 rollback/manual-recovery 分支已 fail-closed 并被测试覆盖，本地 contributor verification 也拿到了 repo-owned preflight / repair path。

## Requirement Traceability

- `HARD-01`: `src/hosts/codex/install.ts`、`src/hosts/claude-code/install.ts` 与 awkward-path smoke / installer tests 证明 runner 会在运行时从 `.skills-broker.json` 解析 `brokerHome`，并在带 spaces、quotes、`$`、`$(...)` 的路径下继续工作。
- `HARD-02`: `src/broker/result.ts`、`src/broker/run.ts`、`tests/broker/run-advisories.test.ts` 证明 proof-state persistence failure 不再 silent green；`src/shared-home/update.ts`、`src/shared-home/format.ts`、`tests/shared-home/update-lifecycle.test.ts`、`tests/cli/lifecycle-cli.test.ts` 证明 rollback/manual-recovery blocker 会 fail closed 并暴露清晰 operator truth。
- `HARD-04`: `src/dev/local-verification.ts`、`scripts/verify-local.mjs`、`tests/dev/local-verification.test.ts`、`tests/helpers/npm.ts`、`README.md`、`README.zh-CN.md` 证明 contributor verification 已有 deterministic preflight / repair path，并与 CI baseline 对齐。

## Automated Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /tmp/skills-broker-npm-shim.mjs run build`
- `npm_execpath=/tmp/skills-broker-npm-shim.mjs /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/claude-code-smoke.test.ts tests/broker/run-advisories.test.ts tests/shared-home/doctor.test.ts tests/shared-home/update-lifecycle.test.ts tests/cli/lifecycle-cli.test.ts tests/dev/local-verification.test.ts`
- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --import ./scripts/register-ts-node.mjs ./scripts/verify-local.mjs --check-only`

## Must-Haves

- awkward install path runner safety has executable proof: passed
- advisory persistence failures are visible as structured degraded outcomes: passed
- highest-risk rollback/manual-recovery branch is fail-closed and no longer skipped: passed
- contributor verification has a deterministic repo-owned preflight / repair path: passed

## Gaps

无。

## Verification Notes

- 当前 workspace runtime Node 是 v24.14.0，因此 `verify-local --check-only` 会按设计拒绝本机 runtime 并输出 Node 22 / npm repair guidance；这证明预检入口是 deterministic 的，而不是又一次在 Rollup/Vitest 启动前炸栈。
- 当前 worktree 已有无关修改与未跟踪文件，因此本 phase 没有生成可安全提交的原子 commit；相关 deviation 已记录在 4 个 summary 中。
