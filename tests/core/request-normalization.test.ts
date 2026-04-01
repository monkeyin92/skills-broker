import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../../src/core/request";

function expectRejected(
  input: Parameters<typeof normalizeRequest>[0],
  code: string
): void {
  try {
    normalizeRequest(input);
    throw new Error("Expected normalizeRequest to reject the request.");
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe("normalizeRequest", () => {
  it("normalizes webpage content requests to web_content_to_markdown", () => {
    const normalized = normalizeRequest({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"]
    });

    expect(normalized.intent).toBe("web_content_to_markdown");
    expect(normalized.outputMode).toBe("markdown_only");
    expect(normalized.url).toBe("https://example.com/post");
  });

  it("normalizes social post requests to social_post_to_markdown", () => {
    const normalized = normalizeRequest({
      requestText: "save this X post as markdown: https://x.com/example/status/1",
      host: "claude-code",
      urls: ["https://x.com/example/status/1"]
    });

    expect(normalized.intent).toBe("social_post_to_markdown");
    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("normalizes capability discovery requests to capability_discovery_or_install", () => {
    const normalized = normalizeRequest({
      requestText: "find a skill to save webpages as markdown",
      host: "codex"
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("normalizes social url requests to social_post_to_markdown", () => {
    const normalized = normalizeRequest({
      requestText: "convert this page to markdown",
      host: "claude-code",
      urls: ["https://x.com/example/status/1"]
    });

    expect(normalized.intent).toBe("social_post_to_markdown");
    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("maps legacy webpage markdown tasks to web_content_to_markdown", () => {
    const normalized = normalizeRequest({
      task: "turn this webpage into markdown",
      url: "https://example.com/article"
    });

    expect(normalized.intent).toBe("web_content_to_markdown");
    expect(normalized.outputMode).toBe("markdown_only");
    expect(normalized.url).toBe("https://example.com/article");
  });

  it("rejects ordinary model-native requests as unsupported", () => {
    expectRejected(
      {
        requestText: "summarize this idea",
        host: "claude-code"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects summarize this X post as unsupported", () => {
    expectRejected(
      {
        requestText: "summarize this X post",
        host: "claude-code"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects summarize this X post with a social url as unsupported", () => {
    expectRejected(
      {
        requestText: "summarize this X post",
        host: "claude-code",
        urls: ["https://x.com/example/status/1"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects explain this tweet thread as unsupported", () => {
    expectRejected(
      {
        requestText: "explain this tweet thread",
        host: "codex"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects broker-like requests without enough signal as ambiguous", () => {
    expectRejected(
      {
        requestText: "save this link",
        host: "codex"
      },
      "AMBIGUOUS_REQUEST"
    );
  });

  it("rejects save this page as ambiguous when markdown is not explicit", () => {
    expectRejected(
      {
        requestText: "save this page",
        host: "claude-code",
        urls: ["https://example.com/page"]
      },
      "AMBIGUOUS_REQUEST"
    );
  });

  it("rejects save this URL as ambiguous when markdown is not explicit", () => {
    expectRejected(
      {
        requestText: "save this URL",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "AMBIGUOUS_REQUEST"
    );
  });

  it("rejects bare install requests as unsupported", () => {
    expectRejected(
      {
        requestText: "install this package",
        host: "claude-code"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects non-markdown page conversions as unsupported", () => {
    expectRejected(
      {
        requestText: "convert this page to pdf",
        host: "claude-code",
        urls: ["https://example.com/page"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects non-markdown social conversions as unsupported", () => {
    expectRejected(
      {
        requestText: "convert this tweet to plain text",
        host: "claude-code",
        urls: ["https://x.com/example/status/1"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects bare meeting note markdown conversion requests as unsupported", () => {
    expectRejected(
      {
        requestText: "convert this meeting note to markdown",
        host: "claude-code"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects check this page as unsupported instead of misrouting it to website QA", () => {
    expectRejected(
      {
        requestText: "check this page",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects check this url as unsupported instead of misrouting it to website QA", () => {
    expectRejected(
      {
        requestText: "check this url",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects check this website as unsupported instead of misrouting it to website QA", () => {
    expectRejected(
      {
        requestText: "check this website",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it('accepts an auto-invoked envelope with invocationMode: "auto"', () => {
    const normalized = normalizeRequest({
      requestText: "convert this page to markdown",
      host: "claude-code",
      invocationMode: "auto",
      urls: ["https://x.com/example/status/1"]
    });

    expect(normalized.intent).toBe("social_post_to_markdown");
    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("normalizes a structured capability query for requirements analysis into the discovery lane", () => {
    const normalized = normalizeRequest({
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
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.capabilityQuery).toMatchObject({
      jobFamilies: ["requirements_analysis"],
      artifacts: ["design_doc"]
    });
  });

  it("normalizes raw website QA requests into a synthesized capability query", () => {
    const normalized = normalizeRequest({
      requestText: "测下这个网站的质量",
      host: "codex",
      urls: ["http://116.63.15.60/#/login"]
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "qa a website",
      requestText: "测下这个网站的质量",
      jobFamilies: ["quality_assurance"],
      targets: [
        {
          type: "website",
          value: "http://116.63.15.60/#/login"
        }
      ],
      artifacts: ["qa_report"]
    });
  });

  it("normalizes raw requirements-analysis requests into a synthesized capability query", () => {
    const normalized = normalizeRequest({
      requestText: "帮我做需求分析并产出设计文档",
      host: "claude-code"
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.capabilityQuery).toMatchObject({
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
    });
  });

  it("normalizes raw requirement-gap review requests into a synthesized analysis query", () => {
    const normalized = normalizeRequest({
      requestText: "帮我看看这个需求有没有漏洞",
      host: "codex"
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "analyze a product requirement and identify gaps",
      requestText: "帮我看看这个需求有没有漏洞",
      jobFamilies: ["requirements_analysis"],
      targets: [
        {
          type: "problem_statement",
          value: "帮我看看这个需求有没有漏洞"
        }
      ],
      artifacts: ["analysis"]
    });
  });

  it("normalizes raw investigation requests into a synthesized capability query", () => {
    const normalized = normalizeRequest({
      requestText: "investigate this site failure with a reusable workflow",
      host: "codex",
      urls: ["https://example.com"]
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.capabilityQuery).toMatchObject({
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
    });
  });

  it("normalizes raw idea requests into the workflow discovery lane", () => {
    const normalized = normalizeRequest({
      requestText: "我有一个想法：做一个自动串起评审和发版的工具",
      host: "claude-code"
    });

    expect(normalized.intent).toBe("capability_discovery_or_install");
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "turn a product idea into a reviewed execution plan",
      requestText: "我有一个想法：做一个自动串起评审和发版的工具",
      jobFamilies: [
        "idea_brainstorming",
        "requirements_analysis",
        "strategy_review",
        "engineering_review"
      ],
      targets: [
        {
          type: "problem_statement",
          value: "我有一个想法：做一个自动串起评审和发版的工具"
        }
      ],
      artifacts: ["design_doc", "analysis", "execution_plan"]
    });
  });

  it("asks to clarify weak idea phrasing instead of silently misrouting it", () => {
    expectRejected(
      {
        requestText: "我有个想法",
        host: "codex"
      },
      "AMBIGUOUS_REQUEST"
    );
  });

  it("normalizes a structured capability query for webpage markdown into the web lane", () => {
    const normalized = normalizeRequest({
      requestText: "将这个页面转为markdown文件：https://example.com/post",
      host: "claude-code",
      capabilityQuery: {
        kind: "capability_request",
        goal: "convert web content to markdown",
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
      }
    });

    expect(normalized.intent).toBe("web_content_to_markdown");
    expect(normalized.url).toBe("https://example.com/post");
  });
});
