import { describe, expect, it } from "vitest";
import { prepareCandidate } from "../../src/broker/prepare";
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

describe("prepareCandidate", () => {
  it("returns ready true for the selected candidate", async () => {
    const result = await prepareCandidate(createWinner(), {
      currentHost: "codex"
    });

    expect(result.ready).toBe(true);
  });
});
