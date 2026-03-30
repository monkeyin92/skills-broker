import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HostSkillCatalogValidationError,
  loadHostSkillCandidates
} from "../../src/sources/host-skill-catalog";

describe("loadHostSkillCandidates", () => {
  it('filters the host catalog fixture to the matching "web_content_to_markdown" candidate', async () => {
    const fixturePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "host-skill-catalog.json"
    );
    const fixture = JSON.parse(
      await readFile(fixturePath, "utf8")
    ) as {
      skills: Array<{
        id: string;
        kind: "skill";
        label: string;
        intent: string;
      }>;
    };

    const candidates = await loadHostSkillCandidates(
      "web_content_to_markdown",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject(fixture.skills[0]);
    expect(candidates[0].package).toMatchObject({
      packageId: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle",
      probe: {
        layouts: ["single_skill_directory"]
      }
    });
  });

  it('filters the host catalog fixture to the matching "capability_discovery_or_install" candidate', async () => {
    const fixturePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "host-skill-catalog.json"
    );
    const fixture = JSON.parse(
      await readFile(fixturePath, "utf8")
    ) as {
      skills: Array<{
        id: string;
        kind: "skill";
        label: string;
        intent: string;
      }>;
    };

    const candidates = await loadHostSkillCandidates(
      "capability_discovery_or_install",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject(fixture.skills[1]);
    expect(candidates[0].package).toMatchObject({
      packageId: "skills_broker",
      installState: "installed",
      acquisition: "broker_native",
      probe: {
        layouts: ["single_skill_directory"],
        manifestNames: ["skills-broker", "skills_broker"]
      }
    });
  });

  it("rejects an invalid package probe layout before returning candidates", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-invalid-host-catalog-")
    );
    const fixturePath = join(runtimeDirectory, "invalid-host.json");

    await writeFile(
      fixturePath,
      JSON.stringify({
        packages: [
          {
            packageId: "gstack",
            label: "gstack",
            installState: "available",
            acquisition: "published_package",
            probe: {
              layouts: ["unknown-layout"]
            }
          }
        ],
        skills: []
      }),
      "utf8"
    );

    try {
      await expect(
        loadHostSkillCandidates("capability_discovery_or_install", fixturePath)
      ).rejects.toMatchObject({
        name: "HostSkillCatalogValidationError"
      });
      await expect(
        loadHostSkillCandidates("capability_discovery_or_install", fixturePath)
      ).rejects.toThrow(
        `Invalid host skill catalog at ${fixturePath} (packages[0].probe.layouts[0])`
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("rejects an invalid leaf probe alias type before routing", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-invalid-leaf-probe-")
    );
    const fixturePath = join(runtimeDirectory, "invalid-host.json");

    await writeFile(
      fixturePath,
      JSON.stringify({
        packages: [],
        skills: [
          {
            id: "requirements-analysis",
            kind: "skill",
            label: "Requirements Analysis",
            intent: "capability_discovery_or_install",
            leaf: {
              capabilityId: "gstack.office-hours",
              packageId: "gstack",
              subskillId: "office-hours",
              probe: {
                aliases: [123]
              }
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      await expect(
        loadHostSkillCandidates("capability_discovery_or_install", fixturePath)
      ).rejects.toBeInstanceOf(HostSkillCatalogValidationError);
      await expect(
        loadHostSkillCandidates("capability_discovery_or_install", fixturePath)
      ).rejects.toThrow(
        `Invalid host skill catalog at ${fixturePath} (skills[0].leaf.probe.aliases[0])`
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
