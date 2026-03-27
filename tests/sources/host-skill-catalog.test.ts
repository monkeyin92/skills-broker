import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadHostSkillCandidates } from "../../src/sources/host-skill-catalog";

describe("loadHostSkillCandidates", () => {
  it('filters the host catalog fixture to the matching "webpage_to_markdown" candidate', async () => {
    const fixturePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "host-skill-catalog.json"
    );
    const fixture = JSON.parse(
      await readFile(fixturePath, "utf8")
    ) as {
      skills: Array<{
        id: string;
        kind: "skill";
        label: string;
        intent: string;
      }>;
    };

    const candidates = await loadHostSkillCandidates(
      "webpage_to_markdown",
      fixturePath
    );

    expect(candidates).toEqual([fixture.skills[0]]);
  });
});
