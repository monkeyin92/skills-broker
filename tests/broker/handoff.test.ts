import { describe, expect, it } from "vitest";
import { buildHandoffEnvelope } from "../../src/broker/handoff";
import type { CapabilityCard } from "../../src/core/capability-card";
import type { BrokerRequest } from "../../src/core/types";

function createWinner(): CapabilityCard {
  return {
    id: "winner",
    kind: "skill",
    label: "Winner",
    compatibilityIntent: "web_content_to_markdown",
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

describe("buildHandoffEnvelope", () => {
  it("includes the normalized request when handoff is built", () => {
    const request: BrokerRequest = {
      intent: "web_content_to_markdown",
      outputMode: "markdown_only",
      url: "https://example.com/article"
    };
    const handoff = buildHandoffEnvelope(createWinner(), {
      currentHost: "codex"
    }, request);

    expect(handoff.brokerDone).toBe(true);
    expect(handoff.request).toEqual(request);
    expect(handoff.chosenPackage).toEqual({
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle"
    });
    expect(handoff.chosenLeafCapability).toEqual({
      capabilityId: "baoyu.url-to-markdown",
      packageId: "baoyu",
      subskillId: "url-to-markdown"
    });
    expect(handoff.chosenImplementation).toEqual({
      id: "baoyu.url_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    });
  });
});
