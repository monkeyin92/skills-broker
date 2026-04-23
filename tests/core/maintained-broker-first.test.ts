import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadMaintainedBrokerFirstContract,
  maintainedBrokerFirstBoundaryExamples,
  parseMaintainedBrokerFirstContract
} from "../../src/core/maintained-broker-first";

describe("maintained broker-first contract", () => {
  it("loads the checked-in contract and exposes deduplicated boundary examples", async () => {
    const contract = await loadMaintainedBrokerFirstContract(
      join(process.cwd(), "config", "maintained-broker-first-families.json")
    );

    expect(contract.maintainedFamilies.map((entry) => entry.family)).toEqual([
      "requirements_analysis",
      "quality_assurance",
      "investigation"
    ]);
    expect(contract.maintainedFamilies.map((entry) => entry.winnerId)).toEqual([
      "requirements-analysis",
      "website-qa",
      "investigation-to-fix"
    ]);
    expect(maintainedBrokerFirstBoundaryExamples(contract)).toContain(
      "帮我做需求分析并产出设计文档"
    );
    expect(maintainedBrokerFirstBoundaryExamples(contract)).toContain(
      "investigate this site failure with a reusable workflow"
    );
  });

  it("fails closed on unknown schema versions", () => {
    expect(() =>
      parseMaintainedBrokerFirstContract("memory.json", {
        schemaVersion: 2,
        maintainedFamilies: []
      })
    ).toThrow(/schemaVersion/);
  });

  it("fails closed on duplicate family identities", () => {
    expect(() =>
      parseMaintainedBrokerFirstContract("memory.json", {
        schemaVersion: 1,
        maintainedFamilies: [
          {
            family: "quality_assurance",
            winnerId: "website-qa",
            capabilityId: "gstack.qa",
            expectedIntent: "capability_discovery_or_install",
            boundaryExamples: ["QA this website"]
          },
          {
            family: "quality_assurance",
            winnerId: "website-qa-2",
            capabilityId: "gstack.qa-2",
            expectedIntent: "capability_discovery_or_install",
            boundaryExamples: ["check this website quality"]
          }
        ]
      })
    ).toThrow(/duplicate value/);
  });

  it("rejects malformed files when loading from disk", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-broker-maintained-"));
    const filePath = join(directory, "maintained.json");

    try {
      await writeFile(
        filePath,
        JSON.stringify({
          schemaVersion: 1,
          maintainedFamilies: [
            {
              family: "requirements_analysis",
              winnerId: "",
              capabilityId: "gstack.office-hours",
              expectedIntent: "capability_discovery_or_install",
              boundaryExamples: ["帮我做需求分析并产出设计文档"]
            }
          ]
        }),
        "utf8"
      );

      await expect(loadMaintainedBrokerFirstContract(filePath)).rejects.toThrow(
        /winnerId/
      );
      await expect(readFile(filePath, "utf8")).resolves.toContain(
        "\"requirements_analysis\""
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
