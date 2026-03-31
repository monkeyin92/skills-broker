import { access, readdir, stat } from "node:fs/promises";
import { resolveSharedBrokerHomeLayout } from "./install.js";
import { readManagedShellManifest } from "./ownership.js";
import { detectWritableDirectory } from "./detect.js";
import {
  buildPeerSkillRemediation,
  competingPeerSkillsWarning,
  detectCompetingPeerSkills
} from "./host-surface.js";
import { detectLifecycleHostTargets } from "./paths.js";

export type DoctorLifecycleResult = {
  command: "doctor";
  sharedHome: {
    path: string;
    exists: boolean;
  };
  hosts: Array<{
    name: "claude-code" | "codex";
    status: "detected" | "not_detected" | "not_writable" | "conflict";
    reason?: string;
    competingPeerSkills?: string[];
    remediation?: {
      action: "hide_competing_peer_skills";
      targetDirectory: string;
      peerSkills: string[];
      message: string;
    };
  }>;
  warnings: string[];
};

export type DoctorSharedBrokerHomeOptions = {
  brokerHomeDirectory: string;
  homeDirectory?: string;
  claudeCodeInstallDirectory?: string;
  codexInstallDirectory?: string;
};

type DoctorHostEntry = DoctorLifecycleResult["hosts"][number];

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function conflictReason(
  state: Awaited<ReturnType<typeof readManagedShellManifest>>
): string {
  switch (state.status) {
    case "foreign":
      return "foreign ownership manifest";
    case "invalid-json":
      return "invalid ownership manifest json";
    case "invalid-manifest":
      return "invalid ownership manifest";
    case "unreadable":
      return `unreadable ownership manifest: ${state.error.message}`;
    default:
      return "conflicting host shell state";
  }
}

async function detectUnmanagedHostConflict(
  name: "claude-code" | "codex",
  installDirectory: string
): Promise<string | undefined> {
  try {
    const directoryStat = await stat(installDirectory);

    if (!directoryStat.isDirectory()) {
      return "existing unmanaged host path is not a directory";
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }

  const entries = await readdir(installDirectory);
  if (entries.length === 0) {
    return undefined;
  }

  const knownHostFiles =
    name === "claude-code"
      ? ["SKILL.md", "package.json", ".claude-plugin", "skills", "bin"]
      : ["SKILL.md", "bin", ".skills-broker.json"];

  if (entries.some((entry) => knownHostFiles.includes(entry)) || entries.length > 0) {
    return "existing unmanaged host directory";
  }

  return undefined;
}

async function doctorHost(
  name: "claude-code" | "codex",
  installDirectory: string | undefined,
  notDetectedReason: string | undefined,
  brokerHomeDirectory: string,
  warnings: string[]
): Promise<DoctorHostEntry> {
  if (installDirectory === undefined) {
    return {
      name,
      status: "not_detected",
      reason: notDetectedReason
    };
  }

  const manifestState = await readManagedShellManifest(installDirectory);
  if (manifestState.status === "managed") {
    const competingPeerSkills = await detectCompetingPeerSkills(installDirectory);

    if (competingPeerSkills.length > 0) {
      warnings.push(competingPeerSkillsWarning(name, competingPeerSkills));
    }

    return {
      name,
      status: "detected",
      reason: "managed by skills-broker",
      ...(competingPeerSkills.length > 0
        ? {
            competingPeerSkills,
            remediation: buildPeerSkillRemediation(
              name,
              brokerHomeDirectory,
              competingPeerSkills
            )
          }
        : {})
    };
  }

  if (
    manifestState.status === "foreign" ||
    manifestState.status === "invalid-json" ||
    manifestState.status === "invalid-manifest" ||
    manifestState.status === "unreadable"
  ) {
    const reason = conflictReason(manifestState);
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "conflict",
      reason
    };
  }

  const writableState = await detectWritableDirectory(installDirectory);
  if (writableState.status === "not-writable") {
    const reason =
      writableState.reason === "not-a-directory"
        ? `host path is blocked by a file at ${writableState.blockingPath}`
        : `host path is not writable: ${writableState.blockingPath}`;
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "not_writable",
      reason
    };
  }

  const unmanagedConflictReason = await detectUnmanagedHostConflict(name, installDirectory);
  if (unmanagedConflictReason !== undefined) {
    warnings.push(`${name}: ${unmanagedConflictReason}`);
    return {
      name,
      status: "conflict",
      reason: unmanagedConflictReason
    };
  }

  const reason = writableState.targetExists
    ? "host shell is missing ownership manifest"
    : "host shell directory is missing";

  return {
    name,
    status: "not_detected",
    reason
  };
}

export async function doctorSharedBrokerHome(
  options: DoctorSharedBrokerHomeOptions
): Promise<DoctorLifecycleResult> {
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const hostTargets = await detectLifecycleHostTargets({
    homeDirectory: options.homeDirectory,
    brokerHomeOverride: options.brokerHomeDirectory,
    claudeDirOverride: options.claudeCodeInstallDirectory,
    codexDirOverride: options.codexInstallDirectory
  });
  const warnings: string[] = [];

  return {
    command: "doctor",
    sharedHome: {
      path: options.brokerHomeDirectory,
      exists: await pathExists(sharedHomeLayout.packageJsonPath)
    },
    hosts: [
      await doctorHost(
        "claude-code",
        hostTargets.claudeCode.installDirectory,
        hostTargets.claudeCode.reason,
        options.brokerHomeDirectory,
        warnings
      ),
      await doctorHost(
        "codex",
        hostTargets.codex.installDirectory,
        hostTargets.codex.reason,
        options.brokerHomeDirectory,
        warnings
      )
    ],
    warnings
  };
}
