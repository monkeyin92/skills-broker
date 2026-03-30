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
    expect(toCapabilityCard(candidates[0]).query).toMatchObject({
      jobFamilies: ["content_acquisition", "social_content_conversion"],
      artifacts: ["markdown"]
    });
  });

  it("loads requirements-analysis and qa capabilities from the discovery lane catalog", async () => {
    const candidates = await loadHostSkillCandidates(
      "capability_discovery_or_install",
      "config/host-skills.seed.json"
    );
    const cards = candidates.map((candidate) => toCapabilityCard(candidate));

    expect(cards.map((card) => card.id)).toContain("requirements-analysis");
    expect(cards.map((card) => card.id)).toContain("website-qa");
    expect(
      cards.find((card) => card.id === "requirements-analysis")?.implementation.id
    ).toBe("gstack.office_hours");
    expect(
      cards.find((card) => card.id === "website-qa")?.implementation.id
    ).toBe("gstack.qa");
  });
});
