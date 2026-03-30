import type {
  BrokerIntent,
  CapabilityQueryTargetType,
  CapabilityImplementationType,
  CapabilityOwnershipSurface
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

export function toCapabilityCard(candidate: CapabilityCandidate): CapabilityCard {
  const kind = candidate.kind;
  const defaults = defaultQueryMetadata(candidate.intent);
  const implementation: CapabilityImplementation = {
    id: candidate.implementation?.id ?? candidate.id,
    type: candidate.implementation?.type ?? defaultImplementationType(kind),
    ownerSurface:
      candidate.implementation?.ownerSurface ?? "broker_owned_downstream"
  };

  return {
    id: candidate.id,
    kind,
    label: candidate.label,
    intent: candidate.intent,
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
      installRequired: kind === "mcp"
    },
    ranking: {
      contextCost: kind === "skill" ? 0 : 1,
      confidence: 1
    },
    sourceMetadata: candidate.sourceMetadata ?? {}
  };
}
