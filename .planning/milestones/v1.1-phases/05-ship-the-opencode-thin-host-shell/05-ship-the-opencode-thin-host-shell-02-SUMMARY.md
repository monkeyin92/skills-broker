---
phase: 05-ship-the-opencode-thin-host-shell
plan: 02
subsystem: host-shell
tags: [opencode, host-shell, shared-home, doctor, lifecycle]
requires:
  - phase: 05-ship-the-opencode-thin-host-shell
    provides: canonical `opencode` host identity, CLI flag, and path detection
provides:
  - OpenCode Codex-style thin host shell installer and adapter
  - Shared `update` path that can attach OpenCode into the same broker home
  - Doctor inventory truth that detects OpenCode while still showing proof/downstream parity as missing
affects: [05-03, 05-04, shared-home, host-shells]
tech-stack:
  added: []
  patterns: [codex-style-third-host-shell, shared-update-attach, honest-doctor-inventory]
key-files:
  created:
    - src/hosts/opencode/install.ts
    - src/hosts/opencode/adapter.ts
    - .planning/phases/05-ship-the-opencode-thin-host-shell/05-ship-the-opencode-thin-host-shell-02-SUMMARY.md
  modified:
    - src/shared-home/update.ts
    - src/broker/acquisition-memory.ts
    - tests/hosts/host-shell-install.test.ts
    - tests/shared-home/update-lifecycle.test.ts
    - tests/shared-home/doctor.test.ts
key-decisions:
  - "OpenCode shell 直接复用 Codex-style thin shell：`SKILL.md` + `bin/run-broker` + `.skills-broker.json`。"
  - "published `update` 继续走同一条 host loop，不为 OpenCode 发明单独 attach path。"
  - "doctor 只把 OpenCode 纳入 detected/missing inventory，不提前把 downstream manifests 或 proof parity 写成 present。"
patterns-established:
  - "Third host ships as a thin shell first, parity later: attach 与 inventory 先真实存在，proof/reuse/full lifecycle parity 后续补齐。"
  - "Shared-home lifecycle remains the only installation surface across hosts."
requirements-completed: [HOST-01, HOST-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 5 Plan 02 Summary

**OpenCode 现在已经拥有真实可安装的 thin host shell，并且能通过同一条 shared-home update path attach；doctor 也会把它识别成已管理宿主，但仍诚实显示 downstream/proof parity 未完成**

## Accomplishments

- 新增 `src/hosts/opencode/install.ts` 与 `src/hosts/opencode/adapter.ts`，整体形态对齐 Codex：`SKILL.md`、`bin/run-broker`、`.skills-broker.json`，且 `BROKER_CURRENT_HOST="opencode"`、`invocationMode="explicit"` 被锁死。
- `src/shared-home/update.ts` 现在会在统一 host loop 中调用 `installOpenCodeHostShell()`，不再把 OpenCode 误路由到 Codex installer。
- `tests/hosts/host-shell-install.test.ts` 扩成三宿主 shell regression，验证 OpenCode shell 仍沿用 coarse broker-first markdown contract，而不是发明 host-native 入口逻辑。
- `tests/shared-home/update-lifecycle.test.ts` 和 `tests/shared-home/doctor.test.ts` 证明 OpenCode 能通过 shared `update` attach，并在 `doctor` 中呈现为 `detected` + `verifiedDownstreamManifests.missing` 的最小诚实状态。
- `src/broker/acquisition-memory.ts` 的 host validation 同步接受 `opencode`，为后续 OpenCode e2e routing 避免运行期 host whitelist 漏洞。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/hosts/host-shell-install.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/update-lifecycle.test.ts tests/shared-home/doctor.test.ts`

## Deviations

- update/doctor 新增的 OpenCode 断言需要显式隔离 `homeDirectory` 与 broker-first gate artifact，否则会被本机已有 Claude/Codex host state 污染；这是测试隔离修正，不是产品语义变更。
- 当前 worktree 仍保留既存未跟踪 planning/噪音文件，因此本 plan 没有生成原子 commit。

## Next Readiness

- `runOpenCodeAdapter()` 已经具备真实壳层，可直接在 `05-03` 中加入 shared-home smoke 和 installed-shell routing smoke。
- OpenCode 已进入 lifecycle inventory，`05-04` 可以在此基础上翻转 support matrix，同时继续保留 Phase 6 parity caveat。
