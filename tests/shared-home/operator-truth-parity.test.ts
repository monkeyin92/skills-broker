import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatCoarseBoundaryLine,
  formatCoarseBoundaryZhLine,
  OPERATOR_TRUTH_CONTRACT,
  formatFullLifecycleParityLine,
  formatFullLifecycleParityZhLine,
  formatSupportedHostsLine,
  formatSupportedHostsZhLine,
  formatWebsiteQaProofSurfaceLine,
  formatWebsiteQaProofSurfaceZhLine,
  formatThirdHostReadinessLine,
  formatThirdHostReadinessZhLine
} from "../../src/core/operator-truth";

type StatusItem = {
  id: string;
  title: string;
  summary?: string;
  status: string;
  proofs: Array<{ type: string; path?: string }>;
};

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), relativePath), "utf8");
}

function expectContainsAll(
  text: string,
  snippets: readonly string[],
  label: string
): void {
  for (const snippet of snippets) {
    expect(text, `${label} should contain ${snippet}`).toContain(snippet);
  }
}

function extractCanonicalStatusItems(markdown: string): StatusItem[] {
  const match = markdown.match(
    /<!--\s*skills-broker-status:start\s*-->\s*```json\s*([\s\S]*?)\s*```\s*<!--\s*skills-broker-status:end\s*-->/m
  );

  if (!match) {
    throw new Error("STATUS.md canonical block is missing");
  }

  const parsed = JSON.parse(match[1]) as { items?: StatusItem[] };

  if (!Array.isArray(parsed.items)) {
    throw new Error("STATUS.md canonical block must contain items");
  }

  return parsed.items;
}

describe("operator truth parity", () => {
  it("exports the canonical operator truth contract", () => {
    expect(OPERATOR_TRUTH_CONTRACT).toMatchObject({
      supportedHosts: ["Claude Code", "Codex", "OpenCode"],
      deferredHosts: [],
      heroLane: "website QA",
      secondProvenFamily: "web markdown",
      thirdProvenFamily: "social markdown",
      lifecycleCommands: [
        "npx skills-broker update",
        "npx skills-broker doctor",
        "npx skills-broker remove"
      ],
      coarseBoundary: {
        en: formatCoarseBoundaryLine(),
        zh: formatCoarseBoundaryZhLine()
      },
      websiteQaProofSurface: {
        en: formatWebsiteQaProofSurfaceLine(),
        zh: formatWebsiteQaProofSurfaceZhLine()
      },
      thirdHostReadinessTokens: [
        "shared broker home",
        "thin host shell",
        "proof/reuse state"
      ]
    });
  });

  it("keeps README, README.zh-CN, TODOS, and STATUS aligned on support matrix, hierarchy, and lifecycle wording", async () => {
    const [readme, readmeZh, todos, status] = await Promise.all([
      readRepoFile("README.md"),
      readRepoFile("README.zh-CN.md"),
      readRepoFile("TODOS.md"),
      readRepoFile("STATUS.md")
    ]);

    expectContainsAll(
      readme,
      [
        formatSupportedHostsLine(),
        formatFullLifecycleParityLine(),
        formatCoarseBoundaryLine(),
        formatWebsiteQaProofSurfaceLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        OPERATOR_TRUTH_CONTRACT.thirdProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "README.md"
    );
    expectContainsAll(
      readmeZh,
      [
        formatSupportedHostsZhLine(),
        formatFullLifecycleParityZhLine(),
        formatCoarseBoundaryZhLine(),
        formatWebsiteQaProofSurfaceZhLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        OPERATOR_TRUTH_CONTRACT.thirdProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "README.zh-CN.md"
    );
    expectContainsAll(
      todos,
      [
        formatSupportedHostsLine(),
        formatFullLifecycleParityLine(),
        formatCoarseBoundaryLine(),
        formatWebsiteQaProofSurfaceLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        OPERATOR_TRUTH_CONTRACT.thirdProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "TODOS.md"
    );
    expectContainsAll(
      status,
      [
        formatSupportedHostsLine(),
        formatFullLifecycleParityLine(),
        formatCoarseBoundaryLine(),
        formatWebsiteQaProofSurfaceLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        OPERATOR_TRUTH_CONTRACT.thirdProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "STATUS.md"
    );
  });

  it("keeps post-Phase-6 full parity explicit and removes the stale caveat", async () => {
    const [spec, readme, readmeZh, todos, status] = await Promise.all([
      readRepoFile(
        "docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md"
      ),
      readRepoFile("README.md"),
      readRepoFile("README.zh-CN.md"),
      readRepoFile("TODOS.md"),
      readRepoFile("STATUS.md")
    ]);

    expectContainsAll(
      spec,
      [
        "third host",
        "OpenCode",
        ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens,
        "adoptionHealth",
        "familyProofs",
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "third-host readiness spec"
    );
    expectContainsAll(
      readme,
      [
        formatFullLifecycleParityLine(),
        formatThirdHostReadinessLine(),
        ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens
      ],
      "README.md"
    );
    expectContainsAll(
      readmeZh,
      [
        formatFullLifecycleParityZhLine(),
        formatThirdHostReadinessZhLine(),
        ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens
      ],
      "README.zh-CN.md"
    );
    expectContainsAll(
      todos,
      [
        formatFullLifecycleParityLine(),
        formatThirdHostReadinessLine(),
        ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens
      ],
      "TODOS.md"
    );
    expectContainsAll(
      status,
      [
        formatFullLifecycleParityLine(),
        formatThirdHostReadinessLine(),
        ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens
      ],
      "STATUS.md"
    );

    for (const text of [readme, readmeZh, todos, status]) {
      expect(text).not.toContain(
        [
          `OpenCode thin host shell is shipping in ${["Phase", "5"].join(" ")};`,
          `lifecycle / proof${" "}parity continues in ${["Phase", "6"].join(" ")}.`
        ].join(" ")
      );
      expect(text).not.toContain(
        [
          `OpenCode 薄宿主壳已在 ${["Phase", "5"].join(" ")} 交付；`,
          `完整 lifecycle / proof${" "}parity 继续在 ${["Phase", "6"].join(" ")} 补齐。`
        ].join("")
      );
      expect(text).not.toContain(
        [
          `${["Phase", "6"].join(" ")} keeps the${" "}same shared broker home, thin host shell, proof/reuse state,`,
          "and published lifecycle parity contract in scope."
        ].join(" ")
      );
      expect(text).not.toContain(
        [
          `${["Phase", "6"].join(" ")} 继续沿用同一套 shared broker home、thin host shell、proof/reuse state`,
          "与 published lifecycle parity contract。"
        ].join(" ")
      );
    }
  });

  it("records the Phase 5 packet in the canonical STATUS board", async () => {
    const status = await readRepoFile("STATUS.md");
    const items = extractCanonicalStatusItems(status);
    const phase5Item = items.find(
      (item) => item.id === "phase5-opencode-thin-host-shell"
    );

    expect(phase5Item).toBeDefined();
    expect(phase5Item).toMatchObject({
      id: "phase5-opencode-thin-host-shell",
      status: "shipped_local"
    });
    expect(phase5Item!.summary).toContain(formatSupportedHostsLine());
    expect(phase5Item!.summary).toContain(formatFullLifecycleParityLine());
    expect(phase5Item!.summary).toContain(formatThirdHostReadinessLine());
    expect(phase5Item!.proofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "file",
          path: "src/core/operator-truth.ts"
        }),
        expect.objectContaining({
          type: "file",
          path: "src/hosts/opencode/install.ts"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/shared-home/operator-truth-parity.test.ts"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/e2e/shared-home-smoke.test.ts"
        })
      ])
    );
  });

  it("records the Phase 12 and Phase 13 QA-first confidence packets in the canonical STATUS board", async () => {
    const status = await readRepoFile("STATUS.md");
    const items = extractCanonicalStatusItems(status);
    const phase12Item = items.find(
      (item) => item.id === "phase12-website-qa-routing-confidence"
    );
    const phase13Item = items.find(
      (item) => item.id === "phase13-website-qa-repeat-usage-loop"
    );

    expect(phase12Item).toBeDefined();
    expect(phase12Item).toMatchObject({
      id: "phase12-website-qa-routing-confidence",
      status: "shipped_local"
    });
    expect(phase12Item!.summary).toContain("website QA");
    expect(phase12Item!.summary).toContain("routing evidence");
    expect(phase12Item!.proofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "file",
          path: "src/broker/query-compiler.ts"
        }),
        expect.objectContaining({
          type: "file",
          path: "src/shared-home/doctor.ts"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/e2e/phase2-coarse-boundary-eval.test.ts"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/shared-home/doctor.test.ts"
        })
      ])
    );

    expect(phase13Item).toBeDefined();
    expect(phase13Item).toMatchObject({
      id: "phase13-website-qa-repeat-usage-loop",
      status: "shipped_local"
    });
    expect(phase13Item!.summary).toContain("repeat-usage");
    expect(phase13Item!.summary).toContain("cross-host reuse");
    expect(phase13Item!.proofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "file",
          path: "src/shared-home/doctor.ts"
        }),
        expect.objectContaining({
          type: "file",
          path: "src/shared-home/format.ts"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/integration/broker-flow.test.ts"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/cli/lifecycle-cli.test.ts"
        })
      ])
    );
  });
});
