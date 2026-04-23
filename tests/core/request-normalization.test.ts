import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../../src/core/request";

const FREEFORM_IDEA_REQUEST =
  "如果在mac的摄像头遮挡处，弄一个codex或者claude code的进度提示，就像iPhone的胶囊岛一样的，这样就不用傻傻盯着cli了";

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

function expectQueryNativeRequest(
  normalized: ReturnType<typeof normalizeRequest>
): void {
  expect(normalized).not.toHaveProperty("intent");
  expect(normalized.outputMode).toBe("markdown_only");
}

describe("normalizeRequest", () => {
  it("normalizes webpage content requests to web_content_to_markdown", () => {
    const normalized = normalizeRequest({
      requestText: "turn this webpage into markdown: https://example.com/post",
      host: "claude-code",
      urls: ["https://example.com/post"]
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.url).toBe("https://example.com/post");
    expect(normalized.capabilityQuery).toMatchObject({
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
    });
  });

  it("normalizes social post requests to social_post_to_markdown", () => {
    const normalized = normalizeRequest({
      requestText: "save this X post as markdown: https://x.com/example/status/1",
      host: "claude-code",
      urls: ["https://x.com/example/status/1"]
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
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
    });
  });

  it("normalizes capability discovery requests to capability_discovery_or_install", () => {
    const normalized = normalizeRequest({
      requestText: "find a skill to save webpages as markdown",
      host: "codex"
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "discover or install a capability to convert web content to markdown",
      requestText: "find a skill to save webpages as markdown",
      jobFamilies: [
        "capability_acquisition",
        "content_acquisition",
        "web_content_conversion"
      ],
      targets: [
        {
          type: "problem_statement",
          value: "find a skill to save webpages as markdown"
        }
      ],
      artifacts: ["recommendation", "installation_plan", "markdown"]
    });
  });

  it("normalizes social url requests to social_post_to_markdown", () => {
    const normalized = normalizeRequest({
      requestText: "convert this page to markdown",
      host: "claude-code",
      urls: ["https://x.com/example/status/1"]
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "convert social post to markdown",
      requestText: "convert this page to markdown",
      jobFamilies: ["content_acquisition", "social_content_conversion"],
      targets: [
        {
          type: "url",
          value: "https://x.com/example/status/1"
        }
      ],
      artifacts: ["markdown"]
    });
  });

  it("rejects legacy webpage markdown tasks when no fallback host is provided", () => {
    expectRejected(
      {
        task: "turn this webpage into markdown",
        url: "https://example.com/article"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("maps legacy webpage markdown tasks into a synthesized capability query when a fallback host is available", () => {
    const normalized = normalizeRequest(
      {
        task: "turn this webpage into markdown",
        url: "https://example.com/article"
      },
      "codex"
    );

    expectQueryNativeRequest(normalized);
    expect(normalized.url).toBe("https://example.com/article");
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "convert web content to markdown",
      requestText: "turn this webpage into markdown",
      jobFamilies: ["content_acquisition", "web_content_conversion"],
      targets: [
        {
          type: "url",
          value: "https://example.com/article"
        }
      ],
      artifacts: ["markdown"]
    });
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

  it("rejects page-level inspection requests as ambiguous instead of misrouting them into website QA", () => {
    expectRejected(
      {
        requestText: "test this page",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "AMBIGUOUS_REQUEST"
    );

    expectRejected(
      {
        requestText: "检查这个页面有没有明显问题",
        host: "claude-code",
        urls: ["https://example.com/page"]
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

  it("rejects check this page as ambiguous instead of misrouting it to website QA", () => {
    expectRejected(
      {
        requestText: "check this page",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "AMBIGUOUS_REQUEST"
    );
  });

  it("rejects check this url as ambiguous instead of misrouting it to website QA", () => {
    expectRejected(
      {
        requestText: "check this url",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "AMBIGUOUS_REQUEST"
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

  it("rejects QA this page as unsupported when the request lacks a website target", () => {
    expectRejected(
      {
        requestText: "QA this page",
        host: "codex"
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects 看下这个页面 as unsupported instead of misrouting it to website QA", () => {
    expectRejected(
      {
        requestText: "看下这个页面",
        host: "codex",
        urls: ["https://example.com/page"]
      },
      "UNSUPPORTED_REQUEST"
    );
  });

  it("rejects QA 这个页面 as unsupported when the request lacks a website target", () => {
    expectRejected(
      {
        requestText: "QA 这个页面",
        host: "codex"
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

    expectQueryNativeRequest(normalized);
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

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
      jobFamilies: ["requirements_analysis"],
      artifacts: ["design_doc"]
    });
  });

  it("keeps explicit capability-acquisition queries in the discovery lane even when they also describe markdown conversion", () => {
    const normalized = normalizeRequest({
      requestText: "find a skill to save webpages as markdown",
      host: "codex",
      capabilityQuery: {
        kind: "capability_request",
        goal: "discover or install a capability to convert web content to markdown",
        host: "codex",
        requestText: "find a skill to save webpages as markdown",
        jobFamilies: [
          "capability_acquisition",
          "content_acquisition",
          "web_content_conversion"
        ],
        targets: [
          {
            type: "problem_statement",
            value: "find a skill to save webpages as markdown"
          }
        ],
        artifacts: ["recommendation", "installation_plan", "markdown"]
      }
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
      jobFamilies: [
        "capability_acquisition",
        "content_acquisition",
        "web_content_conversion"
      ],
      artifacts: ["recommendation", "installation_plan", "markdown"]
    });
  });

  it("normalizes raw website QA requests into a synthesized capability query", () => {
    const normalized = normalizeRequest({
      requestText: "测下这个网站的质量",
      host: "codex",
      urls: ["http://116.63.15.60/#/login"]
    });

    expectQueryNativeRequest(normalized);
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

  it("normalizes raw website QA install-help requests into the discovery lane", () => {
    const normalized = normalizeRequest({
      requestText: "有没有现成 skill 能做这个网站 QA",
      host: "codex"
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "discover or install a capability to qa a website",
      requestText: "有没有现成 skill 能做这个网站 QA",
      jobFamilies: ["capability_acquisition", "quality_assurance"],
      targets: [
        {
          type: "problem_statement",
          value: "有没有现成 skill 能做这个网站 QA"
        }
      ],
      artifacts: ["recommendation", "installation_plan", "qa_report"]
    });
  });

  it("normalizes raw requirements-analysis requests into a synthesized capability query", () => {
    const normalized = normalizeRequest({
      requestText: "帮我做需求分析并产出设计文档",
      host: "claude-code"
    });

    expectQueryNativeRequest(normalized);
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

    expectQueryNativeRequest(normalized);
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

    expectQueryNativeRequest(normalized);
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

    expectQueryNativeRequest(normalized);
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

  it("normalizes free-form idea requests into the workflow discovery lane", () => {
    const normalized = normalizeRequest({
      requestText: FREEFORM_IDEA_REQUEST,
      host: "codex"
    });

    expectQueryNativeRequest(normalized);
    expect(normalized.capabilityQuery).toMatchObject({
      goal: "turn a product idea into a reviewed execution plan",
      requestText: FREEFORM_IDEA_REQUEST,
      jobFamilies: [
        "idea_brainstorming",
        "requirements_analysis",
        "strategy_review",
        "engineering_review"
      ],
      targets: [
        {
          type: "problem_statement",
          value: FREEFORM_IDEA_REQUEST
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

  it("keeps ordinary explanation requests out of the idea workflow lane", () => {
    expectRejected(
      {
        requestText:
          "解释一下如果在mac的摄像头遮挡处弄一个codex进度提示要怎么写",
        host: "claude-code"
      },
      "UNSUPPORTED_REQUEST"
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

    expectQueryNativeRequest(normalized);
    expect(normalized.url).toBe("https://example.com/post");
  });
});
