import { describe, expect, it } from "vitest";
import { parseCapabilityQuery } from "../../src/core/capability-query";

describe("parseCapabilityQuery", () => {
  it("accepts a structured capability request query", () => {
    const query = parseCapabilityQuery({
      kind: "capability_request",
      goal: "analyze a product requirement and produce a design doc",
      host: "claude-code",
      requestText: "帮我做需求分析并产出设计文档",
      jobFamilies: ["requirements_analysis"],
      targets: [
        {
          type: "problem_statement",
          value: "multi-host skills broker routing"
        }
      ],
      artifacts: ["design_doc"],
      constraints: ["needs_structured_output"],
      preferredCapability: null,
      metadata: {
        source: "/skills-broker"
      }
    });

    expect(query).toMatchObject({
      kind: "capability_request",
      goal: "analyze a product requirement and produce a design doc",
      host: "claude-code",
      jobFamilies: ["requirements_analysis"],
      artifacts: ["design_doc"],
      constraints: ["needs_structured_output"],
      preferredCapability: null
    });
  });

  it("rejects unknown target types", () => {
    expect(() =>
      parseCapabilityQuery({
        kind: "capability_request",
        goal: "qa a website",
        host: "codex",
        requestText: "QA 这个网站",
        targets: [
          {
            type: "browser_tab",
            value: "https://example.com"
          }
        ]
      })
    ).toThrow(
      /Expected capability query target\.type to be one of/
    );
  });

  it("rejects blank artifact strings", () => {
    expect(() =>
      parseCapabilityQuery({
        kind: "capability_request",
        goal: "qa a website",
        host: "codex",
        requestText: "QA 这个网站",
        artifacts: [""]
      })
    ).toThrow(
      /Expected capability query\.artifacts to be an array of strings\./
    );
  });

  it("rejects blank job-family strings", () => {
    expect(() =>
      parseCapabilityQuery({
        kind: "capability_request",
        goal: "qa a website",
        host: "codex",
        requestText: "QA 这个网站",
        jobFamilies: [""]
      })
    ).toThrow(
      /Expected capability query\.jobFamilies to be an array of strings\./
    );
  });
});
