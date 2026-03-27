import { describe, expect, it } from "vitest";
import { toCapabilityCard } from "../../src/core/capability-card";

describe("toCapabilityCard", () => {
  it("maps a skill candidate to a skill capability card with current host support", () => {
    const skillFixture = {
      id: "skill-webpage-to-markdown",
      label: "Webpage to Markdown",
      intent: "webpage_to_markdown"
    };

    const card = toCapabilityCard(skillFixture);

    expect(card.kind).toBe("skill");
    expect(card.hosts.currentHostSupported).toBe(true);
  });

  it("maps an mcp candidate to an mcp capability card", () => {
    const mcpFixture = {
      id: "mcp-url-to-markdown",
      label: "URL to Markdown",
      intent: "webpage_to_markdown"
    };

    const card = toCapabilityCard(mcpFixture);

    expect(card.kind).toBe("mcp");
  });
});
