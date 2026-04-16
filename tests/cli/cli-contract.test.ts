import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import {
  parseBrokerCliCommandLineArgs,
  parseBrokerEnvelopeFromCommandLine,
  runBrokerCli
} from "../../src/cli";

function expectQueryNativeRequest(
  request: {
    outputMode: string;
    capabilityQuery: Record<string, unknown>;
  }
): void {
  expect(request).not.toHaveProperty("intent");
  expect(request.outputMode).toBe("markdown_only");
}

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
        brokerDone: true,
        chosenPackage: {
          packageId: "baoyu"
        },
        chosenLeafCapability: {
          subskillId: "url-to-markdown"
        },
        chosenImplementation: {
          id: "baoyu.url_to_markdown"
        }
      }
    });
    expect(result).not.toHaveProperty("trace");
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
      brokerDone: true,
      chosenPackage: {
        packageId: "baoyu"
      },
      chosenLeafCapability: {
        subskillId: "url-to-markdown"
      },
      chosenImplementation: {
        id: "baoyu.url_to_markdown"
      }
    }
  });
  expect(JSON.parse(writes[0])).not.toHaveProperty("trace");
});

test("cli includes routing trace only when includeTrace is enabled", async () => {
  const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-cli-trace-"));
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    await writeFile(
      hostCatalogPath,
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
    await writeFile(
      mcpRegistryPath,
      JSON.stringify({ servers: [] }),
      "utf8"
    );

    const result = await runBrokerCli(
      {
        requestText: "turn this webpage into markdown: https://example.com/post",
        host: "claude-code",
        invocationMode: "explicit",
        urls: ["https://example.com/post"]
      },
      {
        cacheFilePath: join(runtimeDirectory, "cache.json"),
        hostCatalogFilePath: hostCatalogPath,
        mcpRegistryFilePath: mcpRegistryPath,
        includeTrace: true
      }
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      trace: {
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        missLayer: null,
        normalizedBy: "raw_request_fallback",
        requestSurface: "raw_envelope"
      }
    });
  } finally {
    writeSpy.mockRestore();
    await rm(runtimeDirectory, { recursive: true, force: true });
  }

  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0])).toMatchObject({
    trace: {
      hostDecision: "broker_first",
      resultCode: "HANDOFF_READY",
      missLayer: null,
      normalizedBy: "raw_request_fallback",
      requestSurface: "raw_envelope"
    }
  });
});

test("cli command line parser recognizes --debug without breaking the legacy json-only form", () => {
  const rawEnvelopeJson = JSON.stringify({
    requestText: "turn this webpage into markdown: https://example.com/post",
    host: "claude-code",
    invocationMode: "explicit",
    urls: ["https://example.com/post"]
  });

  expect(parseBrokerCliCommandLineArgs([rawEnvelopeJson])).toEqual({
    rawInput: rawEnvelopeJson,
    includeTrace: false
  });

  expect(parseBrokerCliCommandLineArgs(["--debug", rawEnvelopeJson])).toEqual({
    rawInput: rawEnvelopeJson,
    includeTrace: true
  });
});

test("cli accepts a social-post envelope and returns HANDOFF_READY", async () => {
  const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-cli-social-"));
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    await writeFile(
      hostCatalogPath,
      JSON.stringify({
        skills: [
          {
            id: "social-post-to-markdown",
            kind: "skill",
            label: "Social Post to Markdown",
            intent: "social_post_to_markdown",
            implementation: {
              id: "baoyu.x_post_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
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

    const result = await runBrokerCli(
      {
        requestText: "save this X post as markdown: https://x.com/example/status/1",
        host: "claude-code",
        invocationMode: "explicit",
        urls: ["https://x.com/example/status/1"]
      },
      {
        cacheFilePath: join(runtimeDirectory, "cache.json"),
        hostCatalogFilePath: hostCatalogPath,
        mcpRegistryFilePath: mcpRegistryPath
      }
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      handoff: {
        chosenPackage: {
          packageId: "baoyu"
        },
        chosenLeafCapability: {
          subskillId: "x-post-to-markdown"
        },
        chosenImplementation: {
          id: "baoyu.x_post_to_markdown"
        },
        request: {}
      }
    });
    expectQueryNativeRequest(result.handoff.request);
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
      chosenPackage: {
        packageId: "baoyu"
      },
      chosenLeafCapability: {
        subskillId: "x-post-to-markdown"
      },
      chosenImplementation: {
        id: "baoyu.x_post_to_markdown"
      },
      request: {}
    }
  });
  expectQueryNativeRequest(JSON.parse(writes[0]).handoff.request);
});

test("cli accepts an explicit capability discovery envelope and returns HANDOFF_READY", async () => {
  const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-cli-discovery-"));
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    await writeFile(
      hostCatalogPath,
      JSON.stringify({
        skills: [
          {
            id: "capability-discovery",
            kind: "skill",
            label: "Capability Discovery",
            intent: "capability_discovery_or_install",
            implementation: {
              id: "skills_broker.capability_discovery",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
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

    const result = await runBrokerCli(
      {
        requestText: "find a skill to save webpages as markdown",
        host: "codex",
        invocationMode: "explicit"
      },
      {
        cacheFilePath: join(runtimeDirectory, "cache.json"),
        hostCatalogFilePath: hostCatalogPath,
        mcpRegistryFilePath: mcpRegistryPath
      }
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      handoff: {
        chosenPackage: {
          packageId: "skills_broker"
        },
        chosenLeafCapability: {
          subskillId: "capability-discovery"
        },
        chosenImplementation: {
          id: "skills_broker.capability_discovery"
        },
        request: {}
      }
    });
    expectQueryNativeRequest(result.handoff.request);
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
      chosenPackage: {
        packageId: "skills_broker"
      },
      chosenLeafCapability: {
        subskillId: "capability-discovery"
      },
      chosenImplementation: {
        id: "skills_broker.capability_discovery"
      },
      request: {}
    }
  });
  expectQueryNativeRequest(JSON.parse(writes[0]).handoff.request);
});

test("cli accepts a structured capability query and routes it through discovery", async () => {
  const runtimeDirectory = await mkdtemp(
    join(tmpdir(), "skills-broker-cli-query-")
  );
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    await writeFile(
      hostCatalogPath,
      JSON.stringify({
        skills: [
          {
            id: "requirements-analysis",
            kind: "skill",
            label: "Requirements Analysis",
            intent: "capability_discovery_or_install",
            query: {
              jobFamilies: ["requirements_analysis"],
              targetTypes: ["problem_statement", "text"],
              artifacts: ["design_doc", "analysis"],
              examples: ["帮我做需求分析并产出设计文档"]
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
    await writeFile(
      mcpRegistryPath,
      JSON.stringify({ servers: [] }),
      "utf8"
    );

    const result = await runBrokerCli(
      {
        requestText: "帮我做需求分析并产出设计文档",
        host: "claude-code",
        invocationMode: "explicit",
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
        cacheFilePath: join(runtimeDirectory, "cache.json"),
        hostCatalogFilePath: hostCatalogPath,
        mcpRegistryFilePath: mcpRegistryPath
      }
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      handoff: {
        chosenPackage: {
          packageId: "gstack"
        },
        chosenLeafCapability: {
          subskillId: "office-hours"
        },
        chosenImplementation: {
          id: "gstack.office_hours"
        },
        request: {
          capabilityQuery: {
            jobFamilies: ["requirements_analysis"]
          }
        }
      }
    });
    expectQueryNativeRequest(result.handoff.request);
  } finally {
    writeSpy.mockRestore();
    await rm(runtimeDirectory, { recursive: true, force: true });
  }

  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0])).toMatchObject({
    ok: true,
    handoff: {
      chosenPackage: {
        packageId: "gstack"
      },
      chosenLeafCapability: {
        subskillId: "office-hours"
      },
      chosenImplementation: {
        id: "gstack.office_hours"
      }
    }
  });
});

test("cli routes raw requirements-analysis requests through discovery", async () => {
  const runtimeDirectory = await mkdtemp(
    join(tmpdir(), "skills-broker-cli-raw-requirements-")
  );
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    await writeFile(
      hostCatalogPath,
      JSON.stringify({
        skills: [
          {
            id: "requirements-analysis",
            kind: "skill",
            label: "Requirements Analysis",
            intent: "capability_discovery_or_install",
            query: {
              jobFamilies: ["requirements_analysis"],
              targetTypes: ["problem_statement", "text"],
              artifacts: ["design_doc", "analysis"],
              examples: ["帮我做需求分析并产出设计文档"]
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
    await writeFile(
      mcpRegistryPath,
      JSON.stringify({ servers: [] }),
      "utf8"
    );

    const result = await runBrokerCli(
      {
        requestText: "帮我做需求分析并产出设计文档",
        host: "claude-code",
        invocationMode: "explicit"
      },
      {
        cacheFilePath: join(runtimeDirectory, "cache.json"),
        hostCatalogFilePath: hostCatalogPath,
        mcpRegistryFilePath: mcpRegistryPath
      }
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      handoff: {
        chosenPackage: {
          packageId: "gstack"
        },
        chosenLeafCapability: {
          subskillId: "office-hours"
        },
        chosenImplementation: {
          id: "gstack.office_hours"
        },
        request: {
          capabilityQuery: {
            jobFamilies: ["requirements_analysis"],
            targets: [
              {
                type: "problem_statement",
                value: "帮我做需求分析并产出设计文档"
              }
            ],
            artifacts: ["design_doc", "analysis"]
          }
        }
      }
    });
    expectQueryNativeRequest(result.handoff.request);
  } finally {
    writeSpy.mockRestore();
    await rm(runtimeDirectory, { recursive: true, force: true });
  }

  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0])).toMatchObject({
    ok: true,
    handoff: {
      chosenPackage: {
        packageId: "gstack"
      },
      chosenLeafCapability: {
        subskillId: "office-hours"
      },
      chosenImplementation: {
        id: "gstack.office_hours"
      }
    }
  });
});

test("cli routes raw investigation requests through discovery", async () => {
  const runtimeDirectory = await mkdtemp(
    join(tmpdir(), "skills-broker-cli-raw-investigation-")
  );
  const hostCatalogPath = join(runtimeDirectory, "host-skills.seed.json");
  const mcpRegistryPath = join(runtimeDirectory, "mcp-registry.seed.json");
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    await writeFile(
      hostCatalogPath,
      JSON.stringify({
        skills: [
          {
            id: "investigation",
            kind: "skill",
            label: "Investigation",
            intent: "capability_discovery_or_install",
            query: {
              jobFamilies: ["investigation"],
              targetTypes: ["website", "url", "codebase", "problem_statement", "text"],
              artifacts: ["analysis", "recommendation"],
              examples: ["investigate this site failure with a reusable workflow"]
            },
            implementation: {
              id: "gstack.investigate",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            }
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

    const result = await runBrokerCli(
      {
        requestText: "investigate this site failure with a reusable workflow",
        host: "codex",
        invocationMode: "explicit",
        urls: ["https://example.com"]
      },
      {
        cacheFilePath: join(runtimeDirectory, "cache.json"),
        hostCatalogFilePath: hostCatalogPath,
        mcpRegistryFilePath: mcpRegistryPath
      }
    );

    expect(result).toMatchObject({
      ok: true,
      outcome: {
        code: "HANDOFF_READY"
      },
      handoff: {
        chosenPackage: {
          packageId: "gstack"
        },
        chosenLeafCapability: {
          subskillId: "investigate"
        },
        chosenImplementation: {
          id: "gstack.investigate"
        },
        request: {
          capabilityQuery: {
            jobFamilies: ["investigation"],
            targets: [
              {
                type: "website",
                value: "https://example.com"
              }
            ],
            artifacts: ["analysis", "recommendation"]
          }
        }
      }
    });
    expectQueryNativeRequest(result.handoff.request);
  } finally {
    writeSpy.mockRestore();
    await rm(runtimeDirectory, { recursive: true, force: true });
  }

  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0])).toMatchObject({
    ok: true,
    handoff: {
      chosenPackage: {
        packageId: "gstack"
      },
      chosenLeafCapability: {
        subskillId: "investigate"
      },
      chosenImplementation: {
        id: "gstack.investigate"
      }
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

test("cli returns a structured unsupported outcome instead of throwing for normal chat requests", async () => {
  const writes: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string) => {
      writes.push(String(chunk));
      return true;
    }
  );

  try {
    const result = await runBrokerCli({
      requestText: "explain this design tradeoff",
      host: "claude-code",
      invocationMode: "auto"
    });

    expect(result).toMatchObject({
      ok: false,
      outcome: {
        code: "UNSUPPORTED_REQUEST",
        hostAction: "continue_normally"
      }
    });
  } finally {
    writeSpy.mockRestore();
  }

  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0])).toMatchObject({
    ok: false,
    outcome: {
      code: "UNSUPPORTED_REQUEST",
      hostAction: "continue_normally"
    }
  });
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
    /Expected broker envelope.host to be one of claude-code, codex\./
  );
});

test("cli rejects invalid currentHost overrides before host conflict handling", async () => {
  await expect(
    runBrokerCli(
      {
        requestText: "turn this webpage into markdown: https://example.com/post",
        host: "claude-code",
        urls: ["https://example.com/post"]
      },
      {
        currentHost: "opencode" as never
      }
    )
  ).rejects.toThrow(
    /Expected broker currentHost to be one of claude-code, codex\./
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
