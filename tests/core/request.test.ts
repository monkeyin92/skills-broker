import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../../src/core/request";

function expectQueryNativeRequest(
  normalized: ReturnType<typeof normalizeRequest>
): void {
  expect(normalized).not.toHaveProperty("intent");
}

describe("normalizeRequest", () => {
  it("normalizes webpage markdown requests into the query-native broker contract", () => {
    const normalized = normalizeRequest(
      {
        task: "turn this webpage into markdown",
        url: "https://example.com"
      },
      "claude-code"
    );

    expectQueryNativeRequest(normalized);
  });

  it("normalizes webpage markdown requests to markdown_only output mode", () => {
    const normalized = normalizeRequest(
      {
        task: "turn this webpage into markdown",
        url: "https://example.com"
      },
      "claude-code"
    );

    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("preserves the request url in the normalized broker request", () => {
    const normalized = normalizeRequest(
      {
        task: "turn this webpage into markdown",
        url: "https://example.com/path?q=1"
      },
      "claude-code"
    );

    expect(normalized.url).toBe("https://example.com/path?q=1");
  });

  it("normalizes supported markdown task text before routing", () => {
    const normalized = normalizeRequest(
      {
        task: "  turn this webpage into markdown  ",
        url: "https://example.com"
      },
      "claude-code"
    );

    expectQueryNativeRequest(normalized);
    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("rejects legacy task input without a fallback host", () => {
    expect(() =>
      normalizeRequest({
        task: "turn this webpage into markdown",
        url: "https://example.com"
      })
    ).toThrow(
      "Legacy broker tasks now require a fallback host so the request can be normalized into capabilityQuery."
    );
  });

  it("rejects tasks outside the v0 web_content_to_markdown family", () => {
    expect(() =>
      normalizeRequest(
        {
          task: "summarize this webpage",
          url: "https://example.com"
        },
        "claude-code"
      )
    ).toThrow("Unsupported broker task");
  });
});
