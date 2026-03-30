import { describe, expect, it } from "vitest";
import { explainDecision } from "../../src/broker/explain";
import { rankCapabilities } from "../../src/broker/rank";
import type { CapabilityCard } from "../../src/core/capability-card";

function createCard(
  overrides: Partial<CapabilityCard> & Pick<CapabilityCard, "id" | "label">
): CapabilityCard {
  return {
    id: overrides.id,
    kind: overrides.kind ?? "skill",
    label: overrides.label,
    intent: overrides.intent ?? "web_content_to_markdown",
    implementation: overrides.implementation ?? {
      id: `${overrides.id}.impl`,
      type: (overrides.kind ?? "skill") === "skill" ? "local_skill" : "mcp_server",
      ownerSurface: "broker_owned_downstream"
    },
    hosts: {
      currentHostSupported: true,
      portabilityScore: 1,
      ...(overrides.hosts ?? {})
    },
    prepare: {
      authRequired: false,
      installRequired: false,
      ...(overrides.prepare ?? {})
    },
    ranking: {
      contextCost: 0,
      confidence: 1,
      ...(overrides.ranking ?? {})
    },
    sourceMetadata: overrides.sourceMetadata ?? {}
  };
}

describe("rankCapabilities", () => {
  it("filters out candidates unsupported by the current host", () => {
    const supported = createCard({
      id: "supported",
      label: "Supported",
      hosts: {
        currentHostSupported: true,
        portabilityScore: 1
      }
    });
    const unsupported = createCard({
      id: "unsupported",
      label: "Unsupported",
      hosts: {
        currentHostSupported: false,
        portabilityScore: 1
      }
    });

    const ranked = rankCapabilities({
      currentHost: "codex",
      requestIntent: "web_content_to_markdown",
      candidates: [unsupported, supported]
    });

    expect(ranked.map((card) => card.id)).toEqual(["supported"]);
  });

  it("prefers a cached candidate when all other ranking factors are equal", () => {
    const cold = createCard({
      id: "cold",
      label: "Cold candidate"
    });
    const warm = createCard({
      id: "warm",
      label: "Warm candidate"
    });

    const ranked = rankCapabilities({
      currentHost: "codex",
      requestIntent: "web_content_to_markdown",
      candidates: [cold, warm],
      historyByCandidateId: {
        warm: {
          cacheHit: true,
          successfulRoutes: 3
        }
      }
    });

    expect(ranked.map((card) => card.id)[0]).toBe("warm");
  });
});

describe("explainDecision", () => {
  it("mentions current host support and cache reuse in the ranking explanation", () => {
    const decision = explainDecision(
      createCard({
        id: "warm",
        label: "Warm candidate"
      }),
      {
        currentHost: "codex",
        requestIntent: "web_content_to_markdown",
        history: {
          cacheHit: true,
          successfulRoutes: 3
        }
      }
    );

    expect(decision).toContain("current host");
    expect(decision).toContain("cache");
    expect(decision).toContain("intent");
  });
});
