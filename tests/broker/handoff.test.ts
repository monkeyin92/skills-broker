import { describe, expect, it } from "vitest";
import { buildHandoffEnvelope } from "../../src/broker/handoff";
import type { CapabilityCard } from "../../src/core/capability-card";

function createWinner(): CapabilityCard {
  return {
    id: "winner",
    kind: "skill",
    label: "Winner",
    intent: "webpage_to_markdown",
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
  it("returns brokerDone true when handoff is built", () => {
    const handoff = buildHandoffEnvelope(createWinner(), {
      currentHost: "codex"
    });

    expect(handoff.brokerDone).toBe(true);
  });
});
