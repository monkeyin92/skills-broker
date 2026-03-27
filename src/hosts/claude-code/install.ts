import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type InstallClaudeCodePluginOptions = {
  installDirectory: string;
  projectRoot?: string;
};

export type InstallClaudeCodePluginResult = {
  installDirectory: string;
  manifestPath: string;
  skillPath: string;
};

const DEFAULT_VERSION = "0.1.0";
const PLUGIN_NAME = "skills-broker-claude-code";
const SKILL_DIRECTORY = "webpage-to-markdown";

function buildManifest(version: string) {
  return {
    name: PLUGIN_NAME,
    version,
    description: "Minimal local Claude Code host package for skills-broker smoke tests."
  };
}

function buildSkillMarkdown() {
  return `# Webpage To Markdown

Use this skill when the request is: turn this webpage into markdown
`;
}

async function readPackageVersion(projectRoot?: string): Promise<string> {
  if (projectRoot === undefined) {
    return DEFAULT_VERSION;
  }

  try {
    const packageJson = JSON.parse(
      await readFile(join(projectRoot, "package.json"), "utf8")
    ) as { version?: string };

    return packageJson.version ?? DEFAULT_VERSION;
  } catch {
    return DEFAULT_VERSION;
  }
}

export async function installClaudeCodePlugin(
  options: InstallClaudeCodePluginOptions
): Promise<InstallClaudeCodePluginResult> {
  const version = await readPackageVersion(options.projectRoot);
  const manifestPath = join(
    options.installDirectory,
    ".claude-plugin",
    "plugin.json"
  );
  const skillPath = join(
    options.installDirectory,
    "skills",
    SKILL_DIRECTORY,
    "SKILL.md"
  );

  await mkdir(dirname(manifestPath), { recursive: true });
  await mkdir(dirname(skillPath), { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(buildManifest(version), null, 2)}\n`,
    "utf8"
  );
  await writeFile(skillPath, buildSkillMarkdown(), "utf8");

  return {
    installDirectory: options.installDirectory,
    manifestPath,
    skillPath
  };
}
