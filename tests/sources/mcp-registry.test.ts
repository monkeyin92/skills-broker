import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { searchMcpRegistry } from "../../src/sources/mcp-registry";

describe("searchMcpRegistry", () => {
  it('parses the official-style registry fixture and keeps the matching "webpage_to_markdown" candidate', async () => {
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
      servers: Array<{
        server: {
          name: string;
          title: string;
          description: string;
        };
      }>;
    };

    const candidates = await searchMcpRegistry(
      "webpage_to_markdown",
      fixturePath
    );

    expect(candidates).toEqual([
      {
        id: fixture.servers[0].server.name,
        kind: "mcp",
        label: fixture.servers[0].server.title,
        intent: "webpage_to_markdown"
      }
    ]);
  });
});
