import { describe, expect, it } from "vitest";
import { parseBrokerEnvelope } from "../../src/core/envelope";

describe("parseBrokerEnvelope", () => {
  it("accepts an envelope carrying a matching capability query", () => {
    const envelope = parseBrokerEnvelope({
      requestText: "帮我做需求分析并产出设计文档",
      host: "claude-code",
      capabilityQuery: {
        kind: "capability_request",
        goal: "analyze a product requirement and produce a design doc",
        host: "claude-code",
        requestText: "帮我做需求分析并产出设计文档",
        artifacts: ["design_doc"]
      }
    });

    expect(envelope.capabilityQuery).toMatchObject({
      goal: "analyze a product requirement and produce a design doc",
      artifacts: ["design_doc"]
    });
  });

  it("rejects a capability query whose host does not match the envelope", () => {
    expect(() =>
      parseBrokerEnvelope({
        requestText: "QA 这个网站",
        host: "claude-code",
        capabilityQuery: {
          kind: "capability_request",
          goal: "qa a website",
          host: "codex",
          requestText: "QA 这个网站"
        }
      })
    ).toThrow(
      /Expected broker envelope\.capabilityQuery\.host to match broker envelope\.host\./
    );
  });

  it("rejects a capability query whose request text does not match the envelope", () => {
    expect(() =>
      parseBrokerEnvelope({
        requestText: "QA 这个网站",
        host: "claude-code",
        capabilityQuery: {
          kind: "capability_request",
          goal: "qa a website",
          host: "claude-code",
          requestText: "检查这个网站质量"
        }
      })
    ).toThrow(
      /Expected broker envelope\.capabilityQuery\.requestText to match broker envelope\.requestText\./
    );
  });

  it("accepts a workflow resume payload", () => {
    const envelope = parseBrokerEnvelope({
      requestText: "继续这个 workflow",
      host: "opencode",
      workflowResume: {
        runId: "run-123",
        stageId: "office-hours",
        decision: "confirm",
        artifacts: ["design_doc"]
      }
    });

    expect(envelope.workflowResume).toEqual({
      runId: "run-123",
      stageId: "office-hours",
      decision: "confirm",
      artifacts: ["design_doc"]
    });
  });

  it("accepts opencode as a canonical envelope host", () => {
    const envelope = parseBrokerEnvelope({
      requestText: "把这个页面转成 markdown https://example.com/article",
      host: "opencode",
      invocationMode: "explicit",
      urls: ["https://example.com/article"]
    });

    expect(envelope.host).toBe("opencode");
  });

  it("rejects non-canonical OpenCode aliases", () => {
    expect(() =>
      parseBrokerEnvelope({
        requestText: "把这个页面转成 markdown https://example.com/article",
        host: "open-code" as never,
        urls: ["https://example.com/article"]
      })
    ).toThrow(
      /Expected broker envelope\.host to be one of claude-code, codex, opencode\./
    );
  });

  it("accepts downstream execution failures for broker reranking", () => {
    const envelope = parseBrokerEnvelope({
      requestText: "把这个页面转成markdown https://example.com/article",
      host: "claude-code",
      executionFailures: [
        {
          candidateId: "web-content-to-markdown",
          packageId: "baoyu",
          leafCapabilityId: "baoyu.url-to-markdown",
          implementationId: "baoyu.url_to_markdown",
          reasonCode: "dependency_broken",
          evidence: "Cannot find module jsdom/xhr-sync-worker.js"
        }
      ]
    });

    expect(envelope.executionFailures).toEqual([
      {
        candidateId: "web-content-to-markdown",
        packageId: "baoyu",
        leafCapabilityId: "baoyu.url-to-markdown",
        implementationId: "baoyu.url_to_markdown",
        reasonCode: "dependency_broken",
        evidence: "Cannot find module jsdom/xhr-sync-worker.js"
      }
    ]);
  });

  it("rejects envelopes that carry both a capability query and workflow resume", () => {
    expect(() =>
      parseBrokerEnvelope({
        requestText: "继续这个 workflow",
        host: "codex",
        capabilityQuery: {
          kind: "capability_request",
          goal: "continue a broker workflow",
          host: "codex",
          requestText: "继续这个 workflow"
        },
        workflowResume: {
          runId: "run-123",
          stageId: "office-hours",
          decision: "confirm"
        }
      })
    ).toThrow(
      /Expected broker envelope\.capabilityQuery and broker envelope\.workflowResume to be mutually exclusive\./
    );
  });

  it("rejects a workflow resume payload with an unknown decision", () => {
    expect(() =>
      parseBrokerEnvelope({
        requestText: "继续这个 workflow",
        host: "codex",
        workflowResume: {
          runId: "run-123",
          stageId: "office-hours",
          decision: "skip"
        }
      })
    ).toThrow(
      /Expected broker envelope\.workflowResume\.decision to be one of confirm\./
    );
  });

  it("rejects downstream execution failures without any identifying fields", () => {
    expect(() =>
      parseBrokerEnvelope({
        requestText: "把这个页面转成markdown https://example.com/article",
        host: "codex",
        executionFailures: [
          {
            reasonCode: "skill_broken"
          }
        ]
      })
    ).toThrow(
      /Expected broker envelope\.executionFailures\[0\] to include at least one identifier field\./
    );
  });
});
