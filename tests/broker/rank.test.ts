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
    query: overrides.query ?? {
      jobFamilies: ["content_acquisition"],
      targetTypes: ["url"],
      artifacts: ["markdown"],
      examples: ["turn this webpage into markdown"]
    },
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

  it("prefers candidates whose metadata matches the structured capability query", () => {
    const analysis = createCard({
      id: "analysis",
      label: "Requirements Analysis",
      intent: "capability_discovery_or_install",
      query: {
        jobFamilies: ["requirements_analysis"],
        targetTypes: ["problem_statement", "text"],
        artifacts: ["design_doc"],
        examples: ["帮我分析这个需求"]
      }
    });
    const qa = createCard({
      id: "qa",
      label: "Website QA",
      intent: "capability_discovery_or_install",
      query: {
        jobFamilies: ["quality_assurance"],
        targetTypes: ["website", "url"],
        artifacts: ["qa_report"],
        examples: ["QA 这个网站"]
      }
    });

    const ranked = rankCapabilities({
      currentHost: "claude-code",
      requestIntent: "capability_discovery_or_install",
      requestCapabilityQuery: {
        kind: "capability_request",
        goal: "analyze a product requirement and produce a design doc",
        host: "claude-code",
        requestText: "帮我做需求分析并产出设计文档",
        jobFamilies: ["requirements_analysis"],
        targets: [
          {
            type: "problem_statement",
            value: "skills-broker capability routing"
          }
        ],
        artifacts: ["design_doc"]
      },
      candidates: [qa, analysis]
    });

    expect(ranked.map((card) => card.id)[0]).toBe("analysis");
  });

  it("honors an explicit preferred capability over weaker metadata matches", () => {
    const officeHours = createCard({
      id: "office-hours",
      label: "Office Hours",
      intent: "capability_discovery_or_install",
      query: {
        jobFamilies: ["requirements_analysis"],
        targetTypes: ["problem_statement", "text"],
        artifacts: ["design_doc"],
        examples: ["帮我分析这个需求"]
      },
      sourceMetadata: {
        skillName: "office-hours"
      }
    });
    const qa = createCard({
      id: "qa",
      label: "Website QA",
      intent: "capability_discovery_or_install",
      query: {
        jobFamilies: ["quality_assurance"],
        targetTypes: ["website", "url"],
        artifacts: ["qa_report"],
        examples: ["QA 这个网站"]
      }
    });

    const ranked = rankCapabilities({
      currentHost: "codex",
      requestIntent: "capability_discovery_or_install",
      requestCapabilityQuery: {
        kind: "capability_request",
        goal: "qa a website",
        host: "codex",
        requestText: "检查这个网站质量",
        jobFamilies: ["quality_assurance"],
        targets: [
          {
            type: "website",
            value: "https://example.com"
          }
        ],
        artifacts: ["qa_report"],
        preferredCapability: "office-hours"
      },
      candidates: [qa, officeHours]
    });

    expect(ranked.map((card) => card.id)[0]).toBe("office-hours");
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
