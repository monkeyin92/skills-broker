import { stat } from "node:fs/promises";
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

export type DetectLifecycleHostTargetsInput = ResolveLifecyclePathsInput;

export type DetectLifecycleHostTarget = {
  installDirectory?: string;
  reason?: string;
};

export type DetectLifecycleHostTargetsResult = {
  brokerHomeDirectory: string;
  claudeCode: DetectLifecycleHostTarget;
  codex: DetectLifecycleHostTarget;
};

const DEFAULT_BROKER_HOME_DIRECTORY = ".skills-broker";
const DEFAULT_CLAUDE_CODE_ROOT_DIRECTORY = ".claude";
const DEFAULT_CLAUDE_CODE_INSTALL_DIRECTORY = join(
  DEFAULT_CLAUDE_CODE_ROOT_DIRECTORY,
  "skills",
  "skills-broker"
);
const DEFAULT_CODEX_ROOT_DIRECTORY = ".codex";
const DEFAULT_CODEX_INSTALL_DIRECTORY = join(".agents", "skills", "skills-broker");

function resolveHomeDirectory(homeDirectory?: string): string {
  return resolve(homeDirectory ?? homedir());
}

function resolveOverride(pathname: string | undefined, fallback: string): string {
  return pathname === undefined ? fallback : resolve(pathname);
}

function buildMissingRootReason(
  hostName: "claude-code" | "codex",
  rootDirectory: string,
  overrideFlag: "--claude-dir" | "--codex-dir"
): string {
  return `default ${hostName} root not detected at ${rootDirectory}; use ${overrideFlag} to specify a custom install directory`;
}

async function directoryExists(pathname: string): Promise<boolean> {
  try {
    const pathnameStat = await stat(pathname);
    return pathnameStat.isDirectory();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT" || nodeError.code === "ENOTDIR") {
      return false;
    }

    throw error;
  }
}

async function resolveDefaultTarget(
  hostName: "claude-code" | "codex",
  rootDirectory: string,
  installDirectory: string,
  overrideFlag: "--claude-dir" | "--codex-dir"
): Promise<DetectLifecycleHostTarget> {
  if (!(await directoryExists(rootDirectory))) {
    return {
      reason: buildMissingRootReason(hostName, rootDirectory, overrideFlag)
    };
  }

  return {
    installDirectory
  };
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

export async function detectLifecycleHostTargets(
  input: DetectLifecycleHostTargetsInput
): Promise<DetectLifecycleHostTargetsResult> {
  const homeDirectory = resolveHomeDirectory(input.homeDirectory);
  const paths = resolveLifecyclePaths(input);
  const claudeCodeRootDirectory = join(homeDirectory, DEFAULT_CLAUDE_CODE_ROOT_DIRECTORY);
  const codexRootDirectory = join(homeDirectory, DEFAULT_CODEX_ROOT_DIRECTORY);

  const claudeCode =
    input.claudeDirOverride !== undefined
      ? { installDirectory: paths.claudeCodeInstallDirectory }
      : await resolveDefaultTarget(
          "claude-code",
          claudeCodeRootDirectory,
          paths.claudeCodeInstallDirectory,
          "--claude-dir"
        );

  const codex =
    input.codexDirOverride !== undefined
      ? { installDirectory: paths.codexInstallDirectory }
      : await resolveDefaultTarget(
          "codex",
          codexRootDirectory,
          paths.codexInstallDirectory,
          "--codex-dir"
        );

  return {
    brokerHomeDirectory: paths.brokerHomeDirectory,
    claudeCode,
    codex
  };
}
