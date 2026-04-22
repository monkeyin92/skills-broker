import { access, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";

const execFileAsync = promisify(execFile);

describe("Claude Code smoke", () => {
  it(
    "installs a minimal Claude Code plugin and returns HANDOFF_READY for markdown handoff",
    async () => {
      const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-claude-code-"));
      const installDirectory = join(runtimeDirectory, "claude-code-plugin");
      const cacheFilePath = join(runtimeDirectory, "broker-cache.json");
      const packageJsonPath = join(installDirectory, "package.json");
      const manifestPath = join(installDirectory, ".claude-plugin", "plugin.json");
      const installScriptPath = join(
        process.cwd(),
        "scripts",
        "install-claude-code.sh"
      );
      const hostConfigPath = join(installDirectory, "config", "host-skills.seed.json");
      const mcpConfigPath = join(installDirectory, "config", "mcp-registry.seed.json");
      const runnerPath = join(installDirectory, "bin", "run-broker");
      const distCliPath = join(installDirectory, "dist", "cli.js");
      const skillPath = join(
        installDirectory,
        "skills",
        "skills-broker",
        "SKILL.md"
      );

      try {
        await execFileAsync("bash", [installScriptPath, installDirectory], {
          cwd: process.cwd()
        });

        await expect(access(packageJsonPath)).resolves.toBeUndefined();
        await expect(access(manifestPath)).resolves.toBeUndefined();
        await expect(access(skillPath)).resolves.toBeUndefined();
        await expect(access(hostConfigPath)).resolves.toBeUndefined();
        await expect(access(mcpConfigPath)).resolves.toBeUndefined();
        await expect(access(runnerPath)).resolves.toBeUndefined();
        await expect(access(distCliPath)).resolves.toBeUndefined();

        const installedPackage = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
          version: string;
        };
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        expect(manifest).toMatchObject({
          name: "skills-broker-claude-code",
          version: installedPackage.version
        });

        const skillContents = await readFile(skillPath, "utf8");
        expect(skillContents).toContain("# Skills Broker");
        expect(skillContents).toContain("Route coarse capability-boundary decisions through skills-broker");
        expect(skillContents).toContain("Use this skill only at the coarse broker boundary.");
        expect(skillContents).toContain("The host decides only one of these boundary outcomes:");
        expect(skillContents).toContain("## Broker-First (`broker_first`)");
        expect(skillContents).toContain("If you need one concrete broker-first example to calibrate the boundary, start with website QA.");
        expect(skillContents).toContain("### Hero lane: website QA");
        expect(skillContents).toContain("Keep website QA visually first. It is the QA default-entry lane and the calibration lane. Other maintained lanes are still valid, but secondary.");
        expect(skillContents).toContain("Treat the examples below as semantic anchors, not literal trigger phrases.");
        expect(skillContents).toContain("Prefer semantic judgment over exact string overlap.");
        expect(skillContents).toContain("\"QA this website https://example.com\"");
        expect(skillContents).toContain("### Secondary maintained lanes");
        expect(skillContents).toContain("Requirements analysis and investigation still stay broker-first. They are maintained lanes, but they should not be the first thing this installed shell makes you try.");
        expect(skillContents).toContain("## Handle Normally (`handle_normally`)");
        expect(skillContents).toContain("## Clarify Before Broker (`clarify_before_broker`)");
        expect(skillContents).toContain("\"check this page\"");
        expect(skillContents).toContain("build a broker envelope with raw request text plus safe hints");
        expect(skillContents).toContain("do not pick a package, workflow family, skill, or MCP at the host layer");
        expect(skillContents).toContain("structured `capabilityQuery`");
        expect(skillContents).toContain("If the broker returns `UNSUPPORTED_REQUEST`, continue normally.");
        expect(skillContents).toContain("If the broker returns `AMBIGUOUS_REQUEST`, ask a clarifying question.");
        expect(skillContents).toContain("If the broker returns `NO_CANDIDATE`, offer capability discovery help.");
        expect(skillContents).toContain("If the broker returns `INSTALL_REQUIRED`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.");
        expect(skillContents).toContain("If the broker returns `HANDOFF_READY`, keep the broker-selected downstream path as the source of truth.");
        expect(skillContents).toContain("If the broker returns `PREPARE_FAILED`, explain the failure clearly");
        expect(skillContents).toContain("../../bin/run-broker");

        const relocatedInstallDirectory = join(
          runtimeDirectory,
          "claude-code-plugin-relocated"
        );
        await rename(installDirectory, relocatedInstallDirectory);
        const relocatedRunnerPath = join(relocatedInstallDirectory, "bin", "run-broker");

        const result = await runClaudeCodeAdapter(
          {
            requestText: "turn this webpage into markdown: https://example.com/article",
            host: "claude-code",
            invocationMode: "explicit",
            urls: ["https://example.com/article"]
          },
          {
            installDirectory: relocatedInstallDirectory,
            cacheFilePath
          }
        );

        expect(result.ok).toBe(true);
        expect(result.outcome.code).toBe("HANDOFF_READY");
        expect(result.handoff.context.currentHost).toBe("claude-code");
        expect(result.handoff.request.url).toBe("https://example.com/article");

        const { stdout } = await execFileAsync(
          "bash",
          [
            relocatedRunnerPath,
            "--debug",
            JSON.stringify({
              requestText: "测下这个网站的质量",
              host: "claude-code",
              invocationMode: "auto",
              urls: ["https://example.com/qa"]
            })
          ],
          {
            cwd: relocatedInstallDirectory,
            env: {
              ...process.env,
              BROKER_NOW: "2026-03-31T10:00:00.000Z"
            }
          }
        );
        const debugResult = JSON.parse(stdout) as {
          trace?: {
            host: string;
            resultCode: string;
            winnerId: string | null;
          };
        };

        expect(debugResult).toMatchObject({
          trace: {
            host: "claude-code",
            resultCode: "HANDOFF_READY",
            winnerId: "website-qa"
          }
        });
      } finally {
        await rm(runtimeDirectory, { recursive: true, force: true });
      }
    },
    30_000
  );
});
