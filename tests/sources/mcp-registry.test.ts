import { describe, expect, it } from "vitest";
import { searchMcpRegistry } from "../../src/sources/mcp-registry";

describe("searchMcpRegistry", () => {
  it('returns at least one candidate for "webpage_to_markdown"', async () => {
    const candidates = await searchMcpRegistry("webpage_to_markdown");

    expect(candidates.length).toBeGreaterThan(0);
  });
});
