import { describe, expect, it } from "vitest";
import {
  buildCiTrustSurfaceSpecs,
  evaluateCiTrustSurfaceSpecs,
  inspectCiTrustReport,
  type CiTrustInventory,
  type CiTrustSurfaceSpec
} from "../../src/dev/ci-trust";

describe("ci trust", () => {
  it("passes on the current repo once trust gates are wired into CI", async () => {
    const report = await inspectCiTrustReport({
      repoRoot: process.cwd()
    });

    expect(report.hasIssues).toBe(false);
    expect(report.surfaceResults.some((surface) => surface.id === "narrative:operator-truth"))
      .toBe(true);
    expect(
      report.surfaceResults.some(
        (surface) => surface.id === "repo-proof:status-and-strict-doctor"
      )
    ).toBe(true);
  });

  it("builds workflow surfaces dynamically from the inventory", () => {
    const inventory: CiTrustInventory = {
      supportedHosts: ["claude-code"],
      maintainedFamilies: ["requirements_analysis"],
      provenFamilies: ["website_qa"],
      workflows: ["idea-to-ship", "new-workflow"]
    };

    const surfaces = buildCiTrustSurfaceSpecs(inventory);

    expect(surfaces.some((surface) => surface.id === "workflow:new-workflow")).toBe(
      true
    );
  });

  it("fails closed when a required proof file no longer mentions the surface", async () => {
    const surfaces: CiTrustSurfaceSpec[] = [
      {
        id: "workflow:new-workflow",
        kind: "workflow",
        label: "Workflow New Workflow",
        risk: "high",
        requiredLayers: ["runtime"],
        proofs: [
          {
            layer: "runtime",
            path: "tests/broker/workflow-runtime.test.ts",
            label: "runtime coverage",
            containsAny: ["new-workflow"]
          }
        ]
      }
    ];

    const report = await evaluateCiTrustSurfaceSpecs(
      "/repo",
      {
        supportedHosts: ["claude-code"],
        maintainedFamilies: [],
        provenFamilies: [],
        workflows: ["new-workflow"]
      },
      surfaces,
      {
        pathExists: async () => true,
        readText: async () =>
          'it("starts the idea-to-ship workflow with a runId and active stage", async () => {})\n'
      }
    );

    expect(report.hasIssues).toBe(true);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CI_TRUST_PROOF_SNIPPET_MISSING",
          surfaceId: "workflow:new-workflow"
        }),
        expect.objectContaining({
          code: "CI_TRUST_LAYER_MISSING",
          surfaceId: "workflow:new-workflow",
          layer: "runtime"
        })
      ])
    );
  });
});
