import { describe, expect, it } from "vitest";
import { loadHostSkillCandidates } from "../../src/sources/host-skill-catalog";
import { toCapabilityCard } from "../../src/core/capability-card";

describe("broker-owned downstream capabilities", () => {
  it("loads a web-content implementation id from the host skill catalog", async () => {
    const candidates = await loadHostSkillCandidates(
      "web_content_to_markdown",
      "config/host-skills.seed.json"
    );

    expect(candidates).toHaveLength(1);
    expect(toCapabilityCard(candidates[0]).implementation).toEqual({
      id: "baoyu.url_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    });
    expect(toCapabilityCard(candidates[0]).package).toMatchObject({
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle",
      probe: {
        layouts: ["single_skill_directory"]
      }
    });
    expect(toCapabilityCard(candidates[0]).leaf).toMatchObject({
      capabilityId: "baoyu.url-to-markdown",
      packageId: "baoyu",
      subskillId: "url-to-markdown",
      probe: {
        manifestNames: ["baoyu-url-to-markdown"],
        aliases: ["url-to-markdown"]
      }
    });
    expect(toCapabilityCard(candidates[0]).query).toMatchObject({
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      artifacts: ["markdown"]
    });
  });

  it("loads a social-post implementation id from the host skill catalog", async () => {
    const candidates = await loadHostSkillCandidates(
      "social_post_to_markdown",
      "config/host-skills.seed.json"
    );

    expect(candidates).toHaveLength(1);
    expect(toCapabilityCard(candidates[0]).implementation).toEqual({
      id: "baoyu.x_post_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    });
    expect(toCapabilityCard(candidates[0]).package).toMatchObject({
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle",
      probe: {
        layouts: ["single_skill_directory"]
      }
    });
    expect(toCapabilityCard(candidates[0]).leaf).toMatchObject({
      capabilityId: "baoyu.x-post-to-markdown",
      packageId: "baoyu",
      subskillId: "x-post-to-markdown",
      probe: {
        manifestNames: ["baoyu-danger-x-to-markdown"],
        aliases: ["x-post-to-markdown"]
      }
    });
    expect(toCapabilityCard(candidates[0]).query).toMatchObject({
      jobFamilies: ["content_acquisition", "social_content_conversion"],
      artifacts: ["markdown"]
    });
  });

  it("loads requirements-analysis, qa, and investigation capabilities from the discovery lane catalog", async () => {
    const candidates = await loadHostSkillCandidates(
      "capability_discovery_or_install",
      "config/host-skills.seed.json"
    );
    const cards = candidates.map((candidate) => toCapabilityCard(candidate));

    expect(cards.map((card) => card.id)).toContain("requirements-analysis");
    expect(cards.map((card) => card.id)).toContain("website-qa");
    expect(cards.map((card) => card.id)).toContain("investigation");
    expect(
      cards.find((card) => card.id === "requirements-analysis")?.implementation.id
    ).toBe("gstack.office_hours");
    expect(
      cards.find((card) => card.id === "requirements-analysis")?.package.packageId
    ).toBe("gstack");
    expect(
      cards.find((card) => card.id === "requirements-analysis")?.package.installState
    ).toBe("installed");
    expect(
      cards.find((card) => card.id === "requirements-analysis")?.leaf.subskillId
    ).toBe("office-hours");
    expect(
      cards.find((card) => card.id === "website-qa")?.implementation.id
    ).toBe("gstack.qa");
    expect(
      cards.find((card) => card.id === "website-qa")?.package.packageId
    ).toBe("gstack");
    expect(
      cards.find((card) => card.id === "website-qa")?.package.installState
    ).toBe("installed");
    expect(
      cards.find((card) => card.id === "website-qa")?.leaf.subskillId
    ).toBe("qa");
    expect(
      cards.find((card) => card.id === "investigation")?.implementation.id
    ).toBe("gstack.investigate");
    expect(
      cards.find((card) => card.id === "investigation")?.package.packageId
    ).toBe("gstack");
    expect(
      cards.find((card) => card.id === "investigation")?.package.installState
    ).toBe("installed");
    expect(
      cards.find((card) => card.id === "investigation")?.leaf.subskillId
    ).toBe("investigate");
  });
});
