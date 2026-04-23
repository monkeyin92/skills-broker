# Phase 15 Summary 01

## Outcome

`doctor` 现在新增 `websiteQaAdoption` packet，统一给出：

- `active / stale / missing` freshness state
- recent observed / hit / misroute / fallback / host-skip counters
- latest trace / verify / first-reuse / replay timestamps
- 三宿主 per-host adoption coverage 与 historical verification
- 面向 maintainer 的 refresh next action

## Files

- `src/shared-home/doctor.ts`
- `tests/shared-home/doctor.test.ts`

## Notes

这一层只新增 website-QA-specific packet，没有重开 maintained-family 通用 freshness schema。
