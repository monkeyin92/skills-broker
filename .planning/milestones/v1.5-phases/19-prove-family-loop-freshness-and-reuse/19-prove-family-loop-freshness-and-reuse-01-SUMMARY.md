# Phase 19 Summary 01

## Outcome

`doctor` 现在除了 `websiteQaAdoption` 之外，还有一份顶层 `familyLoopSignals` packet，直接把三段 QA-first family loop 的 freshness / reuse / next action 收成结构化 surface：

- `src/shared-home/doctor.ts` 新增 `familyLoopSignals`，让 `website QA`、`web markdown`、`social markdown` 都能输出 active / stale / missing、latest activity、reuse hosts 与 sequence-aware next action
- `website QA` 继续保留 hero-lane adoption packet；新的 family-loop signal 只是把 post-QA freshness/reuse 拉到同一层可读度
- `src/shared-home/format.ts` 现在会输出整体 QA-first family freshness summary，以及 web/social 的 latest / host coverage / next action 文本行

## Files

- `src/shared-home/doctor.ts`
- `src/shared-home/format.ts`
- `tests/shared-home/doctor.test.ts`
