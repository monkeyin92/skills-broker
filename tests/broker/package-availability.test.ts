import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CapabilityCard } from "../../src/core/capability-card";
import { hydratePackageAvailability } from "../../src/broker/package-availability";

function createAvailableSkill(): CapabilityCard {
  return {
    id: "requirements-analysis",
    kind: "skill",
    label: "Requirements Analysis",
    compatibilityIntent: "capability_discovery_or_install",
    package: {
      packageId: "gstack",
      label: "gstack",
      installState: "available",
      acquisition: "published_package",
      probe: {
        layouts: ["bundle_root_children", "nested_agent_skills"],
        manifestNames: ["gstack"]
      }
    },
    leaf: {
      capabilityId: "gstack.office-hours",
      packageId: "gstack",
      subskillId: "office-hours",
      probe: {
        manifestNames: ["office-hours"],
        aliases: ["gstack-office-hours"]
      }
    },
    query: {
      jobFamilies: ["requirements_analysis"],
      targetTypes: ["problem_statement", "text"],
      artifacts: ["design_doc"],
      examples: ["帮我分析这个需求"]
    },
    implementation: {
      id: "gstack.office_hours",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    },
    hosts: {
      currentHostSupported: true,
      portabilityScore: 1
    },
    prepare: {
      authRequired: false,
      installRequired: true
    },
    ranking: {
      contextCost: 0,
      confidence: 1
    },
    sourceMetadata: {
      skillName: "office-hours"
    }
  };
}

describe("hydratePackageAvailability", () => {
  it("upgrades an available package when a matching direct skill manifest exists", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-package-direct-"));

    try {
      const skillDirectory = join(runtimeDirectory, "baoyu-url-to-markdown");

      await mkdir(skillDirectory, { recursive: true });
      await writeFile(
        join(skillDirectory, "SKILL.md"),
        "---\nname: baoyu-url-to-markdown\n---\n",
        "utf8"
      );

      const [card] = await hydratePackageAvailability(
        [
          {
            ...createAvailableSkill(),
            id: "web-content-to-markdown",
            label: "Web Content to Markdown",
            package: {
              packageId: "baoyu",
              label: "baoyu",
              installState: "available",
              acquisition: "published_package",
              probe: {
                layouts: ["single_skill_directory"]
              }
            },
            leaf: {
              capabilityId: "baoyu.url-to-markdown",
              packageId: "baoyu",
              subskillId: "url-to-markdown",
              probe: {
                manifestNames: ["baoyu-url-to-markdown"],
                aliases: ["url-to-markdown"]
              }
            },
            implementation: {
              id: "baoyu.url_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            sourceMetadata: {
              skillName: "baoyu-url-to-markdown"
            }
          }
        ],
        {
          currentHost: "claude-code",
          packageSearchRoots: [runtimeDirectory]
        }
      );

      expect(card.package.installState).toBe("installed");
      expect(card.prepare.installRequired).toBe(false);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("does not upgrade an available package when only a matching directory name exists", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-package-directory-only-"));

    try {
      const skillDirectory = join(runtimeDirectory, "baoyu-url-to-markdown");

      await mkdir(skillDirectory, { recursive: true });

      const [card] = await hydratePackageAvailability(
        [
          {
            ...createAvailableSkill(),
            id: "web-content-to-markdown",
            label: "Web Content to Markdown",
            package: {
              packageId: "baoyu",
              label: "baoyu",
              installState: "available",
              acquisition: "published_package",
              probe: {
                layouts: ["single_skill_directory"]
              }
            },
            leaf: {
              capabilityId: "baoyu.url-to-markdown",
              packageId: "baoyu",
              subskillId: "url-to-markdown",
              probe: {
                manifestNames: ["baoyu-url-to-markdown"],
                aliases: ["url-to-markdown"]
              }
            },
            implementation: {
              id: "baoyu.url_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            sourceMetadata: {
              skillName: "baoyu-url-to-markdown"
            }
          }
        ],
        {
          currentHost: "claude-code",
          packageSearchRoots: [runtimeDirectory]
        }
      );

      expect(card.package.installState).toBe("available");
      expect(card.prepare.installRequired).toBe(true);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("upgrades an available package when a bundle manifest and direct child skill manifest exist", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-package-direct-child-"));

    try {
      const packageDirectory = join(runtimeDirectory, "gstack");
      const skillDirectory = join(packageDirectory, "office-hours");

      await mkdir(skillDirectory, { recursive: true });
      await writeFile(
        join(packageDirectory, "package.json"),
        JSON.stringify({ name: "gstack", version: "0.13.8.0" }),
        "utf8"
      );
      await writeFile(
        join(skillDirectory, "SKILL.md"),
        "---\nname: office-hours\nversion: 2.0.0\n---\n",
        "utf8"
      );

      const [card] = await hydratePackageAvailability(
        [createAvailableSkill()],
        {
          currentHost: "codex",
          packageSearchRoots: [runtimeDirectory]
        }
      );

      expect(card.package.installState).toBe("installed");
      expect(card.prepare.installRequired).toBe(false);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("upgrades an available package when a nested bundle skill manifest exists", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-package-nested-"));

    try {
      const packageDirectory = join(runtimeDirectory, "gstack");
      const nestedSkillDirectory = join(
        packageDirectory,
        ".agents",
        "skills",
        "gstack-office-hours"
      );

      await mkdir(nestedSkillDirectory, { recursive: true });
      await writeFile(
        join(packageDirectory, "package.json"),
        JSON.stringify({ name: "gstack", version: "0.13.8.0" }),
        "utf8"
      );
      await writeFile(
        join(nestedSkillDirectory, "SKILL.md"),
        "---\nname: office-hours\nversion: 2.0.0\n---\n",
        "utf8"
      );

      const [card] = await hydratePackageAvailability(
        [createAvailableSkill()],
        {
          currentHost: "codex",
          packageSearchRoots: [runtimeDirectory]
        }
      );

      expect(card.package.installState).toBe("installed");
      expect(card.prepare.installRequired).toBe(false);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("does not upgrade an available package when the package manifest exists without the leaf skill", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-package-root-only-"));

    try {
      const packageDirectory = join(runtimeDirectory, "gstack");

      await mkdir(packageDirectory, { recursive: true });
      await writeFile(
        join(packageDirectory, "package.json"),
        JSON.stringify({ name: "gstack", version: "0.13.8.0" }),
        "utf8"
      );

      const [card] = await hydratePackageAvailability(
        [createAvailableSkill()],
        {
          currentHost: "codex",
          packageSearchRoots: [runtimeDirectory]
        }
      );

      expect(card.package.installState).toBe("available");
      expect(card.prepare.installRequired).toBe(true);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
