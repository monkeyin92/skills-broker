import type {
  BrokerIntent,
  CapabilityQueryTargetType,
  CapabilityImplementationType,
  CapabilityOwnershipSurface,
  CapabilityPackageRef,
  LeafCapabilityRef,
  CapabilityPackageAcquisition,
  CapabilityPackageProbe,
  LeafCapabilityProbe
} from "./types.js";

export type CapabilityCardKind = "skill" | "mcp";

export type CapabilityImplementation = {
  id: string;
  type: CapabilityImplementationType;
  ownerSurface: CapabilityOwnershipSurface;
};

export type CapabilityQueryMetadata = {
  jobFamilies: string[];
  targetTypes: CapabilityQueryTargetType[];
  artifacts: string[];
  examples: string[];
};

export type CapabilityCard = {
  id: string;
  kind: CapabilityCardKind;
  label: string;
  intent: BrokerIntent;
  package: CapabilityPackageRef;
  leaf: LeafCapabilityRef;
  query: CapabilityQueryMetadata;
  implementation: CapabilityImplementation;
  hosts: {
    currentHostSupported: boolean;
    portabilityScore: number;
  };
  prepare: {
    authRequired: boolean;
    installRequired: boolean;
  };
  ranking: {
    contextCost: number;
    confidence: number;
  };
  sourceMetadata: Record<string, unknown>;
};

export type CapabilityCandidate = {
  kind: CapabilityCardKind;
  id: string;
  label: string;
  intent: BrokerIntent;
  package?: Partial<CapabilityPackageRef>;
  leaf?: Partial<LeafCapabilityRef>;
  query?: Partial<CapabilityQueryMetadata>;
  implementation?: Partial<CapabilityImplementation>;
  sourceMetadata?: Record<string, unknown>;
};

function defaultImplementationType(
  kind: CapabilityCardKind
): CapabilityImplementationType {
  return kind === "skill" ? "local_skill" : "mcp_server";
}

function defaultQueryMetadata(
  intent: BrokerIntent
): CapabilityQueryMetadata {
  switch (intent) {
    case "web_content_to_markdown":
      return {
        jobFamilies: ["content_acquisition", "web_content_conversion"],
        targetTypes: ["url", "website", "repo"],
        artifacts: ["markdown"],
        examples: [
          "turn this webpage into markdown",
          "将这个页面转为markdown文件"
        ]
      };
    case "social_post_to_markdown":
      return {
        jobFamilies: ["content_acquisition", "social_content_conversion"],
        targetTypes: ["url", "website"],
        artifacts: ["markdown"],
        examples: [
          "save this X post as markdown",
          "把这个帖子转成 markdown"
        ]
      };
    case "capability_discovery_or_install":
      return {
        jobFamilies: ["capability_acquisition"],
        targetTypes: ["text", "problem_statement"],
        artifacts: ["recommendation", "installation_plan"],
        examples: [
          "find a skill to save webpages as markdown",
          "帮我找一个能 QA 网站的 skill"
        ]
      };
  }
}

function mergeUniqueStrings(
  preferred: string[] | undefined,
  fallback: string[]
): string[] {
  const merged = preferred ?? fallback;
  const seen = new Set<string>();

  return merged.filter((value) => {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function mergeOptionalUniqueStrings(
  preferred: string[] | undefined,
  fallback: string[] | undefined
): string[] | undefined {
  if (preferred === undefined && fallback === undefined) {
    return undefined;
  }

  return mergeUniqueStrings(preferred, fallback ?? []);
}

function normalizeIdentifier(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "unknown";
}

function implementationPackageId(
  implementationId: string | undefined
): string | undefined {
  if (implementationId === undefined || !implementationId.includes(".")) {
    return undefined;
  }

  const [packageId] = implementationId.split(".", 1);

  return packageId;
}

function implementationSubskillId(
  implementationId: string | undefined
): string | undefined {
  if (implementationId === undefined || !implementationId.includes(".")) {
    return undefined;
  }

  return implementationId.split(".").slice(1).join(".");
}

function defaultPackageRef(
  candidate: CapabilityCandidate,
  implementationId: string
): CapabilityPackageRef {
  const packageId =
    candidate.package?.packageId ??
    (typeof candidate.sourceMetadata?.packageId === "string"
      ? candidate.sourceMetadata.packageId
      : undefined) ??
    implementationPackageId(implementationId) ??
    (candidate.kind === "mcp" ? "mcp" : normalizeIdentifier(candidate.id));

  const installState =
    candidate.package?.installState ??
    (typeof candidate.sourceMetadata?.packageInstallState === "string" &&
    (candidate.sourceMetadata.packageInstallState === "installed" ||
      candidate.sourceMetadata.packageInstallState === "available")
      ? candidate.sourceMetadata.packageInstallState
      : "installed");

  return {
    packageId,
    label: candidate.package?.label ?? packageId,
    installState,
    acquisition:
      candidate.package?.acquisition ??
      defaultPackageAcquisition(candidate.kind, packageId)
  };
}

function defaultPackageAcquisition(
  kind: CapabilityCardKind,
  packageId: string
): CapabilityPackageAcquisition {
  if (packageId === "skills_broker") {
    return "broker_native";
  }

  return kind === "mcp" ? "mcp_bundle" : "local_skill_bundle";
}

function defaultPackageProbe(
  candidate: CapabilityCandidate,
  kind: CapabilityCardKind,
  packageId: string
): CapabilityPackageProbe | undefined {
  if (kind !== "skill") {
    return undefined;
  }

  const sourcePackageName =
    typeof candidate.sourceMetadata?.packageName === "string"
      ? candidate.sourceMetadata.packageName
      : undefined;
  const packageProbe = candidate.package?.probe;

  return {
    layouts: packageProbe?.layouts ?? ["single_skill_directory"],
    manifestFiles:
      packageProbe?.manifestFiles ?? [
        "package.json",
        "SKILL.md",
        ".skills-broker.json",
        "conductor.json"
      ],
    manifestNames: mergeOptionalUniqueStrings(packageProbe?.manifestNames, [
      packageId,
      sourcePackageName
    ].filter((value): value is string => value !== undefined)),
    aliases: packageProbe?.aliases
  };
}

function defaultLeafRef(
  candidate: CapabilityCandidate,
  packageRef: CapabilityPackageRef,
  implementationId: string
): LeafCapabilityRef {
  const leafProbe = candidate.leaf?.probe;
  const sourceSkillName =
    typeof candidate.sourceMetadata?.skillName === "string"
      ? candidate.sourceMetadata.skillName
      : undefined;
  const subskillId = normalizeIdentifier(
    candidate.leaf?.subskillId ??
      (typeof candidate.sourceMetadata?.subskillId === "string"
        ? candidate.sourceMetadata.subskillId
        : undefined) ??
      implementationSubskillId(implementationId) ??
      candidate.id
  );

  const defaultLeafProbe: LeafCapabilityProbe | undefined =
    candidate.kind === "skill"
      ? {
          manifestFiles: leafProbe?.manifestFiles ?? [
            "SKILL.md",
            ".skills-broker.json"
          ],
          manifestNames: mergeOptionalUniqueStrings(leafProbe?.manifestNames, [
            subskillId,
            sourceSkillName
          ].filter((value): value is string => value !== undefined)),
          aliases: mergeOptionalUniqueStrings(leafProbe?.aliases, [
            `${packageRef.packageId}-${subskillId}`,
            sourceSkillName === undefined
              ? undefined
              : `${packageRef.packageId}-${sourceSkillName}`
          ].filter((value): value is string => value !== undefined))
        }
      : undefined;

  return {
    capabilityId:
      candidate.leaf?.capabilityId ?? `${packageRef.packageId}.${subskillId}`,
    packageId: candidate.leaf?.packageId ?? packageRef.packageId,
    subskillId,
    probe: defaultLeafProbe
  };
}

export function toCapabilityCard(candidate: CapabilityCandidate): CapabilityCard {
  const kind = candidate.kind;
  const defaults = defaultQueryMetadata(candidate.intent);
  const implementationId = candidate.implementation?.id ?? candidate.id;
  const packageRef = defaultPackageRef(candidate, implementationId);
  const leafRef = defaultLeafRef(candidate, packageRef, implementationId);
  const implementation: CapabilityImplementation = {
    id: implementationId,
    type: candidate.implementation?.type ?? defaultImplementationType(kind),
    ownerSurface:
      candidate.implementation?.ownerSurface ?? "broker_owned_downstream"
  };

  return {
    id: candidate.id,
    kind,
    label: candidate.label,
    intent: candidate.intent,
    package: {
      ...packageRef,
      probe: defaultPackageProbe(candidate, kind, packageRef.packageId)
    },
    leaf: leafRef,
    query: {
      jobFamilies: mergeUniqueStrings(candidate.query?.jobFamilies, defaults.jobFamilies),
      targetTypes: (candidate.query?.targetTypes ?? defaults.targetTypes).slice(),
      artifacts: mergeUniqueStrings(candidate.query?.artifacts, defaults.artifacts),
      examples: mergeUniqueStrings(candidate.query?.examples, defaults.examples)
    },
    implementation,
    hosts: {
      currentHostSupported: true,
      portabilityScore: kind === "skill" ? 1 : 0
    },
    prepare: {
      authRequired: false,
      installRequired:
        kind === "mcp" || packageRef.installState !== "installed"
    },
    ranking: {
      contextCost: kind === "skill" ? 0 : 1,
      confidence: 1
    },
    sourceMetadata: candidate.sourceMetadata ?? {}
  };
}
