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
    expect(card.compatibilityIntent).toBe("web_content_to_markdown");
    expect(card.hosts.currentHostSupported).toBe(true);
    expect(card.query).toMatchObject({
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      targetTypes: ["url", "website", "repo"],
      artifacts: ["markdown"]
    });
    expect(card.package).toMatchObject({
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle",
      probe: {
        layouts: ["single_skill_directory"],
        manifestNames: ["baoyu"],
        manifestFiles: [
          "package.json",
          "SKILL.md",
          ".skills-broker.json",
          "conductor.json"
        ]
      }
    });
    expect(card.leaf).toMatchObject({
      capabilityId: "baoyu.url-to-markdown",
      packageId: "baoyu",
      subskillId: "url-to-markdown",
      probe: {
        manifestNames: ["url-to-markdown"],
        aliases: ["baoyu-url-to-markdown"],
        manifestFiles: ["SKILL.md", ".skills-broker.json"]
      }
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
    expect(card.compatibilityIntent).toBe("web_content_to_markdown");
    expect(card.hosts.currentHostSupported).toBe(true);
    expect(card.query).toMatchObject({
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      artifacts: ["markdown"]
    });
    expect(card.package).toMatchObject({
      packageId: "mcp",
      label: "mcp",
      installState: "installed",
      acquisition: "mcp_bundle"
    });
    expect(card.leaf).toMatchObject({
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

  it("preserves explicit MCP probes instead of dropping them during normalization", () => {
    const card = toCapabilityCard({
      kind: "mcp",
      id: "io.example/website-qa",
      label: "Website QA",
      intent: "capability_discovery_or_install",
      package: {
        packageId: "io.example/website-qa",
        label: "Website QA",
        installState: "available",
        acquisition: "mcp_bundle",
        probe: {
          layouts: ["single_skill_directory"],
          manifestNames: ["io.example/website-qa", "Website QA"]
        }
      },
      leaf: {
        capabilityId: "io.example/website-qa",
        packageId: "io.example/website-qa",
        subskillId: "website-qa",
        probe: {
          manifestNames: ["io.example/website-qa", "Website QA"],
          aliases: ["website-qa"]
        }
      },
      implementation: {
        id: "io.example/website-qa",
        type: "mcp_server",
        ownerSurface: "broker_owned_downstream"
      }
    });

    expect(card.package.probe).toEqual({
      layouts: ["single_skill_directory"],
      manifestNames: ["io.example/website-qa", "Website QA"]
    });
    expect(card.leaf.probe).toEqual({
      manifestNames: ["io.example/website-qa", "Website QA"],
      aliases: ["website-qa"]
    });
    expect(card.prepare.installRequired).toBe(true);
  });

  it("prefers explicit package and leaf identity over a conflicting implementation id", () => {
    const card = toCapabilityCard({
      kind: "skill",
      id: "requirements-analysis",
      label: "Requirements Analysis",
      intent: "capability_discovery_or_install",
      package: {
        packageId: "gstack"
      },
      leaf: {
        capabilityId: "gstack.office-hours",
        packageId: "gstack",
        subskillId: "office-hours"
      },
      implementation: {
        id: "legacy_bundle.requirements_analysis",
        type: "local_skill",
        ownerSurface: "broker_owned_downstream"
      }
    });

    expect(card.package.packageId).toBe("gstack");
    expect(card.leaf).toMatchObject({
      capabilityId: "gstack.office-hours",
      packageId: "gstack",
      subskillId: "office-hours"
    });
    expect(card.implementation.id).toBe("legacy_bundle.requirements_analysis");
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
    expect(card.compatibilityIntent).toBe("capability_discovery_or_install");
    expect(card.package).toMatchObject({
      packageId: "requirements-analysis",
      label: "requirements-analysis",
      installState: "installed",
      acquisition: "local_skill_bundle",
      probe: {
        layouts: ["single_skill_directory"],
        manifestNames: ["requirements-analysis"]
      }
    });
    expect(card.leaf).toMatchObject({
      capabilityId: "requirements-analysis.requirements-analysis",
      packageId: "requirements-analysis",
      subskillId: "requirements-analysis",
      probe: {
        manifestNames: ["requirements-analysis"],
        aliases: ["requirements-analysis-requirements-analysis"]
      }
    });
  });

  it("allows website QA cards to carry explicit proven-family metadata without changing compatibility intent", () => {
    const card = toCapabilityCard({
      kind: "skill",
      id: "website-qa",
      label: "Website QA",
      intent: "capability_discovery_or_install",
      query: {
        summary: "QA websites and produce reusable QA reports",
        keywords: ["website", "qa", "quality"],
        antiKeywords: ["markdown"],
        confidenceHints: ["website", "url", "qa_report"],
        proofFamily: "website_qa",
        jobFamilies: ["quality_assurance"],
        targetTypes: ["website", "url"],
        artifacts: ["qa_report"],
        examples: ["QA 这个网站"]
      }
    });

    expect(card.compatibilityIntent).toBe("capability_discovery_or_install");
    expect(card.query).toMatchObject({
      summary: "QA websites and produce reusable QA reports",
      keywords: ["skill", "mcp", "install", "discover", "website", "qa", "quality"],
      antiKeywords: ["markdown", "transcribe"],
      confidenceHints: ["text", "problem_statement", "website", "url", "qa_report"],
      proofFamily: "website_qa",
      jobFamilies: ["quality_assurance"],
      targetTypes: ["website", "url"],
      artifacts: ["qa_report"],
      examples: ["QA 这个网站"]
    });
  });
});
