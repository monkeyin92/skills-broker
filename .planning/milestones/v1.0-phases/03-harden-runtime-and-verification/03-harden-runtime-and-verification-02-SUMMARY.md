---
phase: 03-harden-runtime-and-verification
plan: 02
subsystem: broker-runtime
tags: [advisory, routing-trace, acquisition-memory, downstream-manifest, degraded-truth]
requires: []
provides:
  - Structured broker `advisories` for trace, acquisition memory, and verified downstream manifest persistence failures
  - Runtime behavior that keeps routing successful while surfacing degraded proof-state outcomes
  - Targeted tests for advisory persistence failures instead of silent swallow branches
affects: [03-03, 03-04, phase-04-operator-truth]
tech-stack:
  added: []
  patterns: [structured-advisories, degraded-with-proof-loss, non-fatal-persistence-signal]
key-files:
  created:
    - tests/broker/run-advisories.test.ts
  modified:
    - src/broker/result.ts
    - src/broker/run.ts
key-decisions:
  - "routing success 仍然非阻塞，但 proof-state 持久化失败不能继续 silent green。"
  - "trace / acquisition memory / verified downstream manifest 都统一暴露成 `advisories`。"
  - "保持 `ok: true` / handoff contract 不变，把 degraded signal 附着在结果对象上。"
patterns-established:
  - "Structured degraded outcomes: 运行时可成功，但 proof/reuse rail 失败必须以机器可读 advisory 暴露。"
  - "Persistence failures stay non-fatal but not silent: operator 可以区分 'route 成功' 与 'route 成功但证据面缺失'。"
requirements-completed: [HARD-02]
duration: 1 session
completed: 2026-04-22
---

# Phase 3 Plan 02 Summary

**broker runtime 现在会把 trace、acquisition memory、verified downstream manifest 的写入失败显式暴露成 `advisories`，而不是继续把 proof-state 丢失吞掉**

## Accomplishments

- `src/broker/result.ts` 新增 `BrokerAdvisory` / `BrokerAdvisoryCode`，把 degraded signal 变成正式 contract。
- `src/broker/run.ts` 把 `persistTraceIfConfigured`、`persistAcquisitionMemoryIfConfigured`、`persistVerifiedDownstreamManifestIfConfigured` 从 silent swallow 改成返回 advisory，并统一挂到 `RunBrokerResult`。
- `tests/broker/run-advisories.test.ts` 锁住 “routing 仍然成功，但 advisory persistence 失败必须可见” 这一条 operator truth。

## Verification

- `npm_execpath=/tmp/skills-broker-npm-shim.mjs /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/broker/run-advisories.test.ts`

## Deviations

- 当前 worktree 已有无关修改与未跟踪文件，因此没有为本 plan 单独 commit；Phase 3 收尾文档统一记录这个 deviation。
- 验证继续使用 workspace runtime Node，而不是 Codex app 内置 Node，以规避本地 Rollup native addon 兼容性问题。

## Next Readiness

- advisory persistence failure 现在已经是结构化 contract，Phase 3 后续 fail-closed recovery 与 Phase 4 operator truth 可以直接消费这层信号。
