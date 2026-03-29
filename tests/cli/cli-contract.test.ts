import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import {
  parseBrokerEnvelopeFromCommandLine,
  runBrokerCli
} from "../../src/cli";

test("cli accepts a raw envelope for the current webpage flow", async () => {
  const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-cli-"));
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  const rawEnvelopeJson = JSON.stringify({
    requestText: "turn this webpage into markdown: https://example.com/post",
    host: "claude-code",
    urls: ["https://example.com/post"],
    invocationMode: "explicit",
    cwd: "/Users/monkeyin/projects/skills-broker",
    attachments: ["/tmp/screenshot.png"],
    metadata: {
      command: "/skills-broker"
    }
  });

  try {
    await writeFile(
      hostCatalogPath,
      JSON.stringify({
        skills: [
          {
            id: "skill-web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown",
            intent: "web_content_to_markdown"
          }
        ]
      }),
      "utf8"
    );
    await writeFile(
      mcpRegistryPath,
      JSON.stringify({ servers: [] }),
      "utf8"
    );

    const parsedEnvelope = parseBrokerEnvelopeFromCommandLine(rawEnvelopeJson);

    expect(parsedEnvelope).toMatchObject({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"]
    });

    const result = await runBrokerCli(parsedEnvelope, {
      cacheFilePath: join(runtimeDirectory, "cache.json"),
      hostCatalogFilePath: hostCatalogPath,
      mcpRegistryFilePath: mcpRegistryPath
    });

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      handoff: {
        brokerDone: true
      }
    });
  } finally {
    writeSpy.mockRestore();
    await rm(runtimeDirectory, { recursive: true, force: true });
  }

  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0])).toMatchObject({
    ok: true,
    outcome: {
      code: "HANDOFF_READY"
    },
    handoff: {
      brokerDone: true
    }
  });
});

test("cli parser normalizes away unknown fields", () => {
  const parsedEnvelope = parseBrokerEnvelopeFromCommandLine(
    JSON.stringify({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"],
      extra: "ignored"
    })
  );

  expect(parsedEnvelope).not.toHaveProperty("extra");
  expect(parsedEnvelope).toMatchObject({
    requestText: "turn this webpage into markdown: https://example.com/post",
    host: "claude-code",
    urls: ["https://example.com/post"]
  });
});

test("cli rejects envelopes without urls[0]", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      metadata: {
        command: "/skills-broker"
      }
    })
  ).rejects.toThrow(
    /Temporary CLI compatibility only supports webpage markdown envelopes with urls\[0\]\./
  );
});

test("cli rejects envelopes with blank urls", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: ",
      host: "claude-code",
      urls: [""]
    })
  ).rejects.toThrow(
    /Expected broker envelope.urls to be an array of strings\./
  );
});

test("cli rejects envelopes with invalid field types", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: [123 as never]
    } as never)
  ).rejects.toThrow(
    /Expected broker envelope.urls to be an array of strings\./
  );
});

test("cli rejects sparse string arrays", async () => {
  const sparseUrls = new Array(1);

  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: sparseUrls as never
    } as never)
  ).rejects.toThrow(
    /Expected broker envelope.urls to be an array of strings\./
  );
});

test("cli rejects envelopes with more than one URL", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post", "https://example.com/other"]
    })
  ).rejects.toThrow(
    /Temporary CLI compatibility only supports webpage markdown envelopes with exactly one URL\./
  );
});

test("cli rejects envelope shapes outside the current webpage markdown scenario", async () => {
  await expect(
    runBrokerCli({
      requestText:
        "turn this webpage into markdown: https://example.com/post and summarize it",
      host: "claude-code",
      urls: ["https://example.com/post"],
      metadata: {
        command: "/skills-broker"
      }
    })
  ).rejects.toThrow(
    /Temporary CLI compatibility only supports requestText exactly matching "turn this webpage into markdown: https:\/\/example.com\/post"\./
  );
});

test("cli rejects invalid JSON input with a stable error", () => {
  expect(() => parseBrokerEnvelopeFromCommandLine("{not-json")).toThrow(
    /Invalid broker envelope JSON:/
  );
});

test("cli rejects parsed JSON values that are not objects", () => {
  expect(() => parseBrokerEnvelopeFromCommandLine("null")).toThrow(
    /Expected broker envelope to be a JSON object\./
  );
});

test("cli rejects invalid invocationMode values", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"],
      invocationMode: "sometimes" as never
    })
  ).rejects.toThrow(
    /Expected broker envelope.invocationMode to be auto or explicit\./
  );
});

test("cli rejects invalid cwd field types", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"],
      cwd: 123 as never
    } as never)
  ).rejects.toThrow(/Expected broker envelope.cwd to be a string\./);
});

test("cli rejects invalid attachment field types", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"],
      attachments: [123 as never]
    } as never)
  ).rejects.toThrow(
    /Expected broker envelope.attachments to be an array of strings\./
  );
});

test("cli rejects invalid metadata field types", async () => {
  await expect(
    runBrokerCli({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"],
      metadata: {
        command: 123 as never
      }
    } as never)
  ).rejects.toThrow(
    /Expected broker envelope.metadata to be a record of string values\./
  );
});

test("cli rejects empty requestText before host conflict handling", async () => {
  await expect(
    runBrokerCli(
      {
        requestText: "",
        host: "claude-code",
        urls: ["https://example.com/post"]
      },
      {
        currentHost: "codex"
      }
    )
  ).rejects.toThrow(
    /Expected broker envelope.requestText to be a non-empty string\./
  );
});

test("cli rejects invalid host values before host conflict handling", async () => {
  await expect(
    runBrokerCli(
      {
        requestText: "turn this webpage into markdown: https://example.com/post",
        host: "not-a-host" as never,
        urls: ["https://example.com/post"]
      },
      {
        currentHost: "codex"
      }
    )
  ).rejects.toThrow(
    /Expected broker envelope.host to be one of claude-code, codex, opencode\./
  );
});

test("cli rejects conflicting currentHost overrides", async () => {
  await expect(
    runBrokerCli(
      {
        requestText: "turn this webpage into markdown: https://example.com/post",
        host: "claude-code",
        urls: ["https://example.com/post"]
      },
      {
        currentHost: "codex"
      }
    )
  ).rejects.toThrow(
    /Broker host conflict: envelope host "claude-code" does not match currentHost "codex"\./
  );
});
