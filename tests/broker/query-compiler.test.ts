import { describe, expect, it } from "vitest";
import {
  compileCapabilityQueryRequest,
  compileEnvelopeRequest
} from "../../src/broker/query-compiler";

function expectQueryNativeRequest(
  normalized: ReturnType<typeof compileCapabilityQueryRequest>
): void {
  expect(normalized).not.toHaveProperty("intent");
  expect(normalized.outputMode).toBe("markdown_only");
}

describe("broker query compiler contract", () => {
  it("compiles supported raw envelope requests into capability queries", () => {
    const web = compileEnvelopeRequest({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"]
    });

    expect(web).toMatchObject({
      kind: "compiled",
      capabilityQuery: {
        goal: "convert web content to markdown",
        requestText: "turn this webpage into markdown: https://example.com/post",
        jobFamilies: ["content_acquisition", "web_content_conversion"],
        targets: [
          {
            type: "url",
            value: "https://example.com/post"
          }
        ],
        artifacts: ["markdown"]
      }
    });

    const social = compileEnvelopeRequest({
      requestText: "save this X post as markdown: https://x.com/example/status/1",
      host: "codex",
      urls: ["https://x.com/example/status/1"]
    });

    expect(social).toMatchObject({
      kind: "compiled",
      capabilityQuery: {
        goal: "convert social post to markdown",
        requestText: "save this X post as markdown: https://x.com/example/status/1",
        jobFamilies: ["content_acquisition", "social_content_conversion"],
        targets: [
          {
            type: "url",
            value: "https://x.com/example/status/1"
          }
        ],
        artifacts: ["markdown"]
      }
    });
  });

  it("compiles supported maintained-family raw requests into discovery-lane queries", () => {
    const requirements = compileEnvelopeRequest({
      requestText: "帮我做需求分析并产出设计文档",
      host: "claude-code"
    });

    expect(requirements).toMatchObject({
      kind: "compiled",
      capabilityQuery: {
        goal: "analyze a product requirement and produce a design doc",
        requestText: "帮我做需求分析并产出设计文档",
        jobFamilies: ["requirements_analysis"],
        targets: [
          {
            type: "problem_statement",
            value: "帮我做需求分析并产出设计文档"
          }
        ],
        artifacts: ["design_doc", "analysis"]
      }
    });

    const investigation = compileEnvelopeRequest({
      requestText: "investigate this site failure with a reusable workflow",
      host: "codex",
      urls: ["https://example.com"]
    });

    expect(investigation).toMatchObject({
      kind: "compiled",
      capabilityQuery: {
        goal: "investigate a site failure and identify root cause",
        requestText: "investigate this site failure with a reusable workflow",
        jobFamilies: ["investigation"],
        targets: [
          {
            type: "website",
            value: "https://example.com"
          }
        ],
        artifacts: ["analysis", "recommendation"]
      }
    });
  });

  it("marks unsupported raw envelope requests as unsupported", () => {
    expect(
      compileEnvelopeRequest({
        requestText: "convert this page to pdf",
        host: "claude-code",
        urls: ["https://example.com/page"]
      })
    ).toEqual({ kind: "unsupported" });

    expect(
      compileEnvelopeRequest({
        requestText: "summarize this X post",
        host: "codex",
        urls: ["https://x.com/example/status/1"]
      })
    ).toEqual({ kind: "unsupported" });
  });

  it("marks ambiguous raw envelope requests as ambiguous", () => {
    expect(
      compileEnvelopeRequest({
        requestText: "save this link",
        host: "codex"
      })
    ).toEqual({ kind: "ambiguous" });

    expect(
      compileEnvelopeRequest({
        requestText: "我有个想法",
        host: "claude-code"
      })
    ).toEqual({ kind: "ambiguous" });
  });

  it("keeps capability queries compatible with the broker request model", () => {
    const web = compileCapabilityQueryRequest({
      goal: "convert web content to markdown",
      kind: "capability_request",
      host: "claude-code",
      requestText: "将这个页面转为markdown文件：https://example.com/post",
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      targets: [
        {
          type: "url",
          value: "https://example.com/post"
        }
      ],
      artifacts: ["markdown"]
    });

    expectQueryNativeRequest(web);
    expect(web.url).toBe("https://example.com/post");

    const social = compileCapabilityQueryRequest({
      kind: "capability_request",
      goal: "convert social post to markdown",
      host: "codex",
      requestText: "将这个推文转为markdown文件：https://x.com/example/status/1",
      jobFamilies: ["content_acquisition", "social_content_conversion"],
      targets: [
        {
          type: "url",
          value: "https://x.com/example/status/1"
        }
      ],
      artifacts: ["markdown"]
    });

    expectQueryNativeRequest(social);
    expect(social.capabilityQuery).toMatchObject({
      jobFamilies: ["content_acquisition", "social_content_conversion"],
      artifacts: ["markdown"]
    });

    const discovery = compileCapabilityQueryRequest({
      kind: "capability_request",
      goal: "analyze a product requirement and produce a design doc",
      host: "claude-code",
      requestText: "帮我做需求分析并产出设计文档",
      jobFamilies: ["requirements_analysis"],
      artifacts: ["design_doc"]
    });

    expectQueryNativeRequest(discovery);
    expect(discovery.capabilityQuery).toMatchObject({
      jobFamilies: ["requirements_analysis"],
      artifacts: ["design_doc"]
    });
  });
});
