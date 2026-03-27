import { describe, expect, it } from "vitest";
import { loadHostSkillCandidates } from "../../src/sources/host-skill-catalog";

describe("loadHostSkillCandidates", () => {
  it('returns at least one candidate for "webpage_to_markdown"', async () => {
    const candidates = await loadHostSkillCandidates("webpage_to_markdown");

    expect(candidates.length).toBeGreaterThan(0);
  });
});
