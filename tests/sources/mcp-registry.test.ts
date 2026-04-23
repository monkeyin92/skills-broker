import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { searchMcpRegistry } from "../../src/sources/mcp-registry";

function expectValidatedRegistryMetadata(
  candidate: {
    sourceMetadata: Record<string, unknown>;
  },
  expected: {
    name: string;
    title: string;
    version: string;
    transport: string;
    endpointCount: number;
    matchedBy: string;
    jobFamilies: string[];
    targetTypes: string[];
    artifacts: string[];
  }
): void {
  expect(candidate.sourceMetadata).toMatchObject({
    registryName: expected.name,
    registryTitle: expected.title,
    registryVersion: expected.version,
    registryTransport: expected.transport,
    registryTransportTypes: [expected.transport],
    registryEndpointCount: expected.endpointCount,
    registryValidation: {
      status: "validated",
      usableRemoteCount: expected.endpointCount
    },
    registryQueryCoverage: {
      matchedBy: expected.matchedBy,
      jobFamilies: expected.jobFamilies,
      targetTypes: expected.targetTypes,
      artifacts: expected.artifacts
    }
  });
}

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
          version: string;
        };
      }>;
    };

    const candidates = await searchMcpRegistry(
      "web_content_to_markdown",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
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
      implementation: {
        id: fixture.servers[0].server.name,
        type: "mcp_server",
        ownerSurface: "broker_owned_downstream"
      }
    });
    expectValidatedRegistryMetadata(candidates[0], {
      name: fixture.servers[0].server.name,
      title: fixture.servers[0].server.title,
      version: fixture.servers[0].server.version,
      transport: "streamable-http",
      endpointCount: 1,
      matchedBy: "intent_match",
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      targetTypes: ["url", "website", "repo"],
      artifacts: ["markdown"]
    });
  });

  it('keeps the matching "social_post_to_markdown" candidate with validated registry metadata', async () => {
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
          version: string;
        };
      }>;
    };

    const candidates = await searchMcpRegistry(
      "social_post_to_markdown",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: fixture.servers[2].server.name,
      kind: "mcp",
      label: fixture.servers[2].server.title,
      intent: "social_post_to_markdown",
      query: {
        jobFamilies: ["content_acquisition", "social_content_conversion"],
        targetTypes: ["url", "website"],
        artifacts: ["markdown"],
        examples: [fixture.servers[2].server.description]
      }
    });
    expectValidatedRegistryMetadata(candidates[0], {
      name: fixture.servers[2].server.name,
      title: fixture.servers[2].server.title,
      version: fixture.servers[2].server.version,
      transport: "streamable-http",
      endpointCount: 1,
      matchedBy: "intent_match",
      jobFamilies: ["content_acquisition", "social_content_conversion"],
      targetTypes: ["url", "website"],
      artifacts: ["markdown"]
    });
  });

  it('keeps the matching "capability_discovery_or_install" candidate with validated registry metadata', async () => {
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
          version: string;
        };
      }>;
    };

    const candidates = await searchMcpRegistry(
      "capability_discovery_or_install",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: fixture.servers[3].server.name,
      kind: "mcp",
      label: fixture.servers[3].server.title,
      intent: "capability_discovery_or_install",
      query: {
        jobFamilies: ["capability_acquisition"],
        targetTypes: ["text", "problem_statement"],
        artifacts: ["recommendation", "installation_plan"],
        examples: [fixture.servers[3].server.description]
      }
    });
    expectValidatedRegistryMetadata(candidates[0], {
      name: fixture.servers[3].server.name,
      title: fixture.servers[3].server.title,
      version: fixture.servers[3].server.version,
      transport: "streamable-http",
      endpointCount: 1,
      matchedBy: "intent_match",
      jobFamilies: ["capability_acquisition"],
      targetTypes: ["text", "problem_statement"],
      artifacts: ["recommendation", "installation_plan"]
    });
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
              description: "QA websites, audit quality, and produce a qa report.",
              version: "1.2.0",
              remotes: [
                {
                  type: "streamable-http",
                  url: "https://example.com/qa"
                }
              ]
            }
          },
          {
            server: {
              name: "io.example/capability-discovery",
              title: "Capability Discovery",
              description:
                "Find, discover, and install skills, MCP servers, plugins, and tools for a task.",
              version: "1.4.0",
              remotes: [
                {
                  type: "streamable-http",
                  url: "https://example.com/discovery"
                }
              ]
            }
          },
          {
            server: {
              name: "io.example/image-to-text",
              title: "Image to Text",
              description: "Extract text from images.",
              version: "1.0.0",
              remotes: [
                {
                  type: "streamable-http",
                  url: "https://example.com/image"
                }
              ]
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
      expectValidatedRegistryMetadata(candidates[0], {
        name: "io.example/website-qa",
        title: "Website QA",
        version: "1.2.0",
        transport: "streamable-http",
        endpointCount: 1,
        matchedBy: "structured_query",
        jobFamilies: ["quality_assurance"],
        targetTypes: ["website"],
        artifacts: ["qa_report"]
      });
      expectValidatedRegistryMetadata(candidates[1], {
        name: "io.example/capability-discovery",
        title: "Capability Discovery",
        version: "1.4.0",
        transport: "streamable-http",
        endpointCount: 1,
        matchedBy: "discovery_fallback",
        jobFamilies: [],
        targetTypes: [],
        artifacts: []
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("filters malformed registry entries before they can become MCP candidates", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-mcp-invalid-")
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
              description: "QA websites, audit quality, and produce a qa report.",
              version: "2.0.0",
              remotes: [
                {
                  type: "streamable-http",
                  url: "https://example.com/qa"
                }
              ]
            }
          },
          {
            server: {
              name: "io.example/missing-version",
              title: "Missing Version",
              description: "QA websites and produce a qa report.",
              remotes: [
                {
                  type: "streamable-http",
                  url: "https://example.com/missing-version"
                }
              ]
            }
          },
          {
            server: {
              name: "io.example/missing-remotes",
              title: "Missing Remotes",
              description: "QA websites and produce a qa report.",
              version: "1.0.0"
            }
          },
          {
            server: {
              name: "io.example/unusable-remote",
              title: "Unusable Remote",
              description: "QA websites and produce a qa report.",
              version: "1.0.0",
              remotes: [
                {
                  type: "streamable-http"
                }
              ]
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
        "io.example/website-qa"
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
