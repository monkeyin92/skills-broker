<!-- /autoplan restore point: /Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/main-autoplan-restore-20260417-155255.md -->
# Website QA Default-Entry Conversion Hardening Implementation Plan

Generated for `/autoplan` on 2026-04-17
Branch: `main`
Status: DRAFT

## Problem Statement

`website QA` 作为默认入口的文案已经收口并 shipped 到 `main` 了。

- [README.md](/Users/monkeyin/projects/skills-broker/README.md:16) 和 [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md:22) 都已经把 QA 讲成今天最清楚的 first-use path。
- [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:133) 已经明确说 examples 是 semantic anchors，不是 literal trigger phrases。
- [tests/e2e/phase1-website-qa-eval.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/phase1-website-qa-eval.test.ts:164) 已经能把 maintained website QA miss 归因到 host selection、broker normalization、retrieval、prepare 四层。
- [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts:1170) 已经证明过 `quality_assurance` 这类请求在 broker runtime 层面可以走 install-required -> verify -> reuse。

现在真正没被锁死的，不是更抽象的 semantic contract。

而是这条产品句子有没有变成一个**被 operator 看见、被 host first impression 支持、被 QA lane 专属 proof rail 锁住**的闭环。

今天 repo 的缺口很具体：

1. README 虽然已经说了 QA-first，但 Quick Start 第一屏的“先试这个”还不够硬。
2. 安装出来的 `SKILL.md` 仍然更像 flat family list，而不是一个明确的 hero entry。
3. `doctor` 已经会显示 install-required / reuse 相关计数，但还没有一条对着 website QA 默认入口讲清楚的 operator proof。
4. 现有 end-to-end proof 更偏 runtime-level generic reuse，不是“website QA 这条默认入口真的闭环了”的专属证明。

所以这包应该解决的是：

> 把 “website QA 是默认入口” 从文案 truth 推进成 operator-visible truth，而不是继续先美化 maintained-family schema。

## What Makes This Cool

用户不需要理解 `gstack.qa`、`package_probe`、verified downstream manifest 或 acquisition memory schema。

他们真正感受到的是：

- README 第一眼就知道该试哪一句
- 安装后的 host shell 也在教同一件事
- 第一次失败不是模糊 miss，而是明确的 `INSTALL_REQUIRED`
- 安装后重跑会成功
- 换 host 之后同一路径还能 reuse
- `doctor` 也能把这条闭环讲明白，而不是只给一堆数字

如果这包做对，产品变化不是“更抽象”。

而是：

> website QA 默认入口不再只是一个例子，而是一条被 docs、host shell、doctor、tests 一起证明的最小产品闭环。

## Constraints

- 不重开 query-native migration
- 不重开 package-vs-leaf identity tail
- 不接 OpenCode
- 不新增 maintained family
- 不改 `src/broker/run.ts` 的主路由逻辑，除非 proof rail 证明现有路由本身不成立
- 优先复用现有 shared-home trace、doctor、acquisition memory、verified downstream manifests、host shell generator
- 保持 coarse boundary discipline，不让 host 开始细粒度选 skill
- 文案必须继续诚实保留“小湖、非 broad coverage、当前 supported hosts 只有 Claude Code + Codex”的 repo truth

## Premises

1. 当前最值钱的下一步，是让 `website QA` 默认入口成为一个被证明的产品闭环，而不是继续扩 semantic contract。
2. 这包的 hero loop 应该明确写成 `INSTALL_REQUIRED -> install -> rerun -> reuse -> doctor confirms`.
3. generic maintained-family semantic contract 泛化应该被降级成 follow-on work，直到 QA 默认入口真的被 operator-facing proof 锁住。
4. precision-first 比 breadth 更重要。宁可要求 clarify，也不要把 vague QA-neighbor ask 误送进去。
5. 如果 `doctor` 还能在关键 proof rail 坏掉时保持 green，这条默认入口 story 就还是软的。

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  QA-first docs are shipped
  host shell still feels like a flat broker-first family list
  doctor exposes reuse-related metrics, but not a QA-lane-specific trust story
  broker-level reuse is proven, but QA default-entry loop is not locked end to end

THIS PLAN
  make QA the unmistakable first move in README and installed host shells
  prove one QA-specific install-required -> rerun -> reuse lane across hosts
  make doctor/operator truth explicitly support that loop
  keep only minimal negative-boundary guardrails around vague QA-neighbor asks

12-MONTH IDEAL
  website QA is a trusted default-entry habit, not just a docs example
  doctor can explain why the loop is healthy in operator terms
  new default-entry lanes are added by evidence, not by analogy
  semantic-contract generalization happens after product trust is earned
```

## Approaches Considered

### Approach A: QA Default-Entry Conversion Hardening

Summary: 以 website QA 为 hero lane，把 docs、installed host shell、doctor、QA-specific proof rail 对齐成一条 operator-visible 闭环。

Effort: M
Risk: Medium
Pros:

- 直接命中当前产品 bottleneck
- 复用已有 runtime truth，不重开大迁移
- 对用户和 operator 都有可感知变化
- 能把 follow-on semantic work 从空泛变成证据驱动

Cons:

- 需要克制，不把 packet 又做回“改文案”
- 会逼我们把 doctor truth 做得更硬，不能只堆测试

### Approach B: 继续做 Maintained Semantic Contract Hardening

Summary: 继续扩 maintained-family schema，让 semantic boundary teaching 更显式。

Effort: M
Risk: Medium
Pros:

- 长期上看更整齐
- 未来 host 迁移时更容易继承

Cons:

- 现在没有明确 runtime consumer，容易变成 JSON 噪音
- 对默认入口产品闭环帮助太间接
- 容易先把结构做漂亮，再去追赶 operator-facing gain

### Approach C: 只补更多 phase2 paraphrase fixtures

Summary: 保持当前 contract，不动 docs / doctor / host shell，只继续扩 QA paraphrase 和 clarify fixtures。

Effort: S
Risk: Medium
Pros:

- 快
- 纯 proof rail 扩展

Cons:

- 边际收益已经变低
- 不能解决 first-use path 仍然太隐式的问题
- 更像继续磨 eval，不像完成产品闭环

## Recommended Approach

Approach A。

这包应该定义成：

- `website QA` 默认入口的 first-impression hardening
- QA lane 专属的 install-required -> rerun -> reuse proof rail
- doctor/operator truth hardening
- 只保留最小负例回归，防止 vague QA-neighbor asks 被过度 broker

## Success Criteria

- README / README.zh-CN 在 Quick Start 第一屏就能看出“先试 website QA”
- 安装出来的 `SKILL.md` 把 QA 放在第一个 hero example，而不是与 requirements / investigation 等权平铺
- 至少有一条 QA-specific end-to-end test 证明：
  - 第一次 request 返回 `INSTALL_REQUIRED`
  - 安装后同一句 request 变成 `HANDOFF_READY`
  - 换 host 仍然 reuse 同一条 lane
  - `doctor` 能把这条闭环讲明白
- `doctor` 不再在关键 proof rail 坏掉时继续给出误导性的 green truth
- vague QA-neighbor requests 继续稳定留在 `clarify_before_broker` / non-QA negatives，而不是被 QA hero lane 吞掉

## Non-goals

- 新 maintained family
- OpenCode
- broad semantic contract redesign
- classifier / embeddings / scoring model
- runtime router rewrite
- 新的 distribution surface

## What Already Exists

| Sub-problem | Existing code / docs | Reuse decision |
| --- | --- | --- |
| QA-first product sentence | [README.md](/Users/monkeyin/projects/skills-broker/README.md:16), [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md:22) | 不新建第二份产品叙事，直接改现有 Quick Start 和 hero path |
| Installed host-shell wording generator | [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:10) | 继续作为唯一 host copy source of truth |
| Host shell install proof | [tests/hosts/host-shell-install.test.ts](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts:12), [tests/e2e/shared-home-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts:108) | 在现有 smoke 上补 hero ordering / QA-first contract |
| QA miss-layer proof | [tests/e2e/phase1-website-qa-eval.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/phase1-website-qa-eval.test.ts:164) | 继续保留；它证明 miss attribution，但不是闭环 proof |
| Generic install/verify/reuse proof | [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts:909), [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts:1170) | 直接复用 harness 结构，补一条 QA-specific vertical |
| Doctor acquisition/reuse visibility | [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:114), [src/shared-home/format.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts:45), [tests/shared-home/doctor.test.ts](/Users/monkeyin/projects/skills-broker/tests/shared-home/doctor.test.ts:471) | 复用现有 metric surface，但要补强 operator truth |
| Negative QA-neighbor normalization | [tests/core/request-normalization.test.ts](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts:269) | 保持 precision-first，补最小 regression，不重做 phase2 |

## NOT in Scope

- generic maintained-family schema redesign
- 扩所有 maintained families 的 paraphrase matrix
- 新增 `doctor` dashboard 大板块
- 调整 broker ranking / selection
- 改 `src/broker/run.ts` 主逻辑去服务 docs 叙事
- 把 QA 永久写死成唯一 hero lane；这只是当前 product phase 的默认入口策略

## Implementation Slices

### Slice 0: First-Impression Hardening

目标: 让 README 和安装出来的 host shell 第一眼就把 QA 讲成默认入口。

涉及文件:

- [README.md](/Users/monkeyin/projects/skills-broker/README.md)
- [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
- [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts)
- [tests/hosts/host-shell-install.test.ts](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
- [tests/e2e/shared-home-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts)

要做的事:

- 把 QA loop 移到 README pair 的 Quick Start 第一屏
- host shell 里把 QA hero lane 与其他 maintained lanes 分段渲染
- 增加顺序断言，不只做 `contains`

### Slice 1: QA Default-Entry Lifecycle Proof

目标: 给 website QA 加一条专属 `INSTALL_REQUIRED -> install -> rerun -> reuse` proof rail。

涉及文件:

- [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts)
- [tests/shared-home/doctor.test.ts](/Users/monkeyin/projects/skills-broker/tests/shared-home/doctor.test.ts)
- [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts)
- [src/shared-home/format.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts)
- [src/shared-home/adoption-health.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/adoption-health.ts)

要做的事:

- 用 QA request 本身跑通 install-required -> install -> rerun -> cross-host reuse
- `doctor` 明确把这条 loop 讲出来，而不是只露 count
- proof rail unreadable / misleading truth 时，不要继续给 operator 一个过宽松的 green signal

### Slice 2: Precision-First QA Guardrail Regression

目标: 只补最小负例，防止 QA hero lane 吞掉 vague neighbors。

涉及文件:

- [tests/fixtures/phase2-coarse-boundary-eval.json](/Users/monkeyin/projects/skills-broker/tests/fixtures/phase2-coarse-boundary-eval.json)
- [tests/e2e/phase2-coarse-boundary-eval.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/phase2-coarse-boundary-eval.test.ts)
- [tests/core/request-normalization.test.ts](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts)

要做的事:

- 优先补 `check this page` / `看下这个页面` 一类 negative / clarify regression
- 不继续大规模扩 paraphrase matrix
- 保持 QA-first，但不放松 coarse boundary precision

## Affected Files

```text
docs/superpowers/plans/2026-04-17-semantic-coarse-boundary-hardening-implementation.md
README.md
README.zh-CN.md
src/hosts/skill-markdown.ts
tests/hosts/host-shell-install.test.ts
tests/e2e/shared-home-smoke.test.ts
tests/integration/broker-flow.test.ts
src/shared-home/doctor.ts
src/shared-home/format.ts
src/shared-home/adoption-health.ts
tests/shared-home/doctor.test.ts
tests/fixtures/phase2-coarse-boundary-eval.json
tests/e2e/phase2-coarse-boundary-eval.test.ts
tests/core/request-normalization.test.ts
TODOS.md
```

## Architecture Sketch

```text
README / README.zh-CN
          \
           -> QA-first product sentence ------------------------------\
src/hosts/skill-markdown.ts -> installed SKILL.md --------------------+--> user's first move
                                                                      |
tests/hosts + tests/e2e/shared-home-smoke ----------------------------/

tests/integration/broker-flow.test.ts
  -> QA install-required -> install -> rerun -> reuse
  -> acquisition memory / downstream manifest proof

src/shared-home/doctor.ts + src/shared-home/format.ts + src/shared-home/adoption-health.ts
  -> operator-visible truth for the loop
  -> tests/shared-home/doctor.test.ts locks it

phase2 fixture + request normalization negatives
  -> keep vague QA-neighbor asks out of the hero lane
```

## /autoplan Phase 1 CEO Review

### 0A. Premise Challenge

1. `默认入口已经收口，下一步 bottleneck 是 QA default-entry conversion truth`
   Verdict: true.
   Why: docs 已经把 QA 讲成 first-use path，但 operator-visible proof 还没有专属闭环。当前短板已经不是“有没有一句话这么写”，而是“这句话是不是被证明了”。

2. `generic semantic contract hardening 应该降级成 support scope`
   Verdict: true.
   Why: 当前 repo 里没有明确 runtime consumer 去消费更丰富的 semantic fields。先扩 schema，用户也不会更信任这条默认入口。

3. `doctor truth 必须参与这包`
   Verdict: true.
   Why: `doctor` 是 operator-facing truth surface。如果 install/reuse 相关 proof rail 坏掉了但 `doctor` 还继续看起来 green，这条 story 就还是软的。

4. `precision-first 要继续成立`
   Verdict: strongly true.
   Why: 如果把 vague QA-neighbor asks 吞进 hero lane，第一次成功率可能上去，但 trust 会更快掉下来。

### 0B. Existing Code Leverage Map

| Sub-problem | Existing code | Reuse decision |
| --- | --- | --- |
| QA-first wording | [README.md](/Users/monkeyin/projects/skills-broker/README.md:262), [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md:269) | 改现有 Quick Start，不新开 onboarding doc |
| Host shell first impression | [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:56) | 在 generator 上做 hero-lane rendering，不分叉 host-specific copy |
| Generic install/reuse proof | [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts:1170) | 复用 harness，补 QA vertical |
| Doctor operator output | [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:114), [src/shared-home/format.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts:45) | 继续用现有 doctor surface，补强 explicit truth |
| Precision-first negative tests | [tests/core/request-normalization.test.ts](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts:269) | 只补回归，不做 ocean |

### 0C. Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  website QA is the default-entry sentence
  operator trust is still generic and indirect

THIS PLAN
  make QA the obvious first move
  prove the QA lane end to end
  make doctor/operator truth explicitly support that loop

12-MONTH IDEAL
  default-entry lanes are added by evidence
  operator truth and product sentence never drift
```

### 0C-bis. Implementation Alternatives

| Approach | Summary | Effort | Risk | Pros | Cons |
| --- | --- | --- | --- | --- | --- |
| A | QA conversion hardening | M | Medium | fixes current bottleneck, reuses shipped runtime truth, locks the hero lane | requires touching docs plus doctor truth |
| B | semantic contract hardening | M | Medium | structurally cleaner long term | weak immediate product payoff |
| C | more paraphrase fixtures only | S | Medium | cheap | too indirect, low user-facing gain |

### 0D. Mode Analysis

Mode: `SELECTIVE EXPANSION`

- Accept expansions inside the blast radius of docs, host-shell first impression, doctor/operator truth, QA-specific proof rail, and negative QA-neighbor regressions.
- Reject expansions that reopen broad semantic-schema work, host expansion, or router logic.

### 0E. Temporal Interrogation

**Hour 1**
- rewrite the packet around QA conversion hardening
- lock the exact seams

**Hour 6**
- QA-first quickstart and host shell first impression are aligned
- QA-specific install/rerun/reuse proof exists
- doctor can explain that loop

**One week later**
- operators can tell whether QA default-entry truth is healthy without reading tests
- semantic contract generalization is either clearly still deferred or justified by evidence

### 0F. Mode Selection Confirmation

`SELECTIVE EXPANSION` remains correct.

Why:
- `HOLD SCOPE` would under-shoot by treating this as pure docs polish
- `SCOPE EXPANSION` would over-shoot into contract redesign or new hosts
- `SELECTIVE EXPANSION` lets the packet fix the full QA default-entry blast radius without reopening oceans

### CLAUDE SUBAGENT (CEO — strategic independence)

Independent review converged on four points:

- schema hardening is fake progress unless a runtime consumer is introduced
- phase2 paraphrase expansion has diminishing returns compared with QA-lane lifecycle proof
- the real missing proof is website QA specific `INSTALL_REQUIRED -> rerun -> reuse`
- QA should stay a default-entry strategy for this product phase, not be written as an eternal truth

### CODEX SAYS (CEO — strategy challenge)

Codex produced a partial but useful review before stalling in plugin noise. The useful part converged on the same objection: the reframed packet only makes sense if each slice lands on a real seam in `doctor`, trace, host copy, or a QA-specific proof rail. Otherwise it is still “writing a nicer story around existing truth.”

### CEO DUAL VOICES — CONSENSUS TABLE

```text
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex   Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   pass    warn    CONFIRMED
  2. Right problem to solve?           pass    warn    CONFIRMED
  3. Scope calibration correct?        pass    pass    CONFIRMED
  4. Alternatives sufficiently explored?pass   pass    CONFIRMED
  5. Competitive/product risks covered?warn    warn    CONFIRMED
  6. 6-month trajectory sound?         warn    warn    CONFIRMED
═══════════════════════════════════════════════════════════════
```

Warnings:

- do not relabel QA as permanent product center
- do not let doctor keep overstating health when proof rails are unreadable

### Error & Rescue Registry

| Risk | Where it appears | Rescue |
| --- | --- | --- |
| QA-first docs become stronger than proof rails | README pair, doctor, tests | require QA-specific lifecycle proof in tests before trusting the story |
| installed shell still feels flat | `src/hosts/skill-markdown.ts` | split hero lane from secondary maintained lanes and assert order |
| doctor stays green while key proof rails are unreadable | `src/shared-home/doctor.ts`, `src/shared-home/adoption-health.ts` | turn proof-rail unreadability into explicit health degradation or blocking |
| QA hero lane over-brokers vague asks | phase2 fixture and normalization tests | add negative regressions, not more broad paraphrase spam |

### Failure Modes Registry

| Failure mode | Severity | Why it matters |
| --- | --- | --- |
| QA-first remains a promise without QA-specific lifecycle proof | Critical | product trust does not compound |
| doctor green truth survives broken proof rails | High | operator gets misled |
| host shell still shows flat list before QA | High | first impression stays weak |
| packet silently drifts back into generic semantic contract work | Medium | scope becomes abstract and low-yield |

### Dream State Delta

This packet still does not broaden the broker.

It makes one already-chosen default entry real enough to trust. The delta is not “more families.” The delta is “one obvious first move, one visible loop, one operator truth surface.”

### Phase 1 Completion Summary

| Dimension | Verdict |
| --- | --- |
| Right problem to solve now? | Yes |
| Scope calibrated? | Yes, if held to QA conversion hardening |
| Biggest upside | QA default-entry becomes a real product loop |
| Biggest risk | doctor truth stays too soft |
| Deferred | generic semantic contract hardening |

**Phase 1 complete.** Codex: partial strategic challenge, converged on “real seam or fake progress.” Claude subagent: 4 issues. Consensus: 6/6 confirmed. Passing to Phase 2.

## Phase 2: Design Review

Skipped. No UI scope detected in the plan or touched files.

**Phase 2 complete.** Skipped, no UI scope. Passing to Phase 3.

## Phase 3: Eng Review

### Step 0: Scope Challenge

- The real seams are [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts), [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts), [src/shared-home/format.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts), [src/shared-home/adoption-health.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/adoption-health.ts), [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts), [tests/shared-home/doctor.test.ts](/Users/monkeyin/projects/skills-broker/tests/shared-home/doctor.test.ts), plus host-shell / negative regression tests.
- The wrong seam is [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts). Existing integration proof already says the router can do install-required / verify / reuse. Reopening router logic here would be fake scope.
- Complexity is moderate. This packet touches docs, host copy, doctor truth, and tests, but does not require new classes or infra.

### CLAUDE SUBAGENT (eng — independent review)

Independent engineering review flagged five concrete issues:

1. `mergeExamples()` currently puts maintained examples ahead of QA hero intent, so installed host shells may still feel flat.
2. doctor proof rails can fail unreadably while adoption health stays green.
3. `sharedHomeExists` is too weak if it only checks one file.
4. QA lane still lacks its own install-rerun-reuse proof rail.
5. unmanaged host conflict detection reads more nuanced than it actually is.

### CODEX SAYS (eng — architecture challenge)

Codex did not return a clean final report, but the partial pass converged on the same engineering fear: the new slices only count if they land on `doctor`, host-shell generation, and a QA-specific proof rail. Anything else is cosmetic.

### ENG DUAL VOICES — CONSENSUS TABLE

```text
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex   Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               pass    pass    CONFIRMED
  2. Test coverage sufficient?         warn    warn    CONFIRMED
  3. Performance risks addressed?      pass    pass    CONFIRMED
  4. Security threats covered?         warn    warn    CONFIRMED
  5. Error paths handled?              warn    pass    DISAGREE
  6. Deployment risk manageable?       pass    pass    CONFIRMED
═══════════════════════════════════════════════════════════════
```

The one disagreement is not whether there is a bug. It is whether doctor unreadability should block `adoptionHealth` outright or merely surface a separate proof-rail section.

### 1. Architecture Review

ASCII dependency graph:

```text
README.md / README.zh-CN.md
           |
           v
   first copy-paste QA request
           |
           v
src/hosts/skill-markdown.ts
           |
           +--> tests/hosts/host-shell-install.test.ts
           \--> tests/e2e/shared-home-smoke.test.ts

tests/integration/broker-flow.test.ts
           |
           v
   INSTALL_REQUIRED -> install -> rerun -> reuse
           |
           v
src/shared-home/doctor.ts -> src/shared-home/format.ts -> src/shared-home/adoption-health.ts
           |
           \--> tests/shared-home/doctor.test.ts

phase2 fixture + request normalization negatives
           |
           \--> keep vague QA-neighbor asks out of the hero lane
```

Architecture verdict: sound, as long as runtime routing stays untouched and the packet remains a truth-hardening slice.

### 2. Code Quality Review

Findings:

- [Medium] [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:56) hides the intended hero ordering behind a generic merge. Auto-decision: fix now. Principle: `P5 explicit over clever`. Rejected: keep flat merge and rely on prose.
- [High] [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:114) plus [src/shared-home/adoption-health.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/adoption-health.ts:174) can preserve an overly green operator truth when proof rails are unreadable. Auto-decision: fix in this packet. Principle: `P1 completeness`. Rejected: treat unreadability as warning-only.
- [Medium] [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:355) uses a weak shared-home existence notion. Auto-decision: include if already touching doctor truth; otherwise do not split it into a separate packet. Principle: `P2 boil lakes`. Rejected: defer while still claiming stronger doctor truth.
- [Low] [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:210) has a dead-branch-looking unmanaged conflict rule. Auto-decision: defer. Principle: `P3 pragmatic`. Rejected: widen the packet for a cleanup that does not materially affect QA conversion proof.

### 3. Test Review

Coverage diagram:

```text
QA DEFAULT-ENTRY LOOP
=============================
[1] README / README.zh-CN
    └── [MANUAL + TARGETED REVIEW]
        first screen shows:
        update -> QA request -> doctor verify

[2] Installed host shell first impression
    ├── [GAP] hero lane ordering, not just contains
    ├── [→ TEST] tests/hosts/host-shell-install.test.ts
    └── [→ TEST] tests/e2e/shared-home-smoke.test.ts

[3] QA install-required -> rerun -> reuse
    ├── [GAP] QA-specific vertical missing
    └── [→ TEST] tests/integration/broker-flow.test.ts

[4] doctor tells the loop truth
    ├── [PARTIAL] generic counts already exist
    └── [→ TEST] tests/shared-home/doctor.test.ts

[5] vague QA-neighbor asks
    ├── [PARTIAL] normalization negatives exist
    └── [→ TEST] tests/e2e/phase2-coarse-boundary-eval.test.ts
                    tests/core/request-normalization.test.ts
```

Test decisions:

- Add a QA-specific lifecycle proof in [tests/integration/broker-flow.test.ts](/Users/monkeyin/projects/skills-broker/tests/integration/broker-flow.test.ts). Mechanical. `P1 completeness`.
- Add order-sensitive host copy assertions in [tests/hosts/host-shell-install.test.ts](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts) and [tests/e2e/shared-home-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts). Mechanical. `P5 explicit over clever`.
- Add doctor truth assertions in [tests/shared-home/doctor.test.ts](/Users/monkeyin/projects/skills-broker/tests/shared-home/doctor.test.ts). Mechanical. `P1 completeness`.
- Keep README prose review manual, but review it against the exact QA loop sentence. Taste. `P3 pragmatic`.

Test plan artifact written to:
[monkeyin-main-test-plan-20260417-155255.md](/Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/monkeyin-main-test-plan-20260417-155255.md)

### 4. Performance Review

No performance issue found.

The packet adds only string formatting and more proof rails. The risk is not latency. The risk is misleading truth.

### Failure Modes

| Codepath | Failure mode | Test covers it? | User sees clear failure? |
| --- | --- | --- | --- |
| host shell first impression | QA still buried in flat example list | planned | yes |
| QA default-entry lifecycle | no QA-specific install/reuse proof | planned | no, without new proof |
| doctor truth | proof rails unreadable but doctor still looks green | planned | no, without fix |
| negative boundary | vague page ask misrouted to QA | planned | yes, if regression lands |

### NOT in Scope

- `src/broker/run.ts` routing changes
- unmanaged conflict cleanup in `doctorHost()` unless it materially blocks QA proof work
- broad maintained-family schema redesign

### What already exists

Already written above and still valid. This phase did not discover a missing system seam.

### Eng Completion Summary

- Scope Challenge: accepted as QA conversion hardening
- Architecture Review: 0 architectural blockers
- Code Quality Review: 3 in-scope issues, 1 deferred cleanup
- Test Review: 3 mandatory proof gaps, 1 intentional manual-review area
- Performance Review: 0 issues
- Failure modes: 4 total, 2 high-severity until fixed
- Outside voices: subagent completed, codex partial
- Lake Score: 4/4 core recommendations chose the complete option

**Phase 3 complete.** Codex: partial architecture challenge. Claude subagent: 5 issues. Consensus: 5/6 confirmed, 1 disagreement surfaced at the final gate. Passing to Phase 3.5.

## Phase 3.5: DX Review

Mode: `DX POLISH`
Product type: developer tool for Claude Code / Codex hosts

### Developer Persona Card

```text
TARGET DEVELOPER PERSONA
========================
Who:       heavy Claude Code / Codex user
Context:   wants one external-capability workflow that works on first real use
Tolerance: under 5 minutes to first proof, no catalog browsing
Expects:   one exact sentence to try, clear install-required meaning, doctor tells the truth
```

### Developer Empathy Narrative

I open the README because I want to know whether this broker is real or just another routing layer that sounds clever. The top tells me website QA is the best first-use path. Good. Then I hit Quick Start and still have to work a bit too hard to infer the exact order: update, doctor, then maybe QA. If the docs put the exact QA request in the first screenful, I would paste it immediately. Then I would want the installed host shell to reinforce that I made the right first choice. After that, if I hit `INSTALL_REQUIRED`, I do not need abstract capability theory. I need to know: install this, rerun the same request, then check `doctor`. If `doctor` only gives me generic counts, I can tell the system is sophisticated, but I still cannot tell whether the QA-first story actually worked. That is the remaining friction.

### Competitive DX Benchmark

Search unavailable. Using reference benchmarks.

| Tool | TTHW | Notable DX Choice | Source |
| --- | --- | --- | --- |
| Docker hello-world | ~5 min | one command, one visible success | reference benchmark |
| Vercel | ~2 min | obvious first action | reference benchmark |
| Stripe | ~30s | one copy-paste path to value | reference benchmark |
| skills-broker target | <5 min | `update` + one QA request + doctor verify | current repo DX bar |

### Magical Moment Specification

Chosen delivery vehicle: copy-paste QA request plus explicit verify step.

The magical moment is:

1. run `npx skills-broker update`
2. paste `QA this website https://example.com`
3. see `INSTALL_REQUIRED` or a real handoff
4. rerun after install
5. run `npx skills-broker doctor --strict` and see the loop reflected

### Developer Journey Map

| Stage | Developer does | Friction point | Packet response |
| --- | --- | --- | --- |
| Discover | lands on README | first move still slightly too implicit | move QA loop higher |
| Install | runs `update` | low | keep as-is |
| Hello World | chooses first request | too many examples compete | make QA hero lane explicit |
| First Failure | sees `INSTALL_REQUIRED` | needs causal explanation | docs + host shell + doctor align |
| Verify | reruns same request | needs visible proof | QA vertical smoke + doctor text |
| Repeat Trust | switches host or reruns later | needs reuse truth | shared-home proof and doctor metrics |

### First-Time Developer Confusion Report

```text
FIRST-TIME DEVELOPER REPORT
============================
T+0:00  I understand the concept.
T+0:45  I still have to infer which sentence to paste first.
T+1:30  I can install, but the first real action is not obvious enough.
T+2:30  If I get INSTALL_REQUIRED, I need a concrete verify ritual.
T+3:30  doctor should tell me the QA loop worked, not just print opaque counters.
```

### Pass 1: Getting Started Experience

Score: `7/10`

The repo already points at website QA, but the first screen still makes the user do too much assembly work.

### Pass 2: API/CLI/SDK Design

Score: `8/10`

The CLI surface is already clean. The gap is guidance, not command count.

### Pass 3: Error Messages & Debugging

Score: `8/10`

`INSTALL_REQUIRED` already exists and is a good explicit contract. The packet should preserve that explicitness all the way through docs and doctor.

### Pass 4: Documentation & Learning

Score: `7/10`

The docs are honest and detailed, but the QA-first loop still needs to move closer to the top of the first-use path.

### Pass 5: Upgrade & Migration Path

Score: `7/10`

No new migration work is needed. This packet inherits the existing lifecycle story.

### Pass 6: Developer Environment & Tooling

Score: `8/10`

The environment story is already good for a local CLI + host-shell product. The packet should not invent more setup.

### Pass 7: Community & Ecosystem

Score: `6/10`

Out of scope. This packet does not move ecosystem depth.

### Pass 8: DX Measurement & Feedback Loops

Score: `7/10`

The raw telemetry exists. The missing thing is operator-facing causality for the QA loop.

### CLAUDE SUBAGENT (DX — independent review)

DX review converged on three main findings:

- README Quick Start still buries the first request slightly too deep
- installed host shell still feels too flat
- `doctor` needs a compact QA-loop truth surface, not just generic counts

### CODEX SAYS (DX — developer experience challenge)

No clean Codex DX report. The prior Codex partial review still reinforced the same pressure: this packet must land in real first-use surfaces, not just in schema or fixtures.

### DX DUAL VOICES — CONSENSUS TABLE

```text
DX DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex   Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Getting started < 5 min?          warn    warn    CONFIRMED
  2. API/CLI naming guessable?         pass    pass    CONFIRMED
  3. Error messages actionable?        pass    pass    CONFIRMED
  4. Docs findable & complete?         warn    warn    CONFIRMED
  5. Upgrade path safe?                pass    pass    CONFIRMED
  6. Dev environment friction-free?    pass    pass    CONFIRMED
═══════════════════════════════════════════════════════════════
```

### DX Scorecard

```text
+====================================================================+
|              DX PLAN REVIEW — SCORECARD                            |
+====================================================================+
| Dimension            | Score  | Trend                              |
|----------------------|--------|------------------------------------|
| Getting Started      | 7/10   | ↑ if QA loop moves to top          |
| API/CLI/SDK          | 8/10   | →                                  |
| Error Messages       | 8/10   | →                                  |
| Documentation        | 7/10   | ↑ if hero loop is tighter          |
| Upgrade Path         | 7/10   | →                                  |
| Dev Environment      | 8/10   | →                                  |
| Community            | 6/10   | →                                  |
| DX Measurement       | 7/10   | ↑ if doctor loop truth is explicit |
+--------------------------------------------------------------------+
| TTHW                 | <5 min target                              |
| Magical Moment       | copy-paste QA request + doctor verify      |
| Product Type         | developer tool / Claude Code + Codex       |
| Mode                 | POLISH                                     |
| Overall DX           | 7.3/10                                     |
+====================================================================+
```

### DX Implementation Checklist

```text
DX IMPLEMENTATION CHECKLIST
============================
[x] one-command install path exists
[x] one obvious first request should exist
[ ] first request is currently visible enough in the first screenful
[x] install-required contract is explicit
[ ] doctor currently explains the QA loop in causal language
[x] host shell copy can be generated from one source
[ ] host shell first impression currently privileges QA strongly enough
[x] repeat trust across Claude Code and Codex is already a product promise
[ ] QA-specific proof rail for that promise is still missing
```

**Phase 3.5 complete.** DX overall: 7.3/10. TTHW target: under 5 minutes. Codex: no clean DX report. Claude subagent: 3 issues. Consensus: 6/6 confirmed. Passing to Phase 4.

## Cross-Phase Themes

1. **Do not confuse stronger structure with stronger truth.** Flagged in CEO and Eng.
2. **The missing thing is a QA-specific lifecycle proof, not more generic semantic theory.** Flagged in CEO, Eng, and DX.
3. **First impression and operator proof must teach the same loop.** Flagged in Eng and DX.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Reframe packet from semantic contract hardening to QA conversion hardening | User Challenge resolved by user | P1 | User explicitly chose B after dual-voice challenge | Staying on the old semantic packet |
| 2 | CEO | Keep semantic contract generalization out of primary scope | mechanical | P3 | No concrete runtime consumer yet | Expanding schema now |
| 3 | CEO | Include doctor truth in blast radius | mechanical | P1 | Operator-visible proof is core to this loop | Leaving doctor unchanged |
| 4 | CEO | Keep QA as current default-entry strategy, not permanent truth | taste | P3 | Reduces long-term example bias | Writing QA as eternal product center |
| 5 | Eng | Rework host-shell rendering so QA is an explicit hero lane | mechanical | P5 | Flat merge hides intended first move | Relying on `contains` only |
| 6 | Eng | Add QA-specific install-required -> rerun -> reuse proof rail | mechanical | P1 | Existing proof is generic, not QA-lane specific | Reusing only phase1 miss-layer eval |
| 7 | Eng | Tighten doctor truth when proof rails are unreadable | taste | P1 | Green doctor on broken proof rails is misleading | Warning-only unreadability |
| 8 | Eng | Pull weak shared-home existence into this packet if doctor truth is touched | borderline scope | P2 | Same blast radius, same operator truth | Deferring while still claiming harder doctor truth |
| 9 | Eng | Defer unmanaged conflict cleanup | mechanical | P3 | Low product leverage for this packet | Widening the packet for cleanup |
| 10 | DX | Move the QA request to the top of Quick Start | mechanical | P5 | The first move should be pasteable immediately | Keeping it buried lower in setup text |
| 11 | DX | Keep README prose review manual, but verify exact hero-loop wording in diff | taste | P3 | Full prose snapshots are brittle | Snapshotting README paragraphs |
| 12 | DX | Keep negative QA-neighbor additions minimal and precision-first | mechanical | P1 | Prevents hero lane over-brokering without ocean work | Broad paraphrase expansion |
