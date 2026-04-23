# Phase 15 Summary 02

## Outcome

`doctor` 文本输出现在直接展示 website QA adoption packet，而不是只剩 proof loop 与 routing counters：

- summary line: recent signal + freshness
- latest line: current activity timestamps
- host lines: per-host active/stale/missing coverage
- next-action line: refresh guidance

## Files

- `src/shared-home/format.ts`
- `tests/shared-home/doctor.test.ts`

## Notes

旧的 `websiteQaLoop` / `websiteQaRouting` 仍保留，用于兼容现有 strict consumers。
