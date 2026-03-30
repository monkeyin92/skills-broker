import { describe, expect, it } from "vitest";
import { toCapabilityCard } from "../../src/core/capability-card";

describe("toCapabilityCard", () => {
  it("maps a skill candidate to a broker-owned downstream capability card", () => {
    const skillFixture = {
      kind: "skill" as const,
      id: "web-content-to-markdown",
      label: "Web Content to Markdown",
      intent: "web_content_to_markdown" as const,
      implementation: {
        id: "baoyu.url_to_markdown",
        type: "local_skill" as const,
        ownerSurface: "broker_owned_downstream" as const
      }
    };

    const card = toCapabilityCard(skillFixture);

    expect(card.kind).toBe("skill");
    expect(card.hosts.currentHostSupported).toBe(true);
    expect(card.query).toMatchObject({
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      targetTypes: ["url", "website", "repo"],
      artifacts: ["markdown"]
    });
    expect(card.package).toEqual({
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle"
    });
    expect(card.leaf).toEqual({
      capabilityId: "baoyu.url-to-markdown",
      packageId: "baoyu",
      subskillId: "url-to-markdown"
    });
    expect(card.implementation).toEqual({
      id: "baoyu.url_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    });
  });

  it("maps an mcp candidate to an mcp capability card with downstream defaults", () => {
    const mcpFixture = {
      kind: "mcp" as const,
      id: "mcp-url-to-markdown",
      label: "URL to Markdown",
      intent: "web_content_to_markdown" as const
    };

    const card = toCapabilityCard(mcpFixture);

    expect(card.kind).toBe("mcp");
    expect(card.hosts.currentHostSupported).toBe(true);
    expect(card.query).toMatchObject({
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      artifacts: ["markdown"]
    });
    expect(card.package).toEqual({
      packageId: "mcp",
      label: "mcp",
      installState: "installed",
      acquisition: "mcp_bundle"
    });
    expect(card.leaf).toEqual({
      capabilityId: "mcp.mcp-url-to-markdown",
      packageId: "mcp",
      subskillId: "mcp-url-to-markdown"
    });
    expect(card.implementation).toEqual({
      id: "mcp-url-to-markdown",
      type: "mcp_server",
      ownerSurface: "broker_owned_downstream"
    });
  });

  it("merges explicit candidate query metadata over defaults", () => {
    const card = toCapabilityCard({
      kind: "skill",
      id: "requirements-analysis",
      label: "Requirements Analysis",
      intent: "capability_discovery_or_install",
      query: {
        jobFamilies: ["requirements_analysis"],
        targetTypes: ["problem_statement", "text"],
        artifacts: ["design_doc"],
        examples: ["帮我分析这个需求"]
      }
    });

    expect(card.query).toMatchObject({
      jobFamilies: ["requirements_analysis"],
      targetTypes: ["problem_statement", "text"],
      artifacts: ["design_doc"],
      examples: ["帮我分析这个需求"]
    });
    expect(card.package).toEqual({
      packageId: "requirements-analysis",
      label: "requirements-analysis",
      installState: "installed",
      acquisition: "local_skill_bundle"
    });
    expect(card.leaf).toEqual({
      capabilityId: "requirements-analysis.requirements-analysis",
      packageId: "requirements-analysis",
      subskillId: "requirements-analysis"
    });
  });
});
