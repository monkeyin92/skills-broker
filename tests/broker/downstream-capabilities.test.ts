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
  });
});
