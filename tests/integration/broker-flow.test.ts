import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runBroker } from "../../src/broker/run";

const validUrlRequest = {
  task: "turn this webpage into markdown",
  url: "https://example.com/article"
};

async function createRuntimePaths() {
  const directory = await mkdtemp(join(tmpdir(), "skills-broker-integration-"));

  return {
    directory,
    cacheFilePath: join(directory, "broker-cache.json")
  };
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
      expect(result.handoff.brokerDone).toBe(true);
      expect(result.handoff.candidate.id).toBe(result.winner.id);
      expect(result.handoff.request).toEqual({
        intent: "web_content_to_markdown",
        outputMode: "markdown_only",
        url: validUrlRequest.url
      });
      expect(result.debug.cacheHit).toBe(false);
      expect(result.trace).toMatchObject({
        host: "claude-code",
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        missLayer: null,
        normalizedBy: "legacy_intent",
        requestSurface: "legacy_task",
        candidateCount: result.debug.candidateCount,
        winnerId: "web-content-to-markdown",
        winnerPackageId: "baoyu"
      });
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("uses cache-first routing for a repeat request", async () => {
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
      expect(secondResult.debug.cacheHit).toBe(true);
      expect(secondResult.debug.cachedCandidateId).toBe(firstResult.winner.id);
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
        currentHost: "open-code",
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
});
