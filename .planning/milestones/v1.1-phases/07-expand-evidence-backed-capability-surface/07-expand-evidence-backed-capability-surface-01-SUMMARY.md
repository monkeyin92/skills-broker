---
phase: 07-expand-evidence-backed-capability-surface
plan: 01
subsystem: social-family-proof
tags: [social-markdown, family-proofs, operator-truth, installed-shell, e2e]
requires:
  - phase: 06-prove-opencode-lifecycle-and-reuse
    provides: three-host lifecycle and proof/reuse parity
provides:
  - Canonical `familyProofs.social_post_to_markdown` truth on the shared doctor surface
  - Integration and installed-shell proof for social markdown install -> verify -> cross-host reuse
  - Operator truth and repo docs updated to the hierarchy website QA -> web markdown -> social markdown
affects: [07-02, 07-03, phase-8, release-narrative]
tech-stack:
  added: []
  patterns: [shared-family-proof-rails, hierarchy-preserving-operator-truth, dist-backed-installed-shell-proof]
key-files:
  created:
    - .planning/phases/07-expand-evidence-backed-capability-surface/07-expand-evidence-backed-capability-surface-01-SUMMARY.md
  modified:
    - src/shared-home/doctor.ts
    - src/shared-home/format.ts
    - src/core/operator-truth.ts
    - src/hosts/skill-markdown.ts
    - tests/shared-home/doctor.test.ts
    - tests/integration/broker-flow.test.ts
    - tests/e2e/shared-home-smoke.test.ts
    - tests/shared-home/operator-truth-parity.test.ts
    - tests/hosts/host-shell-install.test.ts
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
key-decisions:
  - "social markdown 不新造 proof rail，直接复用 `familyProofs`、acquisition memory、verified downstream manifests 和 installed-shell truth。"
  - "operator hierarchy 继续保持 website QA hero lane + web markdown second proven family，只把 social markdown 追加为 next proven family。"
  - "installed-shell smoke 通过 shared cache + published runner 证明 social family 也能继承三宿主 shared-home 复用，而不是只在 unit/integration 里成立。"
patterns-established:
  - "新增 proven family 时，先落 shared doctor truth，再翻 operator truth，最后用 installed-shell smoke 锁发布态 copy。"
  - "第三条 family 只扩 surface，不重排 hierarchy；hero lane 和 second proven family 位置保持稳定。"
requirements-completed: [CAP-01]
duration: 1 session
completed: 2026-04-23
---

# Phase 7 Plan 01 Summary

**`social_post_to_markdown` 现在已经不是一个“能路由但没证明”的半成品，而是共享 doctor proof rail 上的第三条 proven family；repo docs、installed shell 和 STATUS/TODOS 也已经同步承认 website QA -> web markdown -> social markdown 这条 operator hierarchy**

## Accomplishments

- `src/shared-home/doctor.ts` 和 `src/shared-home/format.ts` 扩成支持 `social_post_to_markdown`，让 doctor JSON/text 通过同一套 `familyProofs`、acquisition memory、verified downstream manifest truth 呈现 social family，而不是引入 social-only surface。
- `tests/integration/broker-flow.test.ts` 新增 social markdown 的完整 `INSTALL_REQUIRED -> HANDOFF_READY -> cross-host reuse` 证明，并且把第二跳放到 OpenCode，证明第三条 family 继承了三宿主 shared-home contract。
- `tests/shared-home/doctor.test.ts` 现在会把 social markdown 当成 canonical familyProofs 的一部分来断言，并在 text output 中锁住它的 verify/reuse/replay/proven 文案。
- `src/core/operator-truth.ts`、`src/hosts/skill-markdown.ts`、`tests/shared-home/operator-truth-parity.test.ts`、`tests/hosts/host-shell-install.test.ts`、`tests/e2e/shared-home-smoke.test.ts` 一起把 installed shell / repo docs truth 翻成三级 hierarchy：website QA hero lane，web markdown second proven family，social markdown next proven family。
- `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 都已经同步写明 social markdown 的 proof loop，不再把 capability surface 说成只到 web markdown 为止。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts tests/shared-home/doctor.test.ts tests/integration/broker-flow.test.ts tests/e2e/shared-home-smoke.test.ts`
- `rg -n "social_post_to_markdown|social markdown|thirdProvenFamily|familyProofs" src/shared-home/doctor.ts src/shared-home/format.ts src/core/operator-truth.ts src/hosts/skill-markdown.ts tests/shared-home/doctor.test.ts tests/integration/broker-flow.test.ts tests/e2e/shared-home-smoke.test.ts tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts README.md README.zh-CN.md TODOS.md STATUS.md`

## Deviations

- social family 没有复用 web-only semantic direct-route 断言，因为当前 semantic resolver 仍然只给 `web_content_to_markdown` 特殊直达优化；这次 proof 依旧通过 query-native routing、install_required、cross-host reuse 完成。
- installed-shell smoke 里的 social family 证明刻意复用同一份 shared cache，这样 OpenCode 第二跳能证明“发布态 runner 也会继承 shared-home reuse”，而不是只验证单宿主安装。

## Next Readiness

- `07-02` 可以直接把 investigation lane 升格成第二条 broker-owned workflow，因为 Phase 7 现在已经证明 surface 扩张不会破坏 shared doctor truth 或 installed-shell hierarchy。
- `07-03` 可以继续把 MCP registry source 提升到 registry-ready metadata / explainability，因为 proven family truth 已经先补上，后续可以专注在 source trust 而不是再补 product hierarchy。
