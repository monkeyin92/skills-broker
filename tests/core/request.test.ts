import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../../src/core/request";

describe("normalizeRequest", () => {
  it("normalizes webpage markdown requests to the webpage_to_markdown intent", () => {
    const normalized = normalizeRequest({
      task: "turn this webpage into markdown",
      url: "https://example.com"
    });

    expect(normalized.intent).toBe("webpage_to_markdown");
  });

  it("normalizes webpage markdown requests to markdown_only output mode", () => {
    const normalized = normalizeRequest({
      task: "turn this webpage into markdown",
      url: "https://example.com"
    });

    expect(normalized.outputMode).toBe("markdown_only");
  });

  it("preserves the request url in the normalized broker request", () => {
    const normalized = normalizeRequest({
      task: "turn this webpage into markdown",
      url: "https://example.com/path?q=1"
    });

    expect(normalized.url).toBe("https://example.com/path?q=1");
  });

  it("rejects tasks outside the v0 webpage_to_markdown family", () => {
    expect(() =>
      normalizeRequest({
        task: "summarize this webpage",
        url: "https://example.com"
      })
    ).toThrow("Unsupported broker task");
  });
});
