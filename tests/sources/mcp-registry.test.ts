import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { searchMcpRegistry } from "../../src/sources/mcp-registry";

describe("searchMcpRegistry", () => {
  it('filters the recorded registry fixture to the matching "webpage_to_markdown" candidate', async () => {
    const fixturePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "mcp-registry",
      "search-response.json"
    );
    const fixture = JSON.parse(
      await readFile(fixturePath, "utf8")
    ) as {
      results: Array<{
        id: string;
        kind: "mcp";
        label: string;
        intent: string;
      }>;
    };

    const candidates = await searchMcpRegistry(
      "webpage_to_markdown",
      fixturePath
    );

    expect(candidates).toEqual([fixture.results[0]]);
  });
});
