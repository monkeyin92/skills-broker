---
phase: 06-prove-opencode-lifecycle-and-reuse
plan: 02
subsystem: doctor-proof-parity
tags: [opencode, doctor, proof-rails, adoption-health, e2e]
requires:
  - phase: 06-prove-opencode-lifecycle-and-reuse
    provides: OpenCode remove and lifecycle CLI parity
provides:
  - Shared doctor proof fixtures that show OpenCode on existing downstream-manifest and reuse rails
  - E2E evidence that OpenCode participates in cross-host reuse through shared acquisition memory
  - Confirmation that adoptionHealth and strict-doctor semantics stay shared for OpenCode
affects: [06-03, operator-truth]
tech-stack:
  added: []
  patterns: [shared-proof-rails, host-agnostic-adoption-health, e2e-doctor-parity]
key-files:
  created:
    - .planning/phases/06-prove-opencode-lifecycle-and-reuse/06-prove-opencode-lifecycle-and-reuse-02-SUMMARY.md
  modified:
    - tests/shared-home/doctor.test.ts
    - tests/e2e/shared-home-smoke.test.ts
key-decisions:
  - "OpenCode parity 继续复用 `verifiedDownstreamManifests`、`familyProofs`、`adoptionHealth` 这些共享 field，不新增任何 `opencodeProofs` 式私有 surface。"
  - "Phase 6 的最小 shared proof family 选择 `web markdown`，因为现有 cross-host reuse seam 最稳定，且能直接证明 OpenCode 参与共享 acquisition memory。"
  - "strict doctor / status no-regression 只做验证，不为了 Phase 6-02 额外改 status 逻辑。"
patterns-established:
  - "证明第三宿主 parity 时，优先把它塞进已有 shared rails，而不是为 host 维度再造 summary。"
  - "E2E parity 证据可以用 adapter reuse + doctor JSON 双重锁定：前者证明 OpenCode 真在用，后者证明 shared surface 真能看见。"
requirements-completed: [HOST-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 6 Plan 02 Summary

**OpenCode 现在已经不只是 doctor inventory 里的第三个名字，而是能在 shared proof rails 上留下可见证据：doctor 会通过同一套 `verifiedDownstreamManifests`、`familyProofs`、`adoptionHealth` 字段呈现它的参与，shared-home smoke 也证明了 OpenCode 与其他宿主共享 acquisition memory 的 cross-host reuse**

## Accomplishments

- `tests/shared-home/doctor.test.ts` 新增 OpenCode-backed proof fixtures，证明 doctor text/JSON 会在现有 `verifiedDownstreamManifests.hosts` 上显示 `opencode=1`，并能把 OpenCode 参与的 Web Markdown reuse 仍旧归纳到共享 `familyProofs` 里。
- 同一个 doctor 测试文件新增了 OpenCode-only managed host 的 adoptionHealth 绿灯场景，确认 clean repo truth 下 `adoptionHealth` 仍保持共享契约，而不是只对 Codex/Claude Code 生效。
- `tests/e2e/shared-home-smoke.test.ts` 现在会在三宿主共用 shared-home 后再跑一次 published `doctor --json`，锁住 `acquisitionMemory.crossHostReuse=1`、`familyProofs.web_content_to_markdown.crossHostReuseState=confirmed`，以及 `managedHosts=["claude-code","codex","opencode"]` 的 e2e 证据。
- `tests/e2e/status-doctor-git.test.ts` 无需修改即可继续通过，说明这轮 OpenCode parity 证明没有破坏 strict doctor / status board 语义。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/doctor.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/shared-home-smoke.test.ts tests/e2e/status-doctor-git.test.ts`
- `rg -n "opencode|verifiedDownstreamManifests|familyProofs|adoptionHealth|cacheHit|cachedCandidateId" src/shared-home/doctor.ts src/shared-home/format.ts tests/shared-home/doctor.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/status-doctor-git.test.ts`

## Deviations

- 这轮没有改 `src/shared-home/doctor.ts` 或 `src/shared-home/format.ts`，因为现有 shared schema 已经足以表达 OpenCode parity；真正缺的是 fixture coverage 和 e2e proof。
- e2e doctor 断言对 `acquisitionMemory` 与 `adoptionHealth` 采用 `objectContaining`，保留了 path/exists/reasons 之类共享字段的扩展空间，不把 proof test 绑死在无关细节上。

## Next Readiness

- `06-03` 现在已经具备移除 Phase 6 caveat 的前提：remove parity、doctor parity、cross-host reuse evidence 都已成立。
- operator truth / README / STATUS / TODOS 可以在下一步统一翻面为“三宿主 full lifecycle parity 已成立”，不再需要保留 “OpenCode parity 待补” 的旧叙事。
