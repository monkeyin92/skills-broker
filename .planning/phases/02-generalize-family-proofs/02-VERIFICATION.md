---
phase: 02-generalize-family-proofs
status: passed
verified: 2026-04-22
requirements:
  - ENTRY-03
  - ROUTE-04
  - GROW-01
evidence:
  - 02-generalize-family-proofs-01-SUMMARY.md
  - 02-generalize-family-proofs-02-SUMMARY.md
  - 02-generalize-family-proofs-03-SUMMARY.md
---

# Phase 2 Verification

## Result

`passed`

## Goal Check

Phase goal: 在不重开已完成迁移的前提下，把 QA proof loop 推广到 `web_content_to_markdown` 等 proven family。

Verdict: 达成。`familyProofs` 已成为 canonical proof surface，website QA 继续是唯一 hero lane，web markdown 拿到了 install -> verify -> cross-host reuse 级别的第二条 proven family 证据，而且 docs / host shell / STATUS / TODOS 都同步到了同一套 operator truth。

## Requirement Traceability

- `ENTRY-03`: `src/shared-home/doctor.ts`、`tests/shared-home/doctor.test.ts` 与 `tests/cli/lifecycle-cli.test.ts` 证明 `familyProofs` 是 canonical surface，`websiteQaLoop` 只是 strict gate 兼容 alias；`src/hosts/skill-markdown.ts`、`README.md`、`README.zh-CN.md` 共同证明 website QA 继续保持唯一 first move。
- `ROUTE-04`: `tests/broker/semantic-resolver.test.ts` 与 `tests/broker/trace.test.ts` 证明 explicit web markdown 请求 direct-route、partial signal clarify、wrong target / non-web family unsupported；`tests/integration/broker-flow.test.ts` 证明 semantic trace fields 会被持久化并保持 explainable。
- `GROW-01`: `src/core/types.ts`、`src/sources/host-skill-catalog.ts`、`config/host-skills.seed.json` 与相关测试证明 `website_qa` / `web_content_to_markdown` proof family metadata 已显式化、可校验，并已被发布成 second-proven-family operator truth。

## Automated Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs --run tests/shared-home/doctor.test.ts tests/core/capability-card.test.ts tests/broker/semantic-resolver.test.ts tests/broker/trace.test.ts tests/integration/broker-flow.test.ts tests/hosts/host-shell-install.test.ts`
- `npm_execpath=/private/tmp/skills-broker-fake-npm-cli.js /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs --run tests/cli/lifecycle-cli.test.ts`
- `rg -n "second proven family is \\*\\*web markdown\\*\\*|第二条已经证明 install / verify / reuse 的 family 是 \\*\\*web markdown\\*\\*|### Hero lane: website QA|### Secondary maintained lanes|website_qa|web_content_to_markdown|semanticMatchProofFamily" README.md README.zh-CN.md src/hosts/skill-markdown.ts tests/hosts/host-shell-install.test.ts TODOS.md STATUS.md src/core/types.ts src/sources/host-skill-catalog.ts tests/integration/broker-flow.test.ts`

## Must-Haves

- `familyProofs` 成为 Phase 2 的 canonical proof surface，`websiteQaLoop` 继续可供 strict gate 使用: passed
- semantic metadata contract 能明确表达 `website_qa` / `web_content_to_markdown` 并被 loader 校验: passed
- web markdown 拥有 direct-route semantic seam 和 install -> verify -> cross-host reuse proof: passed
- operator-facing 多表面 truth 都讲 “website QA hero lane + web markdown second proven family”: passed

## Gaps

无。

## Verification Notes

- 当前 shell 没有可用 `npm`，且 Codex 内置 Node 会被 Rollup optional native dependency 的签名问题拦住；本次验证统一改用 workspace Node，并在 `lifecycle-cli` 用例里通过临时 `npm_execpath` shim 代理 `npm run build`。
