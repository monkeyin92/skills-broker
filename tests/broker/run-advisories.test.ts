import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const validUrlRequest = {
  task: "turn this webpage into markdown",
  url: "https://example.com/article"
};

async function createRuntimePaths() {
  const directory = await mkdtemp(join(tmpdir(), "skills-broker-advisories-"));

  return {
    directory,
    brokerHomeDirectory: join(directory, ".skills-broker"),
    cacheFilePath: join(directory, "broker-cache.json")
  };
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("runBroker advisories", () => {
  it("surfaces a routing trace write failure as a degraded advisory without changing HANDOFF_READY", async () => {
    const runtime = await createRuntimePaths();

    try {
      vi.doMock("../../src/broker/trace-store", async (importOriginal) => {
        const actual =
          await importOriginal<typeof import("../../src/broker/trace-store")>();

        return {
          ...actual,
          appendBrokerRoutingTrace: vi.fn(async () => {
            throw new Error("trace store unavailable");
          })
        };
      });

      const { runBroker } = await import("../../src/broker/run");

      const result = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-04-22T12:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.advisories).toEqual([
        expect.objectContaining({
          code: "routing_trace_write_failed",
          detail: "trace store unavailable"
        })
      ]);
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("surfaces acquisition-memory and verified-downstream manifest write failures as degraded advisories", async () => {
    const runtime = await createRuntimePaths();

    try {
      vi.doMock("../../src/broker/acquisition-memory", async (importOriginal) => {
        const actual =
          await importOriginal<typeof import("../../src/broker/acquisition-memory")>();

        return {
          ...actual,
          AcquisitionMemoryStore: class extends actual.AcquisitionMemoryStore {
            async recordVerifiedWinner(): Promise<void> {
              throw new Error("acquisition memory offline");
            }
          }
        };
      });
      vi.doMock(
        "../../src/broker/downstream-manifest-source",
        async (importOriginal) => {
          const actual =
            await importOriginal<
              typeof import("../../src/broker/downstream-manifest-source")
            >();

          return {
            ...actual,
            writeVerifiedDownstreamManifest: vi.fn(async () => {
              throw new Error("manifest write denied");
            })
          };
        }
      );

      const { runBroker } = await import("../../src/broker/run");

      const result = await runBroker(validUrlRequest, {
        ...runtime,
        now: new Date("2026-04-22T12:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      expect(result.outcome.code).toBe("HANDOFF_READY");
      expect(result.advisories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "acquisition_memory_write_failed",
            detail: "acquisition memory offline"
          }),
          expect.objectContaining({
            code: "verified_downstream_manifest_write_failed",
            detail: "manifest write denied"
          })
        ])
      );
    } finally {
      await rm(runtime.directory, { recursive: true, force: true });
    }
  });

  it("keeps degraded advisories in CLI output even when trace output is omitted", async () => {
    vi.doMock("../../src/broker/run", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../src/broker/run")>();

      return {
        ...actual,
        runBroker: vi.fn(async () => ({
          ok: true,
          winner: {
            id: "web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown"
          },
          outcome: {
            code: "HANDOFF_READY",
            message: "Winner web-content-to-markdown is ready for handoff."
          },
          handoff: {
            brokerDone: true
          },
          advisories: [
            {
              code: "routing_trace_write_failed",
              message:
                "Routing succeeded, but the routing trace could not be persisted."
            }
          ],
          debug: {
            cacheHit: false,
            candidateCount: 1
          },
          trace: {
            host: "claude-code"
          }
        }) as any)
      };
    });

    const { runBrokerCli } = await import("../../src/cli");

    const result = await runBrokerCli(
      {
        requestText: "turn this webpage into markdown: https://example.com/article",
        host: "claude-code",
        invocationMode: "auto",
        urls: ["https://example.com/article"]
      },
      {
        includeTrace: false
      }
    );

    expect(result).toMatchObject({
      advisories: [
        {
          code: "routing_trace_write_failed"
        }
      ]
    });
    expect(result).not.toHaveProperty("trace");
  });
});
