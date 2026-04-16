import { describe, expect, it } from "vitest";
import { prepareCandidate } from "../../src/broker/prepare";
import type { CapabilityCard } from "../../src/core/capability-card";

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

function createInstalledMcpWinner(): CapabilityCard {
  return {
    id: "io.example/website-qa",
    kind: "mcp",
    label: "Website QA",
    compatibilityIntent: "capability_discovery_or_install",
    package: {
      packageId: "io.example/website-qa",
      label: "Website QA",
      installState: "installed",
      acquisition: "mcp_bundle"
    },
    leaf: {
      capabilityId: "io.example/website-qa",
      packageId: "io.example/website-qa",
      subskillId: "website-qa"
    },
    query: {
      jobFamilies: ["quality_assurance"],
      targetTypes: ["website", "url"],
      artifacts: ["qa_report"],
      examples: ["测下这个网站的质量"]
    },
    implementation: {
      id: "io.example/website-qa",
      type: "mcp_server",
      ownerSurface: "broker_owned_downstream"
    },
    hosts: {
      currentHostSupported: true,
      portabilityScore: 0
    },
    prepare: {
      authRequired: false,
      installRequired: false
    },
    ranking: {
      contextCost: 1,
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
    expect(result.selection).toEqual({
      package: result.candidate.package,
      leafCapability: result.candidate.leaf,
      implementation: result.candidate.implementation
    });
    expect(result.context.selectionMode).toBe("explicit");
  });

  it("fails closed when the package is not installed", async () => {
    await expect(
      prepareCandidate(
        {
          ...createWinner(),
          package: {
            ...createWinner().package,
            installState: "available"
          },
          prepare: {
            authRequired: false,
            installRequired: true
          }
        },
        {
          currentHost: "codex"
        }
      )
    ).rejects.toThrow(/is not ready for handoff/);
  });

  it("fails closed when package and implementation selection drift apart", async () => {
    await expect(
      prepareCandidate(
        {
          ...createWinner(),
          implementation: {
            ...createWinner().implementation,
            id: "gstack.office_hours"
          }
        },
        {
          currentHost: "codex"
        }
      )
    ).rejects.toThrow(/outside package "baoyu"/);
  });

  it("accepts installed MCP winners whose ids equal the package id", async () => {
    const result = await prepareCandidate(createInstalledMcpWinner(), {
      currentHost: "codex"
    });

    expect(result.ready).toBe(true);
    expect(result.selection).toEqual({
      package: result.candidate.package,
      leafCapability: result.candidate.leaf,
      implementation: result.candidate.implementation
    });
  });
});
