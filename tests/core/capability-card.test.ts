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
    expect(card.implementation).toEqual({
      id: "mcp-url-to-markdown",
      type: "mcp_server",
      ownerSurface: "broker_owned_downstream"
    });
  });
});
