import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPERATOR_TRUTH_CONTRACT,
  formatDeferredHostsLine,
  formatDeferredHostsZhLine,
  formatSupportedHostsLine,
  formatSupportedHostsZhLine,
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
      supportedHosts: ["Claude Code", "Codex"],
      deferredHosts: ["OpenCode"],
      heroLane: "website QA",
      secondProvenFamily: "web markdown",
      lifecycleCommands: [
        "npx skills-broker update",
        "npx skills-broker doctor",
        "npx skills-broker remove"
      ],
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
        formatDeferredHostsLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "README.md"
    );
    expectContainsAll(
      readmeZh,
      [
        formatSupportedHostsZhLine(),
        formatDeferredHostsZhLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "README.zh-CN.md"
    );
    expectContainsAll(
      todos,
      [
        formatSupportedHostsLine(),
        formatDeferredHostsLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "TODOS.md"
    );
    expectContainsAll(
      status,
      [
        formatSupportedHostsLine(),
        formatDeferredHostsLine(),
        OPERATOR_TRUTH_CONTRACT.heroLane,
        OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
        ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
      ],
      "STATUS.md"
    );
  });

  it("keeps third-host readiness explicit without claiming OpenCode support", async () => {
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
      [formatThirdHostReadinessLine(), ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens],
      "README.md"
    );
    expectContainsAll(
      readmeZh,
      [formatThirdHostReadinessZhLine(), ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens],
      "README.zh-CN.md"
    );
    expectContainsAll(
      todos,
      [formatThirdHostReadinessLine(), ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens],
      "TODOS.md"
    );
    expectContainsAll(
      status,
      [formatThirdHostReadinessLine(), ...OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens],
      "STATUS.md"
    );
  });

  it("records the Phase 4 packet in the canonical STATUS board", async () => {
    const status = await readRepoFile("STATUS.md");
    const items = extractCanonicalStatusItems(status);
    const phase4Item = items.find(
      (item) => item.id === "phase4-operator-truth-readiness"
    );

    expect(phase4Item).toBeDefined();
    expect(phase4Item).toMatchObject({
      id: "phase4-operator-truth-readiness",
      status: "shipped_local"
    });
    expect(phase4Item!.summary).toContain(formatSupportedHostsLine());
    expect(phase4Item!.summary).toContain(formatDeferredHostsLine());
    expect(phase4Item!.summary).toContain(formatThirdHostReadinessLine());
    expect(phase4Item!.proofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "file",
          path: "src/core/operator-truth.ts"
        }),
        expect.objectContaining({
          type: "file",
          path: "docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md"
        }),
        expect.objectContaining({
          type: "test",
          path: "tests/shared-home/operator-truth-parity.test.ts"
        })
      ])
    );
  });
});
