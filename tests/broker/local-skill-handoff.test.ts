import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toCapabilityCard } from "../../src/core/capability-card";
import { resolveLocalSkillHandoffSource } from "../../src/broker/local-skill-handoff";

function createWinner() {
  return toCapabilityCard({
    id: "web-content-to-markdown",
    kind: "skill",
    label: "Web Content to Markdown",
    intent: "web_content_to_markdown",
    package: {
      packageId: "baoyu",
      label: "baoyu",
      installState: "installed",
      acquisition: "local_skill_bundle",
      probe: {
        layouts: ["single_skill_directory"],
        manifestNames: ["baoyu"]
      }
    },
    leaf: {
      capabilityId: "baoyu.url-to-markdown",
      packageId: "baoyu",
      subskillId: "url-to-markdown",
      probe: {
        manifestNames: ["baoyu-url-to-markdown"],
        aliases: ["url-to-markdown"]
      }
    },
    implementation: {
      id: "baoyu.url_to_markdown",
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    },
    sourceMetadata: {
      skillName: "baoyu-url-to-markdown"
    }
  });
}

describe("resolveLocalSkillHandoffSource", () => {
  it("reuses a verified downstream skill path from another managed host", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-local-skill-handoff-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexSkillDirectory = join(
      brokerHomeDirectory,
      "downstream",
      "codex",
      "skills",
      "baoyu-url-to-markdown"
    );

    try {
      await mkdir(codexSkillDirectory, { recursive: true });
      await writeFile(
        join(codexSkillDirectory, "SKILL.md"),
        '---\nname: "baoyu-url-to-markdown"\n---\n',
        "utf8"
      );

      const source = await resolveLocalSkillHandoffSource(createWinner(), {
        currentHost: "claude-code",
        brokerHomeDirectory
      });

      expect(source).toEqual({
        skillName: "baoyu-url-to-markdown",
        skillDirectory: codexSkillDirectory,
        skillFilePath: join(codexSkillDirectory, "SKILL.md"),
        sourceHost: "codex"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
