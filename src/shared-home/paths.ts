import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type ResolveLifecyclePathsInput = {
  homeDirectory?: string;
  brokerHomeOverride?: string;
  claudeDirOverride?: string;
  codexDirOverride?: string;
};

export type ResolveLifecyclePathsResult = {
  brokerHomeDirectory: string;
  claudeCodeInstallDirectory: string;
  codexInstallDirectory: string;
};

const DEFAULT_BROKER_HOME_DIRECTORY = ".skills-broker";
const DEFAULT_CLAUDE_CODE_INSTALL_DIRECTORY = ".claude-code-plugin";
const DEFAULT_CODEX_INSTALL_DIRECTORY = join(
  ".codex",
  "skills",
  "webpage-to-markdown"
);

function resolveHomeDirectory(homeDirectory?: string): string {
  return resolve(homeDirectory ?? homedir());
}

function resolveOverride(pathname: string | undefined, fallback: string): string {
  return pathname === undefined ? fallback : resolve(pathname);
}

export function resolveLifecyclePaths(
  input: ResolveLifecyclePathsInput
): ResolveLifecyclePathsResult {
  const homeDirectory = resolveHomeDirectory(input.homeDirectory);

  return {
    brokerHomeDirectory: resolveOverride(
      input.brokerHomeOverride,
      join(homeDirectory, DEFAULT_BROKER_HOME_DIRECTORY)
    ),
    claudeCodeInstallDirectory: resolveOverride(
      input.claudeDirOverride,
      join(homeDirectory, DEFAULT_CLAUDE_CODE_INSTALL_DIRECTORY)
    ),
    codexInstallDirectory: resolveOverride(
      input.codexDirOverride,
      join(homeDirectory, DEFAULT_CODEX_INSTALL_DIRECTORY)
    )
  };
}
