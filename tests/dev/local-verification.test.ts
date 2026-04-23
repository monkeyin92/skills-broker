import { describe, expect, it } from "vitest";
import {
  inspectLocalVerificationHealth,
  parseLocalVerificationMode,
  resolveNpmCliPath,
  shouldRunLocalVerificationSuite
} from "../../src/dev/local-verification";

describe("local verification", () => {
  it("reports a healthy preflight before build and test run", async () => {
    const nodePath = "/opt/node-v22/bin/node";
    const npmCliPath = resolveNpmCliPath(nodePath, {});
    const report = await inspectLocalVerificationHealth({
      cwd: "/repo",
      nodePath,
      nodeVersion: "v22.11.0",
      env: {},
      fileExists: async (pathname) =>
        pathname === npmCliPath || pathname === "/repo/node_modules/vitest/vitest.mjs",
      loadRollupNative: async () => {}
    });

    expect(report).toMatchObject({
      nodeVersionOk: true,
      npmCliResolved: true,
      rollupNativeHealthy: true,
      vitestEntryHealthy: true,
      repairSteps: []
    });
    expect(shouldRunLocalVerificationSuite("full", report)).toBe(true);
    expect(shouldRunLocalVerificationSuite("check-only", report)).toBe(false);
  });

  it("returns deterministic repair guidance when rollup native loading is broken", async () => {
    const nodePath = "/opt/node-v22/bin/node";
    const npmCliPath = resolveNpmCliPath(nodePath, {});
    const report = await inspectLocalVerificationHealth({
      cwd: "/repo",
      nodePath,
      nodeVersion: "v22.11.0",
      env: {},
      fileExists: async (pathname) =>
        pathname === npmCliPath || pathname === "/repo/node_modules/vitest/vitest.mjs",
      loadRollupNative: async () => {
        throw new Error("Cannot find module '@rollup/rollup-darwin-arm64'");
      }
    });

    expect(report.rollupNativeHealthy).toBe(false);
    expect(report.repairSteps).toEqual([
      "Run npm ci from the repo root to reinstall Vitest, Rollup, and their optional native dependencies.",
      "Rerun npm run verify:local -- --check-only before npm run build and npm test."
    ]);
    expect(shouldRunLocalVerificationSuite("full", report)).toBe(false);
  });

  it("supports explicit check-only and repair modes", () => {
    expect(parseLocalVerificationMode([])).toBe("full");
    expect(parseLocalVerificationMode(["--check-only"])).toBe("check-only");
    expect(parseLocalVerificationMode(["--repair"])).toBe("repair");
  });

  it("prefers npm_execpath when the environment provides it", () => {
    expect(
      resolveNpmCliPath("/opt/node-v22/bin/node", {
        npm_execpath: "/custom/npm-cli.js"
      })
    ).toBe("/custom/npm-cli.js");
  });
});
