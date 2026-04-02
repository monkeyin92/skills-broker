# STATUS

This file is the repo-native execution board for `skills-broker`.

- `shipped_remote` means the proof set is valid on `HEAD` and on the shipping ref.
- `shipped_local` means the proof set is valid on `HEAD` but not yet on the shipping ref.
- `delayed`, `blocked`, and `in_progress` still require proof. Claims without proof are treated as red.

## Human Summary

- Compatibility-intent routing metrics are shipped on `origin/main`.
- The coarse broker-first host boundary tightening is now shipped on the active shipping ref.
- The Phase 2 / Phase 3 query-compiler migration is still delayed behind the remaining compiler and eval artifacts.

<!-- skills-broker-status:start -->
```json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "compatibility-intent-routing-metrics",
      "title": "Compatibility-intent routing metrics",
      "summary": "doctor can roll up hit, misroute, and fallback by request surface from persisted traces.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "001090d",
          "label": "feat: add compatibility-intent routing metrics"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor routing metrics coverage"
        }
      ]
    },
    {
      "id": "coarse-broker-first-boundary",
      "title": "Coarse broker-first host boundary tightening",
      "summary": "Hosts stay at the coarse broker-first boundary instead of trying to decide subskills at the entry surface.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "61d642d",
          "label": "feat: tighten coarse broker-first host boundary"
        }
      ]
    },
    {
      "id": "phase2-phase3-query-compiler-migration",
      "title": "Phase 2 / Phase 3 query-compiler migration",
      "summary": "The design and implementation plan exist, but the broker-owned query compiler files and eval artifacts are not landed yet.",
      "status": "delayed",
      "proofs": [
        {
          "type": "doc",
          "path": "docs/superpowers/plans/2026-04-01-broker-first-phase2-phase3-implementation.md",
          "label": "Phase 2 / Phase 3 implementation plan"
        },
        {
          "type": "file",
          "path": "TODOS.md",
          "label": "Roadmap still tracks migration as unfinished work"
        }
      ]
    }
  ]
}
```
<!-- skills-broker-status:end -->
