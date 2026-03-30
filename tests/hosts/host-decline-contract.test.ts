import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runClaudeCodeAdapter } from "../../src/hosts/claude-code/adapter";
import { runCodexAdapter } from "../../src/hosts/codex/adapter";

type DeclineResult = {
  ok: false;
  outcome: {
    code:
      | "UNSUPPORTED_REQUEST"
      | "AMBIGUOUS_REQUEST"
      | "NO_CANDIDATE"
      | "PREPARE_FAILED";
    message: string;
    hostAction:
      | "continue_normally"
      | "ask_clarifying_question"
      | "offer_capability_discovery"
      | "show_graceful_failure";
  };
  error: {
    code:
      | "UNSUPPORTED_REQUEST"
      | "AMBIGUOUS_REQUEST"
      | "NO_CANDIDATE"
      | "PREPARE_FAILED";
    message: string;
  };
  debug: {
    cacheHit: boolean;
    candidateCount: number;
  };
};

async function writeExecutable(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  await chmod(path, 0o755);
}

async function createClaudeShell(
  installDirectory: string,
  result: DeclineResult
): Promise<void> {
  await mkdir(join(installDirectory, ".claude-plugin"), { recursive: true });
  await writeFile(
    join(installDirectory, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "skills-broker-claude-code", version: "0.1.3" }),
    "utf8"
  );
  await writeFile(join(installDirectory, "SKILL.md"), "# Skills Broker\n", "utf8");
  await writeExecutable(
    join(installDirectory, "bin", "run-broker"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s' '${JSON.stringify(result)}'
`
  );
}

async function createCodexShell(
  installDirectory: string,
  result: DeclineResult
): Promise<void> {
  await mkdir(installDirectory, { recursive: true });
  await writeFile(join(installDirectory, "SKILL.md"), "# Skills Broker\n", "utf8");
  await writeExecutable(
    join(installDirectory, "bin", "run-broker"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s' '${JSON.stringify(result)}'
`
  );
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("host adapters preserve structured broker declines", () => {
  const result: DeclineResult = {
    ok: false,
    outcome: {
      code: "PREPARE_FAILED",
      message:
        "The broker selected a candidate but could not prepare a handoff. Explain the failure clearly and do not silently bypass the broker.",
      hostAction: "show_graceful_failure"
    },
    error: {
      code: "PREPARE_FAILED",
      message: "Failed to prepare broker handoff."
    },
    debug: {
      cacheHit: false,
      candidateCount: 1
    }
  };

  it("keeps Claude Code decline output intact", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-decline-"));
    const installDirectory = join(runtimeDirectory, "claude-shell");

    try {
      await createClaudeShell(installDirectory, result);

      const adapterResult = await runClaudeCodeAdapter(
        {
          requestText: "turn this webpage into markdown: https://example.com/article",
          host: "claude-code",
          invocationMode: "auto",
          urls: ["https://example.com/article"]
        },
        {
          installDirectory
        }
      );

      expect(adapterResult).toEqual(result);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("keeps Codex decline output intact", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-decline-"));
    const installDirectory = join(runtimeDirectory, "codex-shell");

    try {
      await createCodexShell(installDirectory, result);

      const adapterResult = await runCodexAdapter(
        {
          requestText: "turn this webpage into markdown: https://example.com/article",
          host: "codex",
          invocationMode: "explicit",
          urls: ["https://example.com/article"]
        },
        {
          installDirectory
        }
      );

      expect(adapterResult).toEqual(result);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});

describe("runBroker decline contract", () => {
  it("returns PREPARE_FAILED instead of throwing when candidate preparation fails", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-prepare-fail-"));
    const hostCatalogFilePath = join(runtimeDirectory, "host-skills.seed.json");
    const mcpRegistryFilePath = join(runtimeDirectory, "mcp-registry.seed.json");

    await writeFile(
      hostCatalogFilePath,
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
      mcpRegistryFilePath,
      JSON.stringify({ servers: [] }),
      "utf8"
    );

    try {
      vi.doMock("../../src/broker/prepare", () => ({
        prepareCandidate: vi.fn(async () => {
          throw new Error("kaboom");
        })
      }));

      const { runBroker } = await import("../../src/broker/run");

      const result = await runBroker(
        {
          requestText: "turn this webpage into markdown: https://example.com/article",
          host: "claude-code",
          invocationMode: "auto",
          urls: ["https://example.com/article"]
        },
        {
          cacheFilePath: join(runtimeDirectory, "cache.json"),
          hostCatalogFilePath,
          mcpRegistryFilePath
        }
      );

      expect(result).toMatchObject({
        ok: false,
        outcome: {
          code: "PREPARE_FAILED",
          hostAction: "show_graceful_failure"
        },
        error: {
          code: "PREPARE_FAILED"
        }
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
