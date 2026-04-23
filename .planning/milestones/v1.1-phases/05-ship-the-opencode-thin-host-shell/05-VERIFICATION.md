---
phase: 05-ship-the-opencode-thin-host-shell
status: passed
verified: 2026-04-23
requirements:
  - HOST-01
  - HOST-02
evidence:
  - 05-ship-the-opencode-thin-host-shell-01-SUMMARY.md
  - 05-ship-the-opencode-thin-host-shell-02-SUMMARY.md
  - 05-ship-the-opencode-thin-host-shell-03-SUMMARY.md
  - 05-ship-the-opencode-thin-host-shell-04-SUMMARY.md
---

# Phase 5 Verification

## Result

`passed`

## Goal Check

Phase goal: 把 OpenCode 从 deferred readiness contract 推进成真正 shipping 的第三宿主，同时继续守住 thin-shell 与 shared broker home 边界。

Verdict: 达成。`opencode` 现在已经是 canonical 第三宿主 id，`npx skills-broker update` 能在 shared broker home 上真实 attach OpenCode thin host shell，installed shell 继续只暴露 coarse broker-first boundary，三宿主 shared-home / routing smoke 也已成立。repo truth 现已同步翻到 “Claude Code、Codex、OpenCode supported”，同时把完整 lifecycle / proof parity 明确留在 Phase 6。

## Requirement Traceability

- `HOST-01`: `src/core/types.ts`、`src/shared-home/paths.ts`、`src/shared-home/update.ts`、`src/hosts/opencode/install.ts`、`src/hosts/opencode/adapter.ts`、`tests/shared-home/update-lifecycle.test.ts`、`tests/shared-home/doctor.test.ts`、`tests/e2e/shared-home-smoke.test.ts` 共同证明 OpenCode 能通过现有 shared broker home attach，不需要第二套 runtime。
- `HOST-02`: `src/hosts/skill-markdown.ts`、`tests/hosts/host-shell-install.test.ts`、`tests/e2e/host-auto-routing-smoke.test.ts`、`tests/shared-home/operator-truth-parity.test.ts` 共同证明 OpenCode installed shell 继续只决定 `broker_first` / `handle_normally` / `clarify_before_broker`，并且 support-matrix truth 与宿主壳 copy 保持一致。

## Automated Verification

- `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json && node -e "const fs=require('fs');const file='dist/bin/skills-broker.js';const content=fs.readFileSync(file,'utf8');if(!content.startsWith('#!'))fs.writeFileSync(file,'#!/usr/bin/env node\\n'+content);"`
- `node ./node_modules/vitest/vitest.mjs --run tests/core/envelope.test.ts tests/cli/cli-contract.test.ts tests/shared-home/update-lifecycle.test.ts tests/shared-home/doctor.test.ts tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/host-auto-routing-smoke.test.ts tests/shared-home/operator-truth-parity.test.ts tests/shared-home/status.test.ts`
- `rg -n 'Claude Code, Codex, OpenCode|现在支持：Claude Code、Codex、OpenCode|Phase 6|lifecycle / proof parity|OpenCode' src/core/operator-truth.ts README.md README.zh-CN.md TODOS.md STATUS.md package.json tests/shared-home/operator-truth-parity.test.ts`

## Must-Haves

- OpenCode 可以安装 thin host shell 并复用现有 shared broker home: passed
- OpenCode installed shell 继续只暴露 coarse broker-first boundary: passed
- 第三宿主接入没有让 Claude Code / Codex 的 shared-home 或 routing truth 回归: passed
- support matrix 只在真实 shipping attach path 存在后翻面，同时保留 Phase 6 caveat: passed

## Gaps

无。

## Verification Notes

- 本 phase 的发布态 e2e proof 依赖先重建 `dist/`。第一次把 build 与 dist-backed e2e 并行跑时出现了旧 dist 造成的假阴性；按正确顺序重跑后，9 个目标测试文件全部通过。这是验证顺序问题，不是产品回归。
- 当前 worktree 仍有大量既存修改与未跟踪文件，因此本 phase 没有生成可安全提交的原子 commit；相关 deviation 已记录在 4 个 summary 中。
