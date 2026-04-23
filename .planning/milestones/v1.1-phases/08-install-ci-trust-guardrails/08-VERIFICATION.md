---
phase: 08-install-ci-trust-guardrails
status: passed
verified: 2026-04-23
requirements:
  - QUAL-01
  - QUAL-02
evidence:
  - 08-install-ci-trust-guardrails-01-SUMMARY.md
  - 08-install-ci-trust-guardrails-02-SUMMARY.md
---

# Phase 8 Verification

## Result

`passed`

## Goal Check

Phase goal: 把 blind-spot reporting 与 narrative parity 从 repo truth 提升为 CI truth，让 ship 前的关键回归不再只靠 milestone 末尾人工补账。

Verdict: 达成。CI 现在会显式运行 inventory-driven blind-spot report 与 focused narrative parity suite，并继续保留 strict repo proof gate。新增宿主、新增 family、新增 workflow 如果没有对应 proof surface，会在 CI 中 fail closed；`verify:local` 也仍然保持为本地环境预检，而不是第二套 CI truth orchestration。

## Requirement Traceability

- `QUAL-01`: `src/dev/ci-trust.ts`、`scripts/ci-trust-report.mjs`、`package.json`、`.github/workflows/ci.yml`、`tests/dev/ci-trust.test.ts` 共同证明 CI blind-spot / coverage budget 已经成为显式 gate，且基于 live repo inventory fail closed。
- `QUAL-02`: `package.json`、`.github/workflows/ci.yml`、`tests/shared-home/operator-truth-parity.test.ts`、`tests/hosts/host-shell-install.test.ts`、`README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md` 共同证明 narrative parity 已进入 CI，并且 local verify vs CI trust guards 的职责边界清晰。

## Automated Verification

- `node --import ./scripts/register-ts-node.mjs ./scripts/ci-trust-report.mjs`
- `node ./node_modules/vitest/vitest.mjs --run tests/dev/ci-trust.test.ts tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts tests/cli/cli-contract.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/sources/host-skill-catalog.test.ts tests/core/maintained-broker-first.test.ts tests/shared-home/status.test.ts`
- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`

## Must-Haves

- CI 输出 coverage budget / blind-spot report 并标出高风险 surface 缺口: passed
- README、README.zh-CN、STATUS、TODOS、installed shell narrative parity 进入 CI: passed
- 新增宿主 / family / workflow 的 drift 会在 CI 中 fail closed: passed
- `verify:local` 与 CI quality gates 职责边界清晰: passed

## Gaps

无。

## Verification Notes

- Phase 8 的 blind-spot report 在第一次运行时确实抓到了两个真实回归点：`social_post_to_markdown` 在 real host seed 缺少 `proofFamily`，以及 `idea-to-ship` 缺少 CLI proof。这证明 guardrail 不是“走过场脚本”，而是在消费真实 repo truth。
- 当前桌面环境里 `npm` 不在 PATH 上，因此本轮没有直接通过裸 `npm run ...` 调命令，而是用 `node --import ./scripts/register-ts-node.mjs ...` 和 `node ./node_modules/vitest/vitest.mjs --run ...` 完成等价验证。这是环境约束，不影响 CI wiring 本身。
