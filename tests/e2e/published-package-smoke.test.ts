import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { execNpm } from "../helpers/npm";

describe("published package smoke", () => {
  it("installs shared-home runtime assets from the packed npm artifact", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-published-package-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const hostConfigPath = join(brokerHomeDirectory, "config", "host-skills.seed.json");
    const mcpConfigPath = join(brokerHomeDirectory, "config", "mcp-registry.seed.json");
    const distCliPath = join(brokerHomeDirectory, "dist", "cli.js");
    const npmCacheDirectory = join(runtimeDirectory, ".npm-cache");
    const env = {
      ...process.env,
      NPM_CONFIG_CACHE: npmCacheDirectory
    };

    let tarballPath: string | undefined;

    try {
      await execNpm(["run", "build"], {
        cwd: process.cwd(),
        env,
        encoding: "utf8"
      });

      const { stdout: packOutput } = await execNpm(["pack", "--json"], {
        cwd: process.cwd(),
        env,
        encoding: "utf8"
      });
      const packResult = JSON.parse(packOutput) as Array<{ filename: string }>;
      tarballPath = resolve(process.cwd(), packResult[0].filename);

      const { stdout } = await execNpm([
        "exec",
        "--yes",
        "--package",
        tarballPath,
        "--",
        "skills-broker",
        "update",
        "--broker-home",
        brokerHomeDirectory
      ], {
        cwd: process.cwd(),
        env,
        encoding: "utf8"
      });

      expect(stdout).toContain("Shared home status: installed");
      await expect(access(hostConfigPath)).resolves.toBeUndefined();
      await expect(access(mcpConfigPath)).resolves.toBeUndefined();
      await expect(access(distCliPath)).resolves.toBeUndefined();
    } finally {
      if (tarballPath !== undefined) {
        await rm(tarballPath, { force: true });
      }
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 60_000);
});
