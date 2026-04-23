---
phase: 08-install-ci-trust-guardrails
plan: 02
subsystem: narrative-parity-ci-gate
tags: [ci, docs, parity, operator-truth, installed-shell]
requires:
  - phase: 08-install-ci-trust-guardrails
    plan: 01
    provides: explicit trust job and repo-native CI guardrail infrastructure
provides:
  - Focused narrative parity CI gate
  - Clear local-vs-ci verification boundary in operator docs
  - Updated STATUS/TODOS truth for CI guardrails
affects: [phase-8, ci, docs, operator-truth]
tech-stack:
  added: []
  patterns: [focused-parity-suite, docs-vs-ci-boundary-clarification, repo-status-truth-forwarding]
key-files:
  created:
    - .planning/phases/08-install-ci-trust-guardrails/08-install-ci-trust-guardrails-02-SUMMARY.md
  modified:
    - package.json
    - .github/workflows/ci.yml
    - README.md
    - README.zh-CN.md
    - STATUS.md
    - TODOS.md
    - tests/dev/ci-trust.test.ts
key-decisions:
  - "narrative parity 不再只靠 `npm test` 顺带覆盖，而是通过 `npm run test:ci:narrative-parity` 作为 focused suite 显式挂进 CI。"
  - "这条 gate 继续复用 canonical operator truth contract、`operator-truth-parity` tests 和 installed-shell tests，而不是另起一套文档真相。"
  - "README 双语现在明确区分 `verify:local` 与 CI trust guards：前者检查本机 build/test readiness，后者检查 repo truth drift。"
patterns-established:
  - "operator-facing narrative drift 应该用 focused parity suite 快速失败，而不是埋在大而杂的全量测试里。"
  - "当 CI 新增显式 guardrail 时，repo docs 也必须同步解释其职责边界，否则用户会把 local verify 和 CI truth 混为一谈。"
requirements-completed: [QUAL-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 8 Plan 02 Summary

**README、README.zh-CN、STATUS、TODOS 与 installed shell truth 现在不再只是“碰巧被全量测试覆盖”；它们有了一条显式、快速、可读的 CI parity gate。与此同时，repo docs 也把 `verify:local` 与 CI trust guards 的分工说清楚了。**

## Accomplishments

- `package.json` 新增 `test:ci:narrative-parity`，focused 运行 `tests/shared-home/operator-truth-parity.test.ts` 与 `tests/hosts/host-shell-install.test.ts`。
- `.github/workflows/ci.yml` 的 `trust` job 现在先跑 blind-spot report，再跑 focused narrative parity，然后才放行 broader build/test/status jobs。
- `README.md` 与 `README.zh-CN.md` 已明确说明：`verify:local` 只回答“这台机器能不能稳定跑 baseline build/test”；CI trust guards 则负责发现支持矩阵、family/workflow proof 与 operator-facing docs drift。
- `STATUS.md` 与 `TODOS.md` 已从“准备补 CI guardrails”前推到“CI guardrails 已经接进来”，并同步写入 exact lifecycle / support-matrix truth。
- `tests/dev/ci-trust.test.ts` 反向锁住 workflow 仍然运行 blind-spot report 和 narrative parity suite，避免 CI wiring 被静默移除。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/dev/ci-trust.test.ts tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts`
- `node --import ./scripts/register-ts-node.mjs ./scripts/ci-trust-report.mjs`

## Deviations

- 没有为 narrative parity 再造新的 spec 文件或 JSON contract。继续复用 `src/core/operator-truth.ts` 和已有 tests，保持 truth 收敛。
- 没有把 `verify:local` 改成启动 trust suite；这样本地预检职责仍然稳定、容易解释。

## Next Readiness

- v1.1 的所有 roadmap phases 现在都已经执行并验证通过，milestone 可以进入 audit / complete。
- 下一轮最值钱的工作是把 CI truth 接进 ship/release 决策，而不是再手工复核。
