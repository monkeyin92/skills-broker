import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLegacyRequestCacheKey, resolveBrokerRequest } from "../../src/broker/resolved-request";
import { runBroker } from "../../src/broker/run";
import { normalizeRequest } from "../../src/core/request";
import { routingTraceLogFilePath } from "../../src/broker/trace-store";

const validUrlRequest = {
  task: "turn this webpage into markdown",
  url: "https://example.com/article"
};

async function createRuntimePaths() {
  const directory = await mkdtemp(join(tmpdir(), "skills-broker-integration-"));

  return {
    directory,
    brokerHomeDirectory: join(directory, ".skills-broker"),
    cacheFilePath: join(directory, "broker-cache.json")
  };
}

function expectQueryNativeRequest(
  request: {
    outputMode: string;
    capabilityQuery: Record<string, unknown>;
  }
): void {
  expect(request).not.toHaveProperty("intent");
  expect(request.outputMode).toBe("markdown_only");
}

describe("runBroker", () => {
  it("returns HANDOFF_READY for a first-time supported request", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("web-content-to-markdown");
      expect(result.handoff.chosenPackage.packageId).toBe("baoyu");
      expect(result.handoff.chosenLeafCapability.subskillId).toBe(
        "url-to-markdown"
      );
      expect(result.handoff.chosenImplementation.id).toBe("baoyu.url_to_markdown");
      expect(result.handoff.selection).toEqual({
        package: result.handoff.chosenPackage,
        leafCapability: result.handoff.chosenLeafCapability,
        implementation: result.handoff.chosenImplementation
      });
      expect(result.handoff.brokerDone).toBe(true);
      expect(result.handoff.candidate.id).toBe(result.winner.id);
      expectQueryNativeRequest(result.handoff.request);
      expect(result.handoff.request).toEqual({
        outputMode: "markdown_only",
        url: validUrlRequest.url,
        capabilityQuery: {
          kind: "capability_request",
          goal: "convert web content to markdown",
          host: "claude-code",
          requestText: "turn this webpage into markdown",
          jobFamilies: ["content_acquisition", "web_content_conversion"],
          targets: [
            {
              type: "url",
              value: validUrlRequest.url
            }
          ],
          artifacts: ["markdown"]
        }
      });
      expect(result.debug.cacheHit).toBe(false);
      expect(result.trace).toMatchObject({
        host: "claude-code",
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        missLayer: null,
        normalizedBy: "legacy_intent",
        requestSurface: "legacy_task",
        requestContract: "query_native_via_legacy_compat",
        selectionMode: "explicit",
        candidateCount: result.debug.candidateCount,
        winnerId: "web-content-to-markdown",
        winnerPackageId: "baoyu",
        selectedCapabilityId: "baoyu.url-to-markdown",
        selectedLeafCapabilityId: "url-to-markdown",
        selectedImplementationId: "baoyu.url_to_markdown",
        selectedPackageInstallState: "installed"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("uses cache-first routing for an identical repeat request", async () => {
    const runtime = await createRuntimePaths();

    try {
      const firstResult = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-03-27T08:00:00.000Z")
      });
      const secondResult = await runBroker(
        {
          task: "turn this webpage into markdown",
          url: validUrlRequest.url
        },
        {
          ...runtime,
          now: new Date("2026-03-27T12:00:00.000Z")
        }
      );

      expect(firstResult.ok).toBe(true);
      expect(secondResult.ok).toBe(true);
      expect(secondResult.outcome.code).toBe("HANDOFF_READY");
      expect(secondResult.winner.id).toBe(firstResult.winner.id);
      expect(secondResult.debug.cacheHit).toBe(true);
      expect(secondResult.debug.cachedCandidateId).toBe(firstResult.winner.id);
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("does not reuse cache across different target values even when the legacy intent matches", async () => {
    const runtime = await createRuntimePaths();

    try {
      const firstResult = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-03-27T08:00:00.000Z")
      });
      const secondResult = await runBroker(
        {
          task: "turn this webpage into markdown",
          url: "https://example.com/article?ref=repeat"
        },
        {
          ...runtime,
          now: new Date("2026-03-27T12:00:00.000Z")
        }
      );

      expect(firstResult.ok).toBe(true);
      expect(secondResult.ok).toBe(true);
      expect(secondResult.outcome.code).toBe("HANDOFF_READY");
      expect(secondResult.winner.id).toBe(firstResult.winner.id);
      expect(secondResult.debug.cacheHit).toBe(false);
      expect(secondResult.debug.cachedCandidateId).toBeUndefined();
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("dual-reads legacy cache records and rewrites them forward with query identity", async () => {
    const runtime = await createRuntimePaths();

    try {
      const initial = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(initial.ok).toBe(true);

      const legacyRequest = normalizeRequest(validUrlRequest, "claude-code");
      const resolvedLegacyRequest = resolveBrokerRequest(legacyRequest);
      await writeFile(
        runtime.cacheFilePath,
        `${JSON.stringify(
          {
            card: {
              ...initial.winner,
              fetchedAt: "2026-03-27T08:00:00.000Z"
            },
            lastHost: "claude-code",
            requestIntent: resolvedLegacyRequest.compatibilityIntent,
            requestCacheKey: buildLegacyRequestCacheKey(
              legacyRequest,
              resolvedLegacyRequest.compatibilityIntent
            ),
            successfulRoutes: 2
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const replay = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-03-27T12:00:00.000Z")
      });
      const rewritten = JSON.parse(
        await readFile(runtime.cacheFilePath, "utf8")
      ) as {
        requestQueryIdentity?: string;
        requestIntent?: string;
        requestCacheKey?: string;
        successfulRoutes: number;
      };

      expect(replay.ok).toBe(true);
      expect(replay.debug.cacheHit).toBe(false);
      expect(rewritten.requestQueryIdentity).toBe(
        resolvedLegacyRequest.requestQueryIdentity
      );
      expect(rewritten.requestIntent).toBeUndefined();
      expect(rewritten.requestCacheKey).toBeUndefined();
      expect(rewritten.successfulRoutes).toBe(3);
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("persists routing traces to the shared broker home when configured", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(result.ok).toBe(true);

      const traceLog = await readFile(
        routingTraceLogFilePath(runtime.brokerHomeDirectory),
        "utf8"
      );
      const persisted = traceLog
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { requestSurface: string; routingOutcome: string });

      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        requestSurface: "legacy_task",
        requestContract: "query_native_via_legacy_compat",
        routingOutcome: "hit"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("reuses a shared cached winner across hosts for the same intent", async () => {
    const runtime = await createRuntimePaths();

    try {
      const firstResult = await runBroker(validUrlRequest, {
        ...runtime,
        currentHost: "claude-code",
        now: new Date("2026-03-27T08:00:00.000Z")
      });
      const secondResult = await runBroker(validUrlRequest, {
        ...runtime,
        currentHost: "codex",
        now: new Date("2026-03-27T12:00:00.000Z")
      });

      expect(firstResult.ok).toBe(true);
      expect(secondResult.ok).toBe(true);
      expect(secondResult.outcome.code).toBe("HANDOFF_READY");
      expect(secondResult.winner.id).toBe(firstResult.winner.id);
      expect(secondResult.debug.cacheHit).toBe(true);
      expect(secondResult.debug.cachedCandidateId).toBe(firstResult.winner.id);
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("returns NO_CANDIDATE when local sources cannot match the request", async () => {
    const runtime = await createRuntimePaths();
    const emptyHostCatalogFilePath = join(runtime.directory, "empty-host.json");
    const emptyMcpRegistryFilePath = join(runtime.directory, "empty-mcp.json");

    await writeFile(emptyHostCatalogFilePath, JSON.stringify({ skills: [] }), "utf8");
    await writeFile(
      emptyMcpRegistryFilePath,
      JSON.stringify({ results: [] }),
      "utf8"
    );

    try {
      const result = await runBroker(validUrlRequest, {
        cacheFilePath: runtime.cacheFilePath,
        hostCatalogFilePath: emptyHostCatalogFilePath,
        mcpRegistryFilePath: emptyMcpRegistryFilePath,
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("NO_CANDIDATE");
      expect(result.outcome.hostAction).toBe("offer_capability_discovery");
      expect(result.outcome.message).toContain("Offer capability discovery or install help");
      expect(result.error.message).toContain("No candidate");
      expect(result.trace).toMatchObject({
        host: "claude-code",
        resultCode: "NO_CANDIDATE",
        missLayer: "retrieval",
        normalizedBy: "legacy_intent",
        requestSurface: "legacy_task",
        requestContract: "query_native_via_legacy_compat",
        candidateCount: 0,
        winnerId: null,
        winnerPackageId: null
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("continues with host skills when the MCP source fails", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "host.json");

    await writeFile(
      hostCatalogFilePath,
      JSON.stringify({
        skills: [
          {
            id: "web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown",
            intent: "web_content_to_markdown",
            implementation: {
              id: "baoyu.url_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      const result = await runBroker(validUrlRequest, {
        cacheFilePath: runtime.cacheFilePath,
        hostCatalogFilePath,
        mcpRegistryFilePath: join(runtime.directory, "missing-mcp.json"),
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("web-content-to-markdown");
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("uses structured capabilityQuery matching across host skills even when their legacy intent differs", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "host.json");
    const mcpRegistryFilePath = join(runtime.directory, "empty-mcp.json");

    await writeFile(
      hostCatalogFilePath,
      JSON.stringify({
        packages: [
          {
            packageId: "gstack",
            label: "gstack",
            installState: "installed",
            acquisition: "local_skill_bundle"
          }
        ],
        skills: [
          {
            id: "query-native-analysis",
            kind: "skill",
            label: "Query Native Analysis",
            intent: "web_content_to_markdown",
            package: {
              packageId: "gstack"
            },
            leaf: {
              capabilityId: "gstack.office-hours",
              packageId: "gstack",
              subskillId: "office-hours"
            },
            query: {
              jobFamilies: ["requirements_analysis"],
              targetTypes: ["problem_statement", "text"],
              artifacts: ["design_doc", "analysis"],
              examples: ["帮我做需求分析并产出设计文档"]
            },
            implementation: {
              id: "gstack.office-hours",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
          }
        ]
      }),
      "utf8"
    );
    await writeFile(mcpRegistryFilePath, JSON.stringify({ servers: [] }), "utf8");

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code",
          capabilityQuery: {
            kind: "capability_request",
            goal: "analyze a product requirement and produce a design doc",
            host: "claude-code",
            requestText: "帮我做需求分析并产出设计文档",
            jobFamilies: ["requirements_analysis"],
            targets: [
              {
                type: "problem_statement",
                value: "skills-broker capability query migration"
              }
            ],
            artifacts: ["design_doc", "analysis"]
          }
        },
        {
          cacheFilePath: runtime.cacheFilePath,
          hostCatalogFilePath,
          mcpRegistryFilePath,
          now: new Date("2026-04-01T08:00:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("query-native-analysis");
      expectQueryNativeRequest(result.handoff.request);
      expect(result.handoff.request).toMatchObject({
        capabilityQuery: {
          jobFamilies: ["requirements_analysis"],
          artifacts: ["design_doc", "analysis"]
        }
      });
      expect(result.trace).toMatchObject({
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        winnerId: "query-native-analysis",
        reasonCode: "query_native"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("reports compatibility-assisted routing when only the legacy compatibility lane can admit the winner", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "host.json");
    const mcpRegistryFilePath = join(runtime.directory, "empty-mcp.json");

    await writeFile(
      hostCatalogFilePath,
      JSON.stringify({
        packages: [
          {
            packageId: "gstack",
            label: "gstack",
            installState: "installed",
            acquisition: "local_skill_bundle"
          }
        ],
        skills: [
          {
            id: "generic-discovery",
            kind: "skill",
            label: "Generic Discovery",
            intent: "capability_discovery_or_install",
            package: {
              packageId: "gstack"
            },
            leaf: {
              capabilityId: "gstack.find-skills",
              packageId: "gstack",
              subskillId: "find-skills"
            },
            query: {
              jobFamilies: ["capability_acquisition"],
              targetTypes: ["text"],
              artifacts: ["installation_plan"],
              examples: ["find a skill"]
            },
            implementation: {
              id: "gstack.find_skills",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
          }
        ]
      }),
      "utf8"
    );
    await writeFile(mcpRegistryFilePath, JSON.stringify({ servers: [] }), "utf8");

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code",
          capabilityQuery: {
            kind: "capability_request",
            goal: "analyze a product requirement and produce a design doc",
            host: "claude-code",
            requestText: "帮我做需求分析并产出设计文档",
            jobFamilies: ["requirements_analysis"],
            artifacts: ["design_doc", "analysis"]
          }
        },
        {
          cacheFilePath: runtime.cacheFilePath,
          hostCatalogFilePath,
          mcpRegistryFilePath,
          now: new Date("2026-04-01T08:30:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("generic-discovery");
      expect(result.debug.decision).toContain("selection basis: compatibility-assisted");
      expect(result.trace).toMatchObject({
        resultCode: "HANDOFF_READY",
        winnerId: "generic-discovery",
        reasonCode: "query_native_via_legacy_compat"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("continues with MCP candidates when the host catalog fails", async () => {
    const runtime = await createRuntimePaths();
    const mcpRegistryFilePath = join(runtime.directory, "mcp.json");

    await writeFile(
      mcpRegistryFilePath,
      JSON.stringify({
        servers: [
          {
            server: {
              name: "io.example/url-to-markdown",
              title: "URL to Markdown",
              description: "Fetch a webpage URL and convert the page into markdown."
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      const result = await runBroker(validUrlRequest, {
        cacheFilePath: runtime.cacheFilePath,
        hostCatalogFilePath: join(runtime.directory, "missing-host.json"),
        mcpRegistryFilePath,
        currentHost: "codex",
        packageSearchRoots: [runtime.directory],
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("NO_CANDIDATE");
      expect(result.outcome.hostAction).toBe("offer_capability_discovery");
      expect(result.acquisition).toMatchObject({
        reason: "package_not_installed",
        package: {
          packageId: "io.example/url-to-markdown",
          installState: "available",
          acquisition: "mcp_bundle"
        },
        leafCapability: {
          capabilityId: "io.example/url-to-markdown",
          packageId: "io.example/url-to-markdown",
          subskillId: "url-to-markdown"
        }
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("prefers a query-specific MCP over generic discovery fallback for structured QA requests", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "empty-host.json");
    const mcpRegistryFilePath = join(runtime.directory, "mcp.json");

    await writeFile(hostCatalogFilePath, JSON.stringify({ skills: [] }), "utf8");
    await writeFile(
      mcpRegistryFilePath,
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
          }
        ]
      }),
      "utf8"
    );

    try {
      const result = await runBroker(
        {
          requestText: "测下这个网站的质量",
          host: "claude-code",
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
        {
          cacheFilePath: runtime.cacheFilePath,
          hostCatalogFilePath,
          mcpRegistryFilePath,
          packageSearchRoots: [runtime.directory],
          now: new Date("2026-04-01T09:00:00.000Z")
        }
      );

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("NO_CANDIDATE");
      expect(result.acquisition).toMatchObject({
        reason: "package_not_installed",
        package: {
          packageId: "io.example/website-qa",
          installState: "available",
          acquisition: "mcp_bundle"
        },
        leafCapability: {
          capabilityId: "io.example/website-qa",
          packageId: "io.example/website-qa",
          subskillId: "website-qa"
        }
      });
      expect(result.trace).toMatchObject({
        hostDecision: "broker_first",
        resultCode: "NO_CANDIDATE",
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        winnerPackageId: "io.example/website-qa"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("returns a package-aware NO_CANDIDATE when the best leaf belongs to an uninstalled package", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "host.json");
    const mcpRegistryFilePath = join(runtime.directory, "mcp.json");

    await writeFile(
      hostCatalogFilePath,
      JSON.stringify({
        packages: [
          {
            packageId: "gstack",
            label: "gstack",
            installState: "available",
            acquisition: "published_package",
            probe: {
              layouts: ["bundle_root_children", "nested_agent_skills"],
              manifestNames: ["gstack"]
            }
          }
        ],
        skills: [
          {
            id: "requirements-analysis",
            kind: "skill",
            label: "Requirements Analysis",
            intent: "capability_discovery_or_install",
            package: {
              packageId: "gstack"
            },
            leaf: {
              capabilityId: "gstack.office-hours",
              packageId: "gstack",
              subskillId: "office-hours",
              probe: {
                manifestNames: ["office-hours"],
                aliases: ["gstack-office-hours"]
              }
            },
            query: {
              jobFamilies: ["requirements_analysis"],
              targetTypes: ["problem_statement", "text"],
              artifacts: ["design_doc"],
              examples: ["帮我分析这个需求"]
            },
            implementation: {
              id: "gstack.office_hours",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
          }
        ]
      }),
      "utf8"
    );
    await writeFile(mcpRegistryFilePath, JSON.stringify({ servers: [] }), "utf8");

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code",
          capabilityQuery: {
            kind: "capability_request",
            goal: "analyze a product requirement and produce a design doc",
            host: "claude-code",
            requestText: "帮我做需求分析并产出设计文档",
            jobFamilies: ["requirements_analysis"],
            artifacts: ["design_doc"]
          }
        },
        {
          cacheFilePath: runtime.cacheFilePath,
          hostCatalogFilePath,
          mcpRegistryFilePath,
          packageSearchRoots: [runtime.directory],
          now: new Date("2026-03-30T10:00:00.000Z")
        }
      );

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("NO_CANDIDATE");
      expect(result.outcome.hostAction).toBe("offer_capability_discovery");
      expect(result.acquisition).toMatchObject({
        reason: "package_not_installed",
        package: {
          packageId: "gstack",
          installState: "available",
          acquisition: "published_package"
        },
        leafCapability: {
          capabilityId: "gstack.office-hours",
          subskillId: "office-hours"
        }
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("upgrades an available package to installed when the runtime can see the bundle skill", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "host.json");
    const mcpRegistryFilePath = join(runtime.directory, "mcp.json");
    const searchRoot = join(runtime.directory, "package-search");
    const packageDirectory = join(searchRoot, "gstack");
    const nestedSkillDirectory = join(
      packageDirectory,
      ".agents",
      "skills",
      "gstack-office-hours"
    );

    await writeFile(mcpRegistryFilePath, JSON.stringify({ servers: [] }), "utf8");
    await mkdir(nestedSkillDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify({ name: "gstack", version: "0.13.8.0" }),
      "utf8"
    );
    await writeFile(
      join(nestedSkillDirectory, "SKILL.md"),
      "---\nname: office-hours\nversion: 2.0.0\n---\n",
      "utf8"
    );
    await writeFile(
      hostCatalogFilePath,
      JSON.stringify({
        packages: [
          {
            packageId: "gstack",
            label: "gstack",
            installState: "available",
            acquisition: "published_package",
            probe: {
              layouts: ["bundle_root_children", "nested_agent_skills"],
              manifestNames: ["gstack"]
            }
          }
        ],
        skills: [
          {
            id: "requirements-analysis",
            kind: "skill",
            label: "Requirements Analysis",
            intent: "capability_discovery_or_install",
            package: {
              packageId: "gstack"
            },
            leaf: {
              capabilityId: "gstack.office-hours",
              packageId: "gstack",
              subskillId: "office-hours",
              probe: {
                manifestNames: ["office-hours"],
                aliases: ["gstack-office-hours"]
              }
            },
            query: {
              jobFamilies: ["requirements_analysis"],
              targetTypes: ["problem_statement", "text"],
              artifacts: ["design_doc"],
              examples: ["帮我分析这个需求"]
            },
            implementation: {
              id: "gstack.office_hours",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            sourceMetadata: {
              skillName: "office-hours"
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code",
          capabilityQuery: {
            kind: "capability_request",
            goal: "analyze a product requirement and produce a design doc",
            host: "claude-code",
            requestText: "帮我做需求分析并产出设计文档",
            jobFamilies: ["requirements_analysis"],
            artifacts: ["design_doc"]
          }
        },
        {
          cacheFilePath: runtime.cacheFilePath,
          hostCatalogFilePath,
          mcpRegistryFilePath,
          packageSearchRoots: [searchRoot],
          now: new Date("2026-03-30T10:30:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.handoff.chosenPackage.installState).toBe("installed");
      expect(result.handoff.chosenLeafCapability.subskillId).toBe("office-hours");
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("does not upgrade an available package when the runtime only sees the package manifest", async () => {
    const runtime = await createRuntimePaths();
    const hostCatalogFilePath = join(runtime.directory, "host.json");
    const mcpRegistryFilePath = join(runtime.directory, "mcp.json");
    const searchRoot = join(runtime.directory, "package-search");
    const packageDirectory = join(searchRoot, "gstack");

    await writeFile(mcpRegistryFilePath, JSON.stringify({ servers: [] }), "utf8");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify({ name: "gstack", version: "0.13.8.0" }),
      "utf8"
    );
    await writeFile(
      hostCatalogFilePath,
      JSON.stringify({
        packages: [
          {
            packageId: "gstack",
            label: "gstack",
            installState: "available",
            acquisition: "published_package",
            probe: {
              layouts: ["bundle_root_children", "nested_agent_skills"],
              manifestNames: ["gstack"]
            }
          }
        ],
        skills: [
          {
            id: "requirements-analysis",
            kind: "skill",
            label: "Requirements Analysis",
            intent: "capability_discovery_or_install",
            package: {
              packageId: "gstack"
            },
            leaf: {
              capabilityId: "gstack.office-hours",
              packageId: "gstack",
              subskillId: "office-hours",
              probe: {
                manifestNames: ["office-hours"],
                aliases: ["gstack-office-hours"]
              }
            },
            query: {
              jobFamilies: ["requirements_analysis"],
              targetTypes: ["problem_statement", "text"],
              artifacts: ["design_doc"],
              examples: ["帮我分析这个需求"]
            },
            implementation: {
              id: "gstack.office_hours",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            sourceMetadata: {
              skillName: "office-hours"
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code",
          capabilityQuery: {
            kind: "capability_request",
            goal: "analyze a product requirement and produce a design doc",
            host: "claude-code",
            requestText: "帮我做需求分析并产出设计文档",
            jobFamilies: ["requirements_analysis"],
            artifacts: ["design_doc"]
          }
        },
        {
          cacheFilePath: runtime.cacheFilePath,
          hostCatalogFilePath,
          mcpRegistryFilePath,
          packageSearchRoots: [searchRoot],
          now: new Date("2026-03-30T10:45:00.000Z")
        }
      );

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("NO_CANDIDATE");
      expect(result.acquisition).toMatchObject({
        reason: "package_not_installed",
        package: {
          packageId: "gstack",
          installState: "available"
        },
        leafCapability: {
          capabilityId: "gstack.office-hours"
        }
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("returns a structured unsupported outcome for a normal chat request", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "explain this design tradeoff",
          host: "claude-code"
        },
        {
          ...runtime,
          now: new Date("2026-03-27T08:00:00.000Z")
        }
      );

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("UNSUPPORTED_REQUEST");
      expect(result.outcome.hostAction).toBe("continue_normally");
      expect(result.outcome.message).toContain("Continue with the host's normal workflow");
      expect(result.trace).toMatchObject({
        host: "claude-code",
        resultCode: "UNSUPPORTED_REQUEST",
        missLayer: "broker_normalization",
        normalizedBy: "raw_request_fallback",
        requestSurface: "raw_envelope",
        candidateCount: 0,
        hostAction: "continue_normally"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("returns a structured ambiguous outcome for broker-like text without enough signal", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "save this page",
          host: "claude-code",
          urls: ["https://example.com/article"]
        },
        {
          ...runtime,
          now: new Date("2026-03-27T08:00:00.000Z")
        }
      );

      expect(result.ok).toBe(false);
      expect(result.outcome.code).toBe("AMBIGUOUS_REQUEST");
      expect(result.outcome.hostAction).toBe("ask_clarifying_question");
      expect(result.outcome.message).toContain("needs clarification");
      expect(result.trace).toMatchObject({
        host: "claude-code",
        resultCode: "AMBIGUOUS_REQUEST",
        missLayer: "broker_normalization",
        normalizedBy: "raw_request_fallback",
        requestSurface: "raw_envelope",
        candidateCount: 0,
        hostAction: "ask_clarifying_question"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("routes requirements-analysis capability queries to office-hours", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code",
          capabilityQuery: {
            kind: "capability_request",
            goal: "analyze a product requirement and produce a design doc",
            host: "claude-code",
            requestText: "帮我做需求分析并产出设计文档",
            jobFamilies: ["requirements_analysis"],
            artifacts: ["design_doc"]
          }
        },
        {
          ...runtime,
          now: new Date("2026-03-30T08:00:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("requirements-analysis");
      expect(result.handoff.chosenPackage.packageId).toBe("gstack");
      expect(result.trace).toMatchObject({
        host: "claude-code",
        resultCode: "HANDOFF_READY",
        missLayer: null,
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        winnerId: "requirements-analysis",
        winnerPackageId: "gstack"
      });
      expect(result.handoff.chosenLeafCapability.subskillId).toBe(
        "office-hours"
      );
      expect(result.handoff.chosenImplementation.id).toBe("gstack.office_hours");
      expect(result.handoff.request.capabilityQuery).toMatchObject({
        jobFamilies: ["requirements_analysis"]
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("routes raw requirements-analysis requests to office-hours", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code"
        },
        {
          ...runtime,
          now: new Date("2026-03-30T08:15:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("requirements-analysis");
      expect(result.handoff.chosenPackage.packageId).toBe("gstack");
      expect(result.trace).toMatchObject({
        host: "claude-code",
        resultCode: "HANDOFF_READY",
        missLayer: null,
        normalizedBy: "raw_request_fallback",
        requestSurface: "raw_envelope",
        winnerId: "requirements-analysis",
        winnerPackageId: "gstack"
      });
      expect(result.handoff.chosenLeafCapability.subskillId).toBe(
        "office-hours"
      );
      expect(result.handoff.chosenImplementation.id).toBe("gstack.office_hours");
      expect(result.handoff.request.capabilityQuery).toMatchObject({
        goal: "analyze a product requirement and produce a design doc",
        jobFamilies: ["requirements_analysis"],
        targets: [
          {
            type: "problem_statement",
            value: "帮我做需求分析并产出设计文档"
          }
        ],
        artifacts: ["design_doc", "analysis"]
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("routes qa capability queries to the qa downstream skill", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "QA 这个网站",
          host: "codex",
          capabilityQuery: {
            kind: "capability_request",
            goal: "qa a website",
            host: "codex",
            requestText: "QA 这个网站",
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
        {
          ...runtime,
          currentHost: "codex",
          now: new Date("2026-03-30T08:30:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("website-qa");
      expect(result.handoff.chosenPackage.packageId).toBe("gstack");
      expect(result.handoff.chosenLeafCapability.subskillId).toBe("qa");
      expect(result.handoff.chosenImplementation.id).toBe("gstack.qa");
      expect(result.handoff.request.capabilityQuery).toMatchObject({
        jobFamilies: ["quality_assurance"]
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("routes raw chinese website QA requests to the qa downstream skill", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "测下这个网站的质量",
          host: "codex",
          urls: ["http://116.63.15.60/#/login"]
        },
        {
          ...runtime,
          currentHost: "codex",
          now: new Date("2026-03-30T08:45:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("website-qa");
      expect(result.handoff.chosenPackage.packageId).toBe("gstack");
      expect(result.handoff.chosenLeafCapability.subskillId).toBe("qa");
      expect(result.handoff.chosenImplementation.id).toBe("gstack.qa");
      expect(result.handoff.request.capabilityQuery).toMatchObject({
        goal: "qa a website",
        jobFamilies: ["quality_assurance"],
        targets: [
          {
            type: "website",
            value: "http://116.63.15.60/#/login"
          }
        ],
        artifacts: ["qa_report"]
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("routes raw investigation requests to the investigation downstream skill", async () => {
    const runtime = await createRuntimePaths();

    try {
      const result = await runBroker(
        {
          requestText: "investigate this site failure with a reusable workflow",
          host: "codex",
          urls: ["https://example.com"]
        },
        {
          ...runtime,
          currentHost: "codex",
          now: new Date("2026-03-30T08:50:00.000Z")
        }
      );

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("investigation");
      expect(result.handoff.chosenPackage.packageId).toBe("gstack");
      expect(result.handoff.chosenLeafCapability.subskillId).toBe("investigate");
      expect(result.handoff.chosenImplementation.id).toBe("gstack.investigate");
      expect(result.trace).toMatchObject({
        host: "codex",
        resultCode: "HANDOFF_READY",
        missLayer: null,
        normalizedBy: "raw_request_fallback",
        requestSurface: "raw_envelope",
        winnerId: "investigation",
        winnerPackageId: "gstack"
      });
      expect(result.handoff.request.capabilityQuery).toMatchObject({
        goal: "investigate a site failure and identify root cause",
        jobFamilies: ["investigation"],
        targets: [
          {
            type: "website",
            value: "https://example.com"
          }
        ],
        artifacts: ["analysis", "recommendation"]
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("does not reuse a generic discovery cache entry for a different capability-query family", async () => {
    const runtime = await createRuntimePaths();

    try {
      const firstResult = await runBroker(
        {
          requestText: "find a skill to save webpages as markdown",
          host: "claude-code"
        },
        {
          ...runtime,
          now: new Date("2026-03-30T09:00:00.000Z")
        }
      );

      const secondResult = await runBroker(
        {
          requestText: "帮我做需求分析并产出设计文档",
          host: "claude-code"
        },
        {
          ...runtime,
          now: new Date("2026-03-30T09:30:00.000Z")
        }
      );

      expect(firstResult.ok).toBe(true);
      expect(firstResult.handoff.chosenImplementation.id).toBe(
        "skills_broker.capability_discovery"
      );
      expect(secondResult.ok).toBe(true);
      expect(secondResult.handoff.chosenImplementation.id).toBe(
        "gstack.office_hours"
      );
      expect(secondResult.debug.cacheHit).toBe(false);
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("resumes the same workflow run instead of re-routing a fresh winner", async () => {
    const runtime = await createRuntimePaths();

    try {
      const firstResult = await runBroker(
        {
          requestText: "我有一个想法：做一个自动串起评审和发版的工具",
          host: "claude-code"
        },
        {
          ...runtime,
          now: new Date("2026-03-31T08:00:00.000Z")
        }
      );

      expect(firstResult.ok).toBe(true);
      expect(firstResult.outcome.code).toBe("WORKFLOW_STAGE_READY");
      expect(firstResult.winner.id).toBe("idea-to-ship");
      expect(firstResult.workflow.activeStageId).toBe("office-hours");
      expect(firstResult.debug.cacheHit).toBe(false);

      const secondResult = await runBroker(
        {
          requestText: "继续这个 workflow",
          host: "claude-code",
          workflowResume: {
            runId: firstResult.workflow.runId,
            stageId: "office-hours",
            decision: "confirm",
            artifacts: ["design_doc", "analysis"]
          }
        },
        {
          ...runtime,
          now: new Date("2026-03-31T08:05:00.000Z")
        }
      );

      expect(secondResult.ok).toBe(true);
      expect(secondResult.outcome.code).toBe("WORKFLOW_STAGE_READY");
      expect(secondResult.workflow.runId).toBe(firstResult.workflow.runId);
      expect(secondResult.workflow.completedStageIds).toContain("office-hours");
      expect(secondResult.stage.id).toBe("plan-ceo-review");
      expect(secondResult.debug.decision).toBe("resume_existing_workflow");
      expect(secondResult.trace).toMatchObject({
        resultCode: "WORKFLOW_STAGE_READY",
        workflowId: "idea-to-ship",
        runId: firstResult.workflow.runId,
        stageId: "plan-ceo-review"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("rejects mixed capabilityQuery and workflowResume envelopes before resume routing", async () => {
    const runtime = await createRuntimePaths();

    try {
      await expect(
        runBroker(
          {
            requestText: "继续这个 workflow",
            host: "claude-code",
            capabilityQuery: {
              kind: "capability_request",
              goal: "continue a workflow",
              host: "claude-code",
              requestText: "继续这个 workflow"
            },
            workflowResume: {
              runId: "run-123",
              stageId: "office-hours",
              decision: "confirm"
            }
          },
          runtime
        )
      ).rejects.toThrow(
        /Expected broker envelope\.capabilityQuery and broker envelope\.workflowResume to be mutually exclusive\./
      );
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });
});
