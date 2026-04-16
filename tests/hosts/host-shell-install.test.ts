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
      expect(claudeSkill).toContain("Route coarse capability-boundary decisions through skills-broker");
      expect(claudeSkill).toContain("Use this skill only at the coarse broker boundary.");
      expect(claudeSkill).toContain("The host decides only one of these boundary outcomes:");
      expect(claudeSkill).toContain("Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer.");
      expect(claudeSkill).toContain("## Broker-First (`broker_first`)");
      expect(claudeSkill).toContain("## Handle Normally (`handle_normally`)");
      expect(claudeSkill).toContain("## Clarify Before Broker (`clarify_before_broker`)");
      expect(claudeSkill).toContain("The host decides only the boundary; the broker chooses the package, workflow, skill, or MCP.");
      expect(claudeSkill).toContain("a specialized reusable workflow");
      for (const example of maintainedBoundaryExamples) {
        expect(claudeSkill).toContain(example);
      }
      expect(claudeSkill).toContain("build a broker envelope with raw request text plus safe hints");
      expect(claudeSkill).toContain("keep it in the host's normal flow");
      expect(claudeSkill).toContain("ask a short clarifying question before brokering");
      expect(claudeSkill).toContain("do not silently substitute a host-native fetch, browsing, or install path");
      expect(claudeSkill).toContain("choose only `broker_first`, `handle_normally`, or `clarify_before_broker`");
      expect(claudeSkill).toContain("do not pick a package, workflow family, skill, or MCP at the host layer");
      expect(claudeSkill).toContain("structured `capabilityQuery`");
      expect(claudeSkill).toContain('"jobFamilies":["requirements_analysis"]');
      expect(claudeSkill).toContain('"测下这个网站的质量：https://www.baidu.com"');
      expect(claudeSkill).toContain('"find a skill or MCP for website QA"');
      expect(claudeSkill).toContain('"save this webpage as pdf"');
      expect(claudeSkill).toContain('"check this page"');
      expect(claudeSkill).toContain('--debug \'{"requestText":"QA this website https://example.com"');
      expect(claudeSkill).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
      expect(claudeSkill).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
      expect(claudeSkill).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery help.");
      expect(claudeSkill).toContain("If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan.");
      expect(claudeSkill).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");
      expect(claudeSkill).toContain('"requestText":"turn this webpage into markdown: https://example.com/article"');
      expect(codexSkill).toContain("Route coarse capability-boundary decisions through skills-broker");
      expect(codexSkill).toContain("Use this skill only at the coarse broker boundary.");
      expect(codexSkill).toContain("The host decides only one of these boundary outcomes:");
      expect(codexSkill).toContain("Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer.");
      expect(codexSkill).toContain("## Broker-First (`broker_first`)");
      expect(codexSkill).toContain("## Handle Normally (`handle_normally`)");
      expect(codexSkill).toContain("## Clarify Before Broker (`clarify_before_broker`)");
      expect(codexSkill).toContain("The host decides only the boundary; the broker chooses the package, workflow, skill, or MCP.");
      expect(codexSkill).toContain("a specialized reusable workflow");
      for (const example of maintainedBoundaryExamples) {
        expect(codexSkill).toContain(example);
      }
      expect(codexSkill).toContain("build a broker envelope with raw request text plus safe hints");
      expect(codexSkill).toContain("keep it in the host's normal flow");
      expect(codexSkill).toContain("ask a short clarifying question before brokering");
      expect(codexSkill).toContain("do not silently substitute a host-native fetch, browsing, or install path");
      expect(codexSkill).toContain("choose only `broker_first`, `handle_normally`, or `clarify_before_broker`");
      expect(codexSkill).toContain("do not pick a package, workflow family, skill, or MCP at the host layer");
      expect(codexSkill).toContain("structured `capabilityQuery`");
      expect(codexSkill).toContain('"jobFamilies":["requirements_analysis"]');
      expect(codexSkill).toContain('"测下这个网站的质量：https://www.baidu.com"');
      expect(codexSkill).toContain('"find a skill or MCP for website QA"');
      expect(codexSkill).toContain('"save this webpage as pdf"');
      expect(codexSkill).toContain('"check this page"');
      expect(codexSkill).toContain('--debug \'{"requestText":"QA this website https://example.com"');
      expect(codexSkill).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
      expect(codexSkill).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
      expect(codexSkill).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery help.");
      expect(codexSkill).toContain("If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan.");
      expect(codexSkill).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");
      expect(codexSkill).toContain('"host":"codex"');
      expect(claudeSkill).not.toContain("maintainedFamilies");
      expect(codexSkill).not.toContain("maintainedFamilies");
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
