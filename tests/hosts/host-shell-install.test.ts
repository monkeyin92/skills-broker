import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadMaintainedBrokerFirstContract,
  maintainedBrokerFirstBoundaryExamples
} from "../../src/core/maintained-broker-first";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { installCodexHostShell } from "../../src/hosts/codex/install";

const HERO_LANE_EXAMPLES = [
  '"测下这个网站的质量：https://www.baidu.com"',
  '"QA 这个网站 https://example.com"',
  '"QA this website https://example.com"',
  '"检查这个网站质量"',
  '"find a skill or MCP for website QA"',
  '"有没有现成 skill 能做这个网站 QA"'
] as const;

function expectInOrder(text: string, snippets: readonly string[]): void {
  let previousIndex = -1;

  for (const snippet of snippets) {
    const index = text.indexOf(snippet);
    expect(index, `Expected to find snippet in order: ${snippet}`).toBeGreaterThan(
      previousIndex
    );
    previousIndex = index;
  }
}

function expectHostSkillLayout(
  skill: string,
  host: "claude-code" | "codex",
  maintainedBoundaryExamples: readonly string[]
): void {
  const secondaryMaintainedExamples = maintainedBoundaryExamples
    .filter((example) => !HERO_LANE_EXAMPLES.includes(`"${example}"`))
    .map((example) => `"${example}"`);

  expectInOrder(skill, [
    '# Skills Broker',
    "Use this skill only at the coarse broker boundary.",
    "The host decides only one of these boundary outcomes:",
    "Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer.",
    "## Broker-First (`broker_first`)",
    "If you need one concrete broker-first example to calibrate the boundary, start with website QA.",
    "Treat the examples below as semantic anchors, not literal trigger phrases.",
    "### Hero lane: website QA",
    "Keep website QA visually first. It is the QA default-entry lane and the calibration lane. Other maintained lanes are still valid, but secondary.",
    ...HERO_LANE_EXAMPLES,
    "### Secondary maintained lanes",
    "Requirements analysis and investigation still stay broker-first. They are maintained lanes, but they should not be the first thing this installed shell makes you try.",
    ...secondaryMaintainedExamples,
    "### Other broker-first lanes",
    '"我有一个想法：做一个自动串起评审和发版的工具"',
    '"把这个页面转成 markdown: https://example.com/a"',
    '"convert this webpage to markdown https://example.com/a"',
    "## Handle Normally (`handle_normally`)",
    '"save this webpage as pdf"',
    "## Clarify Before Broker (`clarify_before_broker`)",
    '"check this page"',
    "## Host Contract",
    "choose only `broker_first`, `handle_normally`, or `clarify_before_broker`",
    "do not pick a package, workflow family, skill, or MCP at the host layer",
    "build a broker envelope with raw request text plus safe hints",
    "keep it in the host's normal flow",
    "ask a short clarifying question before brokering",
    "do not silently substitute a host-native fetch, browsing, or install path",
    "## Capability Query Contract",
    "When you can confidently normalize the request, `capabilityQuery` is optional but preferred.",
    "## Decline Contract",
    "If the broker returns `UNSUPPORTED_REQUEST`, continue normally.",
    "If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.",
    "If the broker returns `NO_CANDIDATE`, offer capability discovery help.",
    "If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.",
    "If the broker returns `HANDOFF_READY`, keep the broker-selected downstream path as the source of truth.",
    "If `handoff.localSkill.skillFilePath` is present, read that `SKILL.md` from disk and execute it directly.",
    "Only invoke a downstream skill by name when it is already listed by the host.",
    "If the broker-selected downstream skill fails because the skill itself or its required runtime dependencies are broken or unusable, rerun the broker with the same request plus `executionFailures` describing that failed downstream candidate.",
    "Do not silently substitute a host-native fallback while retrying broker-owned downstream selection.",
    "If the broker returns `PREPARE_FAILED`, explain the failure clearly",
    "## Runner Contract",
    '--debug \'{"requestText":"QA this website https://example.com"',
    '"requestText":"turn this webpage into markdown: https://example.com/article"'
  ]);

  expect(skill).toContain(
    "The host decides only the boundary; the broker chooses the package, workflow, skill, or MCP."
  );
  expect(skill).toContain("a specialized reusable workflow");
  expect(skill).toContain("structured `capabilityQuery`");
  expect(skill).toContain('"jobFamilies":["requirements_analysis"]');
  expect(skill).toContain(
    host === "codex" ? '"host":"codex"' : '"host":"claude-code"'
  );
  expect(skill).not.toContain("maintainedFamilies");
}

describe("host shell installers", () => {
  it("resolve relative shared-home paths before writing host runners", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-shell-"));
    const claudeShellDirectory = join(runtimeDirectory, "claude-code-plugin");
    const codexShellDirectory = join(runtimeDirectory, "codex-skill");
    const relativeBrokerHomeDirectory = "relative-broker-home";
    const maintainedContract = await loadMaintainedBrokerFirstContract(
      join(process.cwd(), "config", "maintained-broker-first-families.json")
    );
    const maintainedBoundaryExamples = maintainedBrokerFirstBoundaryExamples(
      maintainedContract
    );

    try {
      const claudeResult = await installClaudeCodeHostShell({
        installDirectory: claudeShellDirectory,
        brokerHomeDirectory: relativeBrokerHomeDirectory
      });
      const codexResult = await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory: relativeBrokerHomeDirectory
      });

      const claudeRunner = await readFile(claudeResult.runnerPath, "utf8");
      const codexRunner = await readFile(codexResult.runnerPath, "utf8");
      const claudeSkill = await readFile(claudeResult.skillPath, "utf8");
      const codexSkill = await readFile(codexResult.skillPath, "utf8");
      const claudeManifest = JSON.parse(
        await readFile(join(claudeResult.installDirectory, ".skills-broker.json"), "utf8")
      ) as { managedBy?: string };

      expect(claudeRunner).toContain(resolve(relativeBrokerHomeDirectory));
      expect(codexRunner).toContain(resolve(relativeBrokerHomeDirectory));
      expect(claudeRunner).toContain("[--debug] '<broker-envelope-json>'");
      expect(codexRunner).toContain("[--debug] '<broker-envelope-json>'");
      expect(claudeSkill).toContain(
        "Route coarse capability-boundary decisions through skills-broker"
      );
      expect(codexSkill).toContain(
        "Route coarse capability-boundary decisions through skills-broker"
      );
      expectHostSkillLayout(
        claudeSkill,
        "claude-code",
        maintainedBoundaryExamples
      );
      expectHostSkillLayout(codexSkill, "codex", maintainedBoundaryExamples);
      expect(claudeManifest.managedBy).toBe("skills-broker");

      const codexManifest = JSON.parse(
        await readFile(join(codexResult.installDirectory, ".skills-broker.json"), "utf8")
      ) as { managedBy?: string };

      expect(codexManifest.managedBy).toBe("skills-broker");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
