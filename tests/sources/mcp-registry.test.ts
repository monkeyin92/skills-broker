import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
        query: {
          jobFamilies: ["content_acquisition", "web_content_conversion"],
          targetTypes: ["url", "website", "repo"],
          artifacts: ["markdown"],
          examples: [fixture.servers[0].server.description]
        },
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
        query: {
          jobFamilies: ["content_acquisition", "social_content_conversion"],
          targetTypes: ["url", "website"],
          artifacts: ["markdown"],
          examples: [fixture.servers[2].server.description]
        },
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
        query: {
          jobFamilies: ["capability_acquisition"],
          targetTypes: ["text", "problem_statement"],
          artifacts: ["recommendation", "installation_plan"],
          examples: [fixture.servers[3].server.description]
        },
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

  it("uses structured capability queries to keep query-specific MCPs plus generic discovery fallback", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-mcp-query-")
    );
    const fixturePath = join(runtimeDirectory, "mcp.json");

    await writeFile(
      fixturePath,
      JSON.stringify({
        servers: [
          {
            server: {
              name: "io.example/website-qa",
              title: "Website QA",
              description: "QA websites, audit quality, and produce a qa report."
            }
          },
          {
            server: {
              name: "io.example/capability-discovery",
              title: "Capability Discovery",
              description:
                "Find, discover, and install skills, MCP servers, plugins, and tools for a task."
            }
          },
          {
            server: {
              name: "io.example/image-to-text",
              title: "Image to Text",
              description: "Extract text from images."
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      const candidates = await searchMcpRegistry(
        {
          intent: "capability_discovery_or_install",
          capabilityQuery: {
            kind: "capability_request",
            goal: "qa a website",
            host: "claude-code",
            requestText: "测下这个网站的质量",
            jobFamilies: ["quality_assurance"],
            targets: [
              {
                type: "website",
                value: "https://example.com"
              }
            ],
            artifacts: ["qa_report"]
          }
        },
        fixturePath
      );

      expect(candidates.map((candidate) => candidate.id)).toEqual([
        "io.example/website-qa",
        "io.example/capability-discovery"
      ]);
      expect(candidates[0]).toMatchObject({
        intent: "capability_discovery_or_install",
        query: {
          jobFamilies: ["quality_assurance"],
          artifacts: ["qa_report"]
        }
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
