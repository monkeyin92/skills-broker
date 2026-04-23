import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  BROKER_HOSTS,
  brokerHostSupportSpec,
  type BrokerHost,
  type BrokerHostOverrideFlag
} from "../core/types.js";

export type ResolveLifecyclePathsInput = {
  homeDirectory?: string;
  brokerHomeOverride?: string;
  claudeDirOverride?: string;
  codexDirOverride?: string;
  opencodeDirOverride?: string;
};

export type ResolveLifecyclePathsResult = {
  brokerHomeDirectory: string;
  claudeCodeInstallDirectory: string;
  codexInstallDirectory: string;
  opencodeInstallDirectory: string;
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
  opencode: DetectLifecycleHostTarget;
};

const DEFAULT_BROKER_HOME_DIRECTORY = ".skills-broker";
const LEGACY_OPENCODE_ROOT_SEGMENTS = [".opencode"] as const;

function resolveHomeDirectory(homeDirectory?: string): string {
  return resolve(homeDirectory ?? homedir());
}

function resolveOverride(pathname: string | undefined, fallback: string): string {
  return pathname === undefined ? fallback : resolve(pathname);
}

function buildMissingRootReason(
  hostName: BrokerHost,
  rootDirectories: string[],
  overrideFlag: BrokerHostOverrideFlag
): string {
  const renderedRoots =
    rootDirectories.length === 1
      ? rootDirectories[0]
      : rootDirectories.join(" or ");
  return `default ${hostName} root not detected at ${renderedRoots}; use ${overrideFlag} to specify a custom install directory`;
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
  hostName: BrokerHost,
  rootDirectories: string[],
  resolveInstallDirectory: (rootDirectory: string) => string,
  overrideFlag: BrokerHostOverrideFlag
): Promise<DetectLifecycleHostTarget> {
  for (const rootDirectory of rootDirectories) {
    if (await directoryExists(rootDirectory)) {
      return {
        installDirectory: resolveInstallDirectory(rootDirectory)
      };
    }
  }

  return {
    reason: buildMissingRootReason(hostName, rootDirectories, overrideFlag)
  };
}

function opencodeRootDirectoryCandidates(homeDirectory: string): string[] {
  return [
    join(
      homeDirectory,
      ...brokerHostSupportSpec("opencode").defaultRootDirectorySegments
    ),
    join(homeDirectory, ...LEGACY_OPENCODE_ROOT_SEGMENTS)
  ];
}

function resolveOpencodeInstallDirectory(rootDirectory: string): string {
  return join(rootDirectory, "skills", "skills-broker");
}

function lifecycleTargetKey(
  host: BrokerHost
): "claudeCode" | "codex" | "opencode" {
  switch (host) {
    case "claude-code":
      return "claudeCode";
    case "codex":
      return "codex";
    case "opencode":
      return "opencode";
  }
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
      join(
        homeDirectory,
        ...brokerHostSupportSpec("claude-code").defaultInstallDirectorySegments
      )
    ),
    codexInstallDirectory: resolveOverride(
      input.codexDirOverride,
      join(homeDirectory, ...brokerHostSupportSpec("codex").defaultInstallDirectorySegments)
    ),
    opencodeInstallDirectory: resolveOverride(
      input.opencodeDirOverride,
      join(
        homeDirectory,
        ...brokerHostSupportSpec("opencode").defaultInstallDirectorySegments
      )
    )
  };
}

export function lifecycleHostTarget(
  targets: DetectLifecycleHostTargetsResult,
  host: BrokerHost
): DetectLifecycleHostTarget {
  return targets[lifecycleTargetKey(host)];
}

export async function detectLifecycleHostTargets(
  input: DetectLifecycleHostTargetsInput
): Promise<DetectLifecycleHostTargetsResult> {
  const homeDirectory = resolveHomeDirectory(input.homeDirectory);
  const paths = resolveLifecyclePaths(input);
  const hostTargetsByName = Object.fromEntries(
    await Promise.all(
      BROKER_HOSTS.map(async (host) => {
        const support = brokerHostSupportSpec(host);
        const installDirectory =
          host === "claude-code"
            ? paths.claudeCodeInstallDirectory
            : host === "codex"
              ? paths.codexInstallDirectory
              : paths.opencodeInstallDirectory;
        const hasOverride =
          host === "claude-code"
            ? input.claudeDirOverride !== undefined
            : host === "codex"
              ? input.codexDirOverride !== undefined
              : input.opencodeDirOverride !== undefined;
        const rootDirectories =
          host === "opencode"
            ? opencodeRootDirectoryCandidates(homeDirectory)
            : [join(homeDirectory, ...support.defaultRootDirectorySegments)];
        const target = hasOverride
          ? { installDirectory }
          : await resolveDefaultTarget(
              host,
              rootDirectories,
              host === "opencode"
                ? resolveOpencodeInstallDirectory
                : () => installDirectory,
              support.overrideFlag
            );

        return [host, target] as const;
      })
    )
  ) as Record<BrokerHost, DetectLifecycleHostTarget>;

  return {
    brokerHomeDirectory: paths.brokerHomeDirectory,
    claudeCode: hostTargetsByName["claude-code"],
    codex: hostTargetsByName.codex,
    opencode: hostTargetsByName.opencode
  };
}
