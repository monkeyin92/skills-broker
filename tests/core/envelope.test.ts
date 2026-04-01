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
      host: "codex",
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
});
