import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveSemanticCandidates,
  selectSemanticTopMatch
} from "../../src/broker/semantic-resolver";
import { toCapabilityCard } from "../../src/core/capability-card";
import { HostSkillCatalogValidationError, loadHostSkillCandidates } from "../../src/sources/host-skill-catalog";

async function writeInvalidHostCatalogFixture(
  prefix: string,
  query: Record<string, unknown>
): Promise<string> {
  const runtimeDirectory = await mkdtemp(join(tmpdir(), prefix));
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
          query
        }
      ]
    }),
    "utf8"
  );

  return fixturePath;
}

describe("semantic resolver metadata", () => {
  it("routes an explicit web markdown request directly", () => {
    const result = resolveSemanticCandidates({
      requestText: "turn this webpage into markdown: https://example.com/post",
      candidates: [
        {
          candidateId: "web-content-to-markdown",
          proofFamily: "web_content_to_markdown",
          confidence: 0.93
        }
      ]
    });

    expect(result).toEqual({
      verdict: "direct_route",
      topMatch: {
        candidateId: "web-content-to-markdown",
        proofFamily: "web_content_to_markdown",
        confidence: 0.93
      }
    });
  });

  it("asks for clarification when only partial web markdown signals are present", () => {
    const result = resolveSemanticCandidates({
      requestText: "markdown this link",
      candidates: [
        {
          candidateId: "web-content-to-markdown",
          proofFamily: "web_content_to_markdown",
          confidence: 0.58
        }
      ]
    });

    expect(result).toEqual({
      verdict: "clarify",
      topMatch: {
        candidateId: "web-content-to-markdown",
        proofFamily: "web_content_to_markdown",
        confidence: 0.58
      }
    });
  });

  it("keeps non-markdown page conversion requests unsupported", () => {
    expect(
      resolveSemanticCandidates({
        requestText: "convert this page to pdf",
        candidates: [
          {
            candidateId: "web-content-to-markdown",
            proofFamily: "web_content_to_markdown",
            confidence: 0.91
          }
        ]
      })
    ).toEqual({
      verdict: "unsupported"
    });
  });

  it("routes an explicit Chinese web markdown request directly", () => {
    const result = resolveSemanticCandidates({
      requestText: "把这个页面转成markdown",
      candidates: [
        {
          candidateId: "web-content-to-markdown",
          proofFamily: "web_content_to_markdown",
          confidence: 0.89
        }
      ]
    });

    expect(result.verdict).toBe("direct_route");
    expect(result.topMatch).toEqual({
      candidateId: "web-content-to-markdown",
      proofFamily: "web_content_to_markdown",
      confidence: 0.89
    });
  });

  it("routes web pages as markdown directly", () => {
    const result = resolveSemanticCandidates({
      requestText: "save web pages as markdown",
      candidates: [
        {
          candidateId: "web-content-to-markdown",
          proofFamily: "web_content_to_markdown",
          confidence: 0.9
        }
      ]
    });

    expect(result.verdict).toBe("direct_route");
    expect(result.topMatch).toEqual({
      candidateId: "web-content-to-markdown",
      proofFamily: "web_content_to_markdown",
      confidence: 0.9
    });
  });

  it("marks unrelated requests as unsupported", () => {
    expect(
      resolveSemanticCandidates({
        requestText: "help me plan dinner for tonight",
        candidates: [
          {
            candidateId: "web-content-to-markdown",
            proofFamily: "web_content_to_markdown",
            confidence: 0.91
          }
        ]
      })
    ).toEqual({
      verdict: "unsupported"
    });
  });

  it("keeps non-web proof families unsupported at the routing boundary", () => {
    expect(
      resolveSemanticCandidates({
        requestText: "turn this webpage into markdown",
        candidates: [
          {
            candidateId: "generic-discovery",
            proofFamily: "capability_discovery_or_install",
            confidence: 0.99
          }
        ]
      })
    ).toEqual({
      verdict: "unsupported"
    });
  });

  it("selects topMatch by confidence without hidden family bias", () => {
    const result = selectSemanticTopMatch([
      {
        candidateId: "generic-discovery",
        proofFamily: "capability_discovery_or_install",
        confidence: 0.91
      },
      {
        candidateId: "web-content-to-markdown",
        proofFamily: "web_content_to_markdown",
        confidence: 0.87
      }
    ]);

    expect(result).toEqual({
      candidateId: "generic-discovery",
      proofFamily: "capability_discovery_or_install",
      confidence: 0.91
    });
  });

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

  it("loads the real host seed website QA card with explicit proven-family metadata", async () => {
    const fixturePath = join(process.cwd(), "config", "host-skills.seed.json");

    const candidates = await loadHostSkillCandidates(
      "capability_discovery_or_install",
      fixturePath
    );

    const websiteQaCandidate = candidates.find((candidate) => candidate.id === "website-qa");

    expect(websiteQaCandidate).toBeDefined();
    expect(toCapabilityCard(websiteQaCandidate!)).toMatchObject({
      compatibilityIntent: "capability_discovery_or_install",
      query: {
        summary: "QA websites and produce reusable QA reports",
        keywords: expect.arrayContaining(["website", "qa", "quality", "test", "audit"]),
        antiKeywords: expect.arrayContaining(["markdown", "social", "installation"]),
        confidenceHints: expect.arrayContaining(["website", "url", "qa_report"]),
        proofFamily: "website_qa",
        jobFamilies: ["quality_assurance"],
        targetTypes: ["website", "url"],
        artifacts: ["qa_report"],
        examples: expect.arrayContaining(["QA 这个网站", "check this website quality"])
      }
    });
  });

  it.each([
    {
      name: "targetTypes",
      query: { targetTypes: ["url", "bogus-target"] },
      path: "skills[0].query.targetTypes[1]"
    },
    {
      name: "jobFamilies",
      query: { jobFamilies: ["content_acquisition", ""] },
      path: "skills[0].query.jobFamilies[1]"
    },
    {
      name: "artifacts",
      query: { artifacts: ["markdown", ""] },
      path: "skills[0].query.artifacts[1]"
    },
    {
      name: "examples",
      query: { examples: ["turn this webpage into markdown", ""] },
      path: "skills[0].query.examples[1]"
    }
  ])("rejects invalid $name values in host catalogs", async ({ query, path, name }) => {
    const fixturePath = await writeInvalidHostCatalogFixture(
      `skills-broker-invalid-${name}-`,
      query
    );

    try {
      await expect(
        loadHostSkillCandidates("web_content_to_markdown", fixturePath)
      ).rejects.toBeInstanceOf(HostSkillCatalogValidationError);
      await expect(
        loadHostSkillCandidates("web_content_to_markdown", fixturePath)
      ).rejects.toThrow(
        `Invalid host skill catalog at ${fixturePath} (${path})`
      );
    } finally {
      await rm(dirname(fixturePath), { recursive: true, force: true });
    }
  });
});
