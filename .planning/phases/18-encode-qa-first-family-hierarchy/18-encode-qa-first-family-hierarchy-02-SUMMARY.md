# Phase 18 Summary 02

## Outcome

Phase 18 的 hierarchy wording 不再只靠人工 review 维持：

- `tests/shared-home/operator-truth-parity.test.ts` 现在锁住 docs/status surfaces 上的 QA-first family-loop snippets
- `tests/hosts/host-shell-install.test.ts`、`tests/e2e/shared-home-smoke.test.ts` 与 `tests/e2e/claude-code-smoke.test.ts` 继续锁住 generated shell copy
- `tests/shared-home/doctor.test.ts` 现在断言 `doctor` text surface 会输出 hierarchy / next-loop guidance
- `src/dev/ci-trust.ts` 把这组 snippets 接进现有 narrative guardrail

## Files

- `tests/shared-home/operator-truth-parity.test.ts`
- `tests/shared-home/doctor.test.ts`
- `tests/hosts/host-shell-install.test.ts`
- `tests/e2e/shared-home-smoke.test.ts`
- `tests/e2e/claude-code-smoke.test.ts`
- `src/dev/ci-trust.ts`
