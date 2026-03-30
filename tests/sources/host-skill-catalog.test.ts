import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadHostSkillCandidates } from "../../src/sources/host-skill-catalog";

describe("loadHostSkillCandidates", () => {
  it('filters the host catalog fixture to the matching "web_content_to_markdown" candidate', async () => {
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
      "web_content_to_markdown",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject(fixture.skills[0]);
    expect(candidates[0].package).toMatchObject({
      packageId: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle"
    });
  });

  it('filters the host catalog fixture to the matching "capability_discovery_or_install" candidate', async () => {
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
      "capability_discovery_or_install",
      fixturePath
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject(fixture.skills[1]);
    expect(candidates[0].package).toMatchObject({
      packageId: "skills_broker",
      installState: "installed",
      acquisition: "broker_native"
    });
  });
});
