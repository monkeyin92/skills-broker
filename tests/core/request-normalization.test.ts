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
});
