import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
      expect(result.winner.id).toBe("skill-webpage-to-markdown");
      expect(result.handoff.brokerDone).toBe(true);
      expect(result.handoff.candidate.id).toBe(result.winner.id);
      expect(result.handoff.request).toEqual({
        intent: "webpage_to_markdown",
        outputMode: "markdown_only",
        url: validUrlRequest.url
      });
      expect(result.debug.cacheHit).toBe(false);
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
      expect(result.error.message).toContain("No candidate");
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
            id: "skill-webpage-to-markdown",
            kind: "skill",
            label: "Webpage to Markdown",
            intent: "webpage_to_markdown"
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
      expect(result.winner.id).toBe("skill-webpage-to-markdown");
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
        now: new Date("2026-03-27T08:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.winner.id).toBe("io.example/url-to-markdown");
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });
});
