import { describe, expect, it } from "vitest";
import { buildHandoffEnvelope } from "../../src/broker/handoff";
import type { CapabilityCard } from "../../src/core/capability-card";
import type { BrokerRequest } from "../../src/core/types";

function createWinner(): CapabilityCard {
  return {
    id: "winner",
    kind: "skill",
    label: "Winner",
    intent: "web_content_to_markdown",
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
    expect(handoff.chosenImplementation).toEqual({
      id: "baoyu.url_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    });
  });
});
