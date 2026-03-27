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
});
