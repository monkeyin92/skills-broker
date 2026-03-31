import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { installCodexHostShell } from "../../src/hosts/codex/install";

describe("host shell installers", () => {
  it("resolve relative shared-home paths before writing host runners", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-shell-"));
    const claudeShellDirectory = join(runtimeDirectory, "claude-code-plugin");
    const codexShellDirectory = join(runtimeDirectory, "codex-skill");
    const relativeBrokerHomeDirectory = "relative-broker-home";

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
      expect(claudeRunner).toContain("<broker-envelope-json>");
      expect(codexRunner).toContain("<broker-envelope-json>");
      expect(claudeSkill).toContain("Route capability requests through skills-broker");
      expect(claudeSkill).toContain("do not independently substitute WebFetch");
      expect(claudeSkill).toContain("structured `capabilityQuery`");
      expect(claudeSkill).toContain('"jobFamilies":["requirements_analysis"]');
      expect(claudeSkill).toContain('"测下这个网站的质量"');
      expect(claudeSkill).toContain('"检查这个网站质量"');
      expect(claudeSkill).toContain('"QA 这个网站"');
      expect(claudeSkill).toContain('"QA this website"');
      expect(claudeSkill).toContain('"check this website quality"');
      expect(claudeSkill).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
      expect(claudeSkill).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
      expect(claudeSkill).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery or install help.");
      expect(claudeSkill).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");
      expect(claudeSkill).toContain('"requestText":"turn this webpage into markdown: https://example.com/article"');
      expect(codexSkill).toContain("Route capability requests through skills-broker");
      expect(codexSkill).toContain("do not fall back to host-native fetch/install behavior");
      expect(codexSkill).toContain("structured `capabilityQuery`");
      expect(codexSkill).toContain('"jobFamilies":["quality_assurance"]');
      expect(codexSkill).toContain('"测下这个网站的质量"');
      expect(codexSkill).toContain('"检查这个网站质量"');
      expect(codexSkill).toContain('"QA 这个网站"');
      expect(codexSkill).toContain('"QA this website"');
      expect(codexSkill).toContain('"check this website quality"');
      expect(codexSkill).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
      expect(codexSkill).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
      expect(codexSkill).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery or install help.");
      expect(codexSkill).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");
      expect(codexSkill).toContain('"host":"codex"');
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
