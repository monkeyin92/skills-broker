# Project Milestones: skills-broker

## v1.5 QA-First Family Proof Loop (Shipped: 2026-04-24)

**Delivered:** `skills-broker` 现在已经把 `website QA` hero lane 延伸成一条可审计、可刷新、可复用的 QA-first family proof loop，并把 hierarchy、freshness/reuse 与 truth rails 一起收成 repo-owned 默认入口历史。

**Phases completed:** 18-20 (6 plans total)

**Key accomplishments:**

- 把 `website QA -> web markdown -> social markdown` 的层级与 next-loop guidance 收成 README、README.zh-CN、generated host shell、`doctor`、`STATUS.md` 与 `TODOS.md` 共享的一份 canonical operator truth。
- 让 shared-home / `doctor` 直接输出 `familyLoopSignals`，让 maintainer 不用翻 raw trace 就能看懂三段 loop 的 freshness、reuse 与 sequence-aware refresh action。
- 把 docs、installed host shell、`STATUS.md`、parity suite 与 CI trust rails 锁到同一份 QA-first family-loop packet wording，并在 drift 时 fail closed。

**What's next:** 用 `$gsd-new-milestone` 在 `HOST-04`、`CAP-05`、`LOOP-04`、`SHIP-03` 中选择下一条主线；在现有 sequencing 被证明失效前，不重开 query-native migration、package-vs-leaf identity migration 或 maintained-family schema 泛化。

## v1.3 Website QA Default-Entry Confidence (Shipped: 2026-04-23)

**Delivered:** `skills-broker` 现在已经把 `website QA` 默认入口的 route confidence、repeat-usage proof 与 operator truth 都 shipped 到 `main`，并把这条 QA-first story 收成 repo-owned、可审计、可 fail-close 的 default-entry packet。

**Phases completed:** 12-14 (6 plans total)

**Key accomplishments:**

- 把明显的 `website QA` 请求与 QA install-help phrasing 更稳定地收进 coarse broker-first boundary，并把 hit / misroute / fallback / host-skip evidence 直接 surfaced 到 `doctor`。
- 把 `INSTALL_REQUIRED -> install -> rerun -> cross-host reuse -> repeat usage` 收成 canonical website QA proof loop，且 `doctor` 已能明确区分 repeat usage 与 cross-host reuse。
- 让 README、README.zh-CN、generated host shell、`STATUS.md`、`TODOS.md`、parity suite 与 CI trust rail 继续讲同一份 QA-first operator truth，并坚持 coarse broker-first boundary。

**What's next:** 用 `$gsd-new-milestone` 定义下一轮 requirements，优先把 QA-first proof 升级成 adoption signal，让 maintainer 能看见这条默认入口最近是否仍然活着、是否 stale，以及该如何刷新；不要在这之前提前转向 capability breadth 或重开 release truth 主题。

## v1.2 Release Truth And Shipping Closure (Shipped: 2026-04-23)

**Delivered:** `skills-broker` 现在已经把 CI trust rails 收口成 canonical release truth，具备显式 shipped-proof promotion flow，并且 publish automation 会直接闭环到同一份 `STATUS.md` truth。

**Phases completed:** 9-11 (7 plans total)

**Key accomplishments:**

- 把 `ci:blind-spot`、focused narrative parity 与 strict repo-scoped doctor 收成 repo-owned `release:gate`，让 ship/publish 直接消费一条 canonical verdict。
- 新增 `release:promote`，把 canonical `STATUS.md` 的 shipped-local versus shipped-remote 升级动作做成显式、可审计、fail-closed 的 contract。
- 让 `.github/workflows/publish-npm.yml` 在 publish 前后都复用 canonical release truth，并把 promoted `STATUS.md` truth 回写到默认分支。
- README / README.zh-CN / STATUS / TODOS 现在都清楚区分 published lifecycle commands 与 repo-local release truth helpers，不再把 release bookkeeping 混进 shared-home maintenance story。

**What's next:** 用 `$gsd-new-milestone` 定义下一轮 requirements，优先决定是继续扩 capability surface / host templating，还是开始补 v1.2 之后的 shipping summary / release audit automation。

## v1.1 Third-Host Expansion And Trust Scaling (Shipped: 2026-04-23)

**Delivered:** `skills-broker` 现在已经是一个三宿主、三条 proven family、两条 broker-owned workflow、并带显式 CI trust guardrails 的运行时能力 broker。

**Phases completed:** 5-8 (12 plans total)

**Key accomplishments:**

- 把 OpenCode 从 readiness contract 推进成真实 shipping 的第三宿主，并收口成与 Claude Code / Codex 对等的 lifecycle / doctor / proof / reuse truth。
- 把 `social_post_to_markdown` 升格成第三条 proven family，把 `investigation-to-fix` 升格成第二条 broker-owned workflow，并继续守住 website QA hero lane 与 web markdown second proven family。
- 把 MCP discovery source 升级成 registry-ready metadata + explainability surface，同时不打破 installed/local winner precedence。
- 把 blind-spot reporting、focused narrative parity 与 strict repo proof gate 接进 CI，让支持矩阵、family/workflow surface 与 operator docs drift 能 fail closed。

**What's next:** 用 `$gsd-new-milestone` 定义下一轮 requirements，把 CI truth 接入 ship/release、继续扩展 template-friendly host onboarding 与更真实的 registry/trust scoring。

## v1.0 Default-Entry Trust And Growth Readiness (Shipped: 2026-04-23)

**Delivered:** `skills-broker` 现在有一条被 docs、host shell、runtime、doctor 和 cross-host proof 一起锁住的默认入口，同时把 runtime hardening 与未来第三宿主扩展边界收口成可验证真相。

**Phases completed:** 1-4 (13 plans total)

**Key accomplishments:**

- 把 `website QA` 变成跨 README、installed host shell、routing、doctor 与 reuse evidence 一致可信的 hero lane。
- 把 `web_content_to_markdown` 发布为第二条 proven family，并锁住 direct-route / install / verify / reuse contract。
- 为 awkward path、advisory persistence、rollback/manual-recovery 与 contributor verification 引入更硬的 fail-closed / deterministic 运行时保证。
- 用 repo-owned operator truth contract 和 parity tests 锁住 README、README.zh-CN、TODOS、STATUS 与 installed shell 的叙事一致性。
- 为 future third host 定义 explicit readiness contract，让 OpenCode 保持 deferred but well-defined。

**Stats:**

- 65 files created / modified
- 4,223 net lines of code / docs changed (`+4571 / -348`)
- 4 phases, 13 plans, 26 tasks
- 1 day from start to ship (2026-04-22 → 2026-04-23)

**Git range:** `feat(phase-1): prove qa hero loop` → `chore: archive v1.0 milestone`

**What's next:** 用 `$gsd-new-milestone` 定义下一轮 requirements，重点在第三宿主扩展、更多 proven families / workflows、以及更强的质量自动化。

---
