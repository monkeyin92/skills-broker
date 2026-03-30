import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { searchMcpRegistry } from "../../src/sources/mcp-registry";

describe("searchMcpRegistry", () => {
  it('parses the official-style registry fixture and keeps the matching "web_content_to_markdown" candidate', async () => {
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
      "web_content_to_markdown",
      fixturePath
    );

    expect(candidates).toEqual([
      {
        id: fixture.servers[0].server.name,
        kind: "mcp",
        label: fixture.servers[0].server.title,
        intent: "web_content_to_markdown",
        package: {
          packageId: fixture.servers[0].server.name,
          label: fixture.servers[0].server.title,
          installState: "available",
          acquisition: "mcp_bundle",
          probe: {
            layouts: ["single_skill_directory"],
            manifestNames: [
              fixture.servers[0].server.name,
              fixture.servers[0].server.title
            ]
          }
        },
        leaf: {
          capabilityId: fixture.servers[0].server.name,
          packageId: fixture.servers[0].server.name,
          subskillId: "url-to-markdown",
          probe: {
            manifestNames: [
              fixture.servers[0].server.name,
              fixture.servers[0].server.title
            ],
            aliases: ["url-to-markdown"]
          }
        },
        implementation: {
          id: fixture.servers[0].server.name,
          type: "mcp_server",
          ownerSurface: "broker_owned_downstream"
        },
        sourceMetadata: {
          registryName: fixture.servers[0].server.name,
          registryTitle: fixture.servers[0].server.title
        }
      }
    ]);
  });

  it('keeps the matching "social_post_to_markdown" candidate', async () => {
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
      "social_post_to_markdown",
      fixturePath
    );

    expect(candidates).toEqual([
      {
        id: fixture.servers[2].server.name,
        kind: "mcp",
        label: fixture.servers[2].server.title,
        intent: "social_post_to_markdown",
        package: {
          packageId: fixture.servers[2].server.name,
          label: fixture.servers[2].server.title,
          installState: "available",
          acquisition: "mcp_bundle",
          probe: {
            layouts: ["single_skill_directory"],
            manifestNames: [
              fixture.servers[2].server.name,
              fixture.servers[2].server.title
            ]
          }
        },
        leaf: {
          capabilityId: fixture.servers[2].server.name,
          packageId: fixture.servers[2].server.name,
          subskillId: "social-post-to-markdown",
          probe: {
            manifestNames: [
              fixture.servers[2].server.name,
              fixture.servers[2].server.title
            ],
            aliases: ["social-post-to-markdown"]
          }
        },
        implementation: {
          id: fixture.servers[2].server.name,
          type: "mcp_server",
          ownerSurface: "broker_owned_downstream"
        },
        sourceMetadata: {
          registryName: fixture.servers[2].server.name,
          registryTitle: fixture.servers[2].server.title
        }
      }
    ]);
  });

  it('keeps the matching "capability_discovery_or_install" candidate', async () => {
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
      "capability_discovery_or_install",
      fixturePath
    );

    expect(candidates).toEqual([
      {
        id: fixture.servers[3].server.name,
        kind: "mcp",
        label: fixture.servers[3].server.title,
        intent: "capability_discovery_or_install",
        package: {
          packageId: fixture.servers[3].server.name,
          label: fixture.servers[3].server.title,
          installState: "available",
          acquisition: "mcp_bundle",
          probe: {
            layouts: ["single_skill_directory"],
            manifestNames: [
              fixture.servers[3].server.name,
              fixture.servers[3].server.title
            ]
          }
        },
        leaf: {
          capabilityId: fixture.servers[3].server.name,
          packageId: fixture.servers[3].server.name,
          subskillId: "capability-discovery",
          probe: {
            manifestNames: [
              fixture.servers[3].server.name,
              fixture.servers[3].server.title
            ],
            aliases: ["capability-discovery"]
          }
        },
        implementation: {
          id: fixture.servers[3].server.name,
          type: "mcp_server",
          ownerSurface: "broker_owned_downstream"
        },
        sourceMetadata: {
          registryName: fixture.servers[3].server.name,
          registryTitle: fixture.servers[3].server.title
        }
      }
    ]);
  });
});
