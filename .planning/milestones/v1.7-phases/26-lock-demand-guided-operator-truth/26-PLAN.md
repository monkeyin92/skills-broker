# Phase 26 Plan: Lock Demand-Guided Operator Truth

## Goal

Align docs, installed host shell wording, status, backlog, CI/parity, and release gate around one demand-guided capability growth story.

## Tasks

1. Add canonical demand-guided wording to `operator-truth`.
2. Mirror wording into README, README.zh-CN, STATUS, TODOS, and host shell markdown.
3. Extend operator-truth parity, host shell, and CI trust checks.
4. Add STATUS shipped-local proof item for demand-guided growth truth.

## Verification

- `npm test -- --run tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts tests/dev/ci-trust.test.ts`
- `npm run ci:blind-spot`
