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

function resolveHomeDirectory(homeDirectory?: string): string {
  return resolve(homeDirectory ?? homedir());
}

function resolveOverride(pathname: string | undefined, fallback: string): string {
  return pathname === undefined ? fallback : resolve(pathname);
}

function buildMissingRootReason(
  hostName: BrokerHost,
  rootDirectory: string,
  overrideFlag: BrokerHostOverrideFlag
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
  hostName: BrokerHost,
  rootDirectory: string,
  installDirectory: string,
  overrideFlag: BrokerHostOverrideFlag
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
      join(
        homeDirectory,
        ...brokerHostSupportSpec("claude-code").defaultInstallDirectorySegments
      )
    ),
    codexInstallDirectory: resolveOverride(
      input.codexDirOverride,
      join(homeDirectory, ...brokerHostSupportSpec("codex").defaultInstallDirectorySegments)
    )
  };
}

export function lifecycleHostTarget(
  targets: DetectLifecycleHostTargetsResult,
  host: BrokerHost
): DetectLifecycleHostTarget {
  return host === "claude-code" ? targets.claudeCode : targets.codex;
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
            : paths.codexInstallDirectory;
        const hasOverride =
          host === "claude-code"
            ? input.claudeDirOverride !== undefined
            : input.codexDirOverride !== undefined;
        const rootDirectory = join(
          homeDirectory,
          ...support.defaultRootDirectorySegments
        );
        const target = hasOverride
          ? { installDirectory }
          : await resolveDefaultTarget(
              host,
              rootDirectory,
              installDirectory,
              support.overrideFlag
            );

        return [host, target] as const;
      })
    )
  ) as Record<BrokerHost, DetectLifecycleHostTarget>;

  return {
    brokerHomeDirectory: paths.brokerHomeDirectory,
    claudeCode: hostTargetsByName["claude-code"],
    codex: hostTargetsByName.codex
  };
}
