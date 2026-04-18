import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toCapabilityCard } from "../../src/core/capability-card";
import { HostSkillCatalogValidationError, loadHostSkillCandidates } from "../../src/sources/host-skill-catalog";

describe("semantic resolver metadata", () => {
  it("retains default semantic query metadata when candidate omits it", () => {
    const card = toCapabilityCard({
      kind: "skill",
      id: "web-content-to-markdown",
      label: "Web Content to Markdown",
      intent: "web_content_to_markdown"
    });

    expect(card.query).toMatchObject({
      summary: "Convert web pages into markdown",
      keywords: ["web", "markdown", "content", "page"],
      antiKeywords: ["audio", "video", "podcast"],
      confidenceHints: ["url", "website", "repo"],
      proofFamily: "web_content_to_markdown"
    });
  });

  it("appends semantic arrays to defaults and dedupes them", () => {
    const card = toCapabilityCard({
      kind: "skill",
      id: "web-content-to-markdown",
      label: "Web Content to Markdown",
      intent: "web_content_to_markdown",
      query: {
        keywords: ["content", "tutorial"],
        antiKeywords: ["video", "screenshot"],
        confidenceHints: ["repo", "text"]
      }
    });

    expect(card.query.keywords).toEqual([
      "web",
      "markdown",
      "content",
      "page",
      "tutorial"
    ]);
    expect(card.query.antiKeywords).toEqual([
      "audio",
      "video",
      "podcast",
      "screenshot"
    ]);
    expect(card.query.confidenceHints).toEqual([
      "url",
      "website",
      "repo",
      "text"
    ]);
  });

  it("rejects invalid proofFamily values in host catalogs", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-invalid-proof-family-")
    );
    const fixturePath = join(runtimeDirectory, "host.json");

    await writeFile(
      fixturePath,
      JSON.stringify({
        packages: [],
        skills: [
          {
            id: "web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown",
            intent: "web_content_to_markdown",
            query: {
              proofFamily: "not-a-real-family"
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      await expect(
        loadHostSkillCandidates("web_content_to_markdown", fixturePath)
      ).rejects.toBeInstanceOf(HostSkillCatalogValidationError);
      await expect(
        loadHostSkillCandidates("web_content_to_markdown", fixturePath)
      ).rejects.toThrow(
        `Invalid host skill catalog at ${fixturePath} (skills[0].query.proofFamily)`
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("rejects invalid confidenceHints values in host catalogs", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-invalid-confidence-hints-")
    );
    const fixturePath = join(runtimeDirectory, "host.json");

    await writeFile(
      fixturePath,
      JSON.stringify({
        packages: [],
        skills: [
          {
            id: "web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown",
            intent: "web_content_to_markdown",
            query: {
              confidenceHints: ["url", "bogus-hint"]
            }
          }
        ]
      }),
      "utf8"
    );

    try {
      await expect(
        loadHostSkillCandidates("web_content_to_markdown", fixturePath)
      ).rejects.toBeInstanceOf(HostSkillCatalogValidationError);
      await expect(
        loadHostSkillCandidates("web_content_to_markdown", fixturePath)
      ).rejects.toThrow(
        `Invalid host skill catalog at ${fixturePath} (skills[0].query.confidenceHints[1])`
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("loads the real host seed web markdown card with consistent semantic metadata", async () => {
    const fixturePath = join(process.cwd(), "config", "host-skills.seed.json");

    const candidates = await loadHostSkillCandidates(
      "web_content_to_markdown",
      fixturePath
    );

    expect(candidates).toHaveLength(1);

    const card = toCapabilityCard(candidates[0]);

    expect(card.query).toMatchObject({
      summary: "Convert web pages into markdown",
      keywords: ["web", "markdown", "content", "page"],
      antiKeywords: ["audio", "video", "podcast"],
      confidenceHints: ["url", "website", "repo"],
      proofFamily: "web_content_to_markdown"
    });
  });
});
