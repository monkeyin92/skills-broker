import { describe, expect, it } from "vitest";
import { prepareCandidate } from "../../src/broker/prepare";
import type { CapabilityCard } from "../../src/core/capability-card";

function createWinner(): CapabilityCard {
  return {
    id: "winner",
    kind: "skill",
    label: "Winner",
    intent: "web_content_to_markdown",
    package: {
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle"
    },
    leaf: {
      capabilityId: "baoyu.url-to-markdown",
      packageId: "baoyu",
      subskillId: "url-to-markdown"
    },
    query: {
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      targetTypes: ["url", "website", "repo"],
      artifacts: ["markdown"],
      examples: ["turn this webpage into markdown"]
    },
    implementation: {
      id: "baoyu.url_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    },
    hosts: {
      currentHostSupported: true,
      portabilityScore: 1
    },
    prepare: {
      authRequired: false,
      installRequired: false
    },
    ranking: {
      contextCost: 0,
      confidence: 1
    },
    sourceMetadata: {}
  };
}

describe("prepareCandidate", () => {
  it("returns ready true for the selected candidate", async () => {
    const result = await prepareCandidate(createWinner(), {
      currentHost: "codex"
    });

    expect(result.ready).toBe(true);
    expect(result.candidate.package.packageId).toBe("baoyu");
    expect(result.candidate.leaf.subskillId).toBe("url-to-markdown");
    expect(result.candidate.implementation.id).toBe("baoyu.url_to_markdown");
  });
});
