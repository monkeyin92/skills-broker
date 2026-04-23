import { readFile } from "node:fs/promises";
import type {
  CapabilityCandidate,
  CapabilityQueryMetadata
} from "../core/capability-card.js";
import type {
  BrokerIntent,
  CapabilityQuery,
  CapabilityQueryTargetType
} from "../core/types.js";

type McpSearchRequest = {
  intent: BrokerIntent;
  capabilityQuery?: CapabilityQuery;
};

type McpRegistryRemote = {
  type?: string;
  url?: string;
  command?: string;
};

type McpRegistryServer = {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  remotes?: McpRegistryRemote[];
};

type McpRegistrySearchResponse = {
  servers?: Array<{
    server?: McpRegistryServer;
  }>;
};

type ValidatedMcpRegistryRemote = {
  type: string;
  endpoint: string;
  endpointKind: "url" | "command";
};

type ValidatedMcpRegistryServer = {
  name: string;
  title?: string;
  description?: string;
  version: string;
  remotes: ValidatedMcpRegistryRemote[];
  transportTypes: string[];
  primaryTransport: string;
  endpointCount: number;
};

type RegistryQueryCoverage = {
  matchedBy:
    | "intent_match"
    | "structured_query"
    | "preferred_capability"
    | "discovery_fallback";
  jobFamilies: string[];
  targetTypes: CapabilityQueryTargetType[];
  artifacts: string[];
};

export async function searchMcpRegistry(
  input: BrokerIntent | McpSearchRequest,
  responseFilePath: string
): Promise<CapabilityCandidate[]> {
  const request = normalizeSearchRequest(input);
  const response = await readRecordedSearchResponse(responseFilePath);

  return (response.servers ?? [])
    .map((entry) => validateRegistryServer(entry.server))
    .map((server) => toCapabilityCandidate(server, request))
    .filter((candidate): candidate is CapabilityCandidate => candidate !== null);
}

function normalizeSearchRequest(
  input: BrokerIntent | McpSearchRequest
): McpSearchRequest {
  return typeof input === "string" ? { intent: input } : input;
}

async function readRecordedSearchResponse(
  filePath: string
): Promise<McpRegistrySearchResponse> {
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as McpRegistrySearchResponse;
}

function normalizeIdentifier(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s/]+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "default";
}

function nonEmptyString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function validateRegistryRemote(
  remote: McpRegistryRemote | undefined
): ValidatedMcpRegistryRemote | null {
  const type = nonEmptyString(remote?.type);
  const url = nonEmptyString(remote?.url);
  const command = nonEmptyString(remote?.command);

  if (type === undefined) {
    return null;
  }

  if (url !== undefined) {
    return {
      type,
      endpoint: url,
      endpointKind: "url"
    };
  }

  if (command !== undefined) {
    return {
      type,
      endpoint: command,
      endpointKind: "command"
    };
  }

  return null;
}

function validateRegistryServer(
  server: McpRegistryServer | undefined
): ValidatedMcpRegistryServer | null {
  const name = nonEmptyString(server?.name);
  const version = nonEmptyString(server?.version);

  if (name === undefined || version === undefined) {
    return null;
  }

  const remotes = Array.isArray(server?.remotes)
    ? server.remotes
        .map((remote) => validateRegistryRemote(remote))
        .filter(
          (remote): remote is ValidatedMcpRegistryRemote => remote !== null
        )
    : [];

  if (remotes.length === 0) {
    return null;
  }

  return {
    name,
    title: nonEmptyString(server?.title),
    description: nonEmptyString(server?.description),
    version,
    remotes,
    transportTypes: uniqueStrings(remotes.map((remote) => remote.type)),
    primaryTransport: remotes[0].type,
    endpointCount: remotes.length
  };
}

function deriveLeafSubskillId(
  server: Pick<McpRegistryServer, "name" | "title">
): string {
  const rawSegment =
    server.name?.split("/").pop() ??
    server.title ??
    server.name ??
    "default";

  return normalizeIdentifier(rawSegment);
}

function searchableText(
  server: Pick<McpRegistryServer, "name" | "title" | "description">
): string {
  return [server.name, server.title, server.description]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLowerCase();
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function deriveQueryMetadata(
  server: Pick<McpRegistryServer, "name" | "title" | "description">
): CapabilityQueryMetadata | undefined {
  const text = searchableText(server);
  const jobFamilies: string[] = [];
  const targetTypes: CapabilityQueryTargetType[] = [];
  const artifacts: string[] = [];

  if (
    /markdown/.test(text) &&
    /(tweet|twitter|x post|x\.com|thread|bluesky|social|post)/.test(text)
  ) {
    jobFamilies.push("content_acquisition", "social_content_conversion");
    targetTypes.push("url", "website");
    artifacts.push("markdown");
  }

  if (
    /markdown/.test(text) &&
    /(url|webpage|web page|website|site|page|crawl|scrape|fetch|repo|repository)/.test(
      text
    ) &&
    !/(tweet|twitter|x post|x\.com|thread|bluesky|social|post)/.test(text)
  ) {
    jobFamilies.push("content_acquisition", "web_content_conversion");
    targetTypes.push("url", "website", "repo");
    artifacts.push("markdown");
  }

  if (/(skill|mcp|plugin|tool|discover|find|install|capability)/.test(text)) {
    jobFamilies.push("capability_acquisition");
    targetTypes.push("text", "problem_statement");
    artifacts.push("recommendation", "installation_plan");
  }

  if (
    /(\bqa\b|quality assurance|quality check|website audit|test websites?|website testing)/.test(
      text
    )
  ) {
    jobFamilies.push("quality_assurance");
    targetTypes.push("website", "url");
    artifacts.push("qa_report");
  }

  if (/(investigat|debug|root cause|troubleshoot)/.test(text)) {
    jobFamilies.push("investigation");
    targetTypes.push("website", "codebase", "problem_statement");
    artifacts.push("analysis", "recommendation");
  }

  if (/(requirement|prd|spec|design doc|analysis)/.test(text)) {
    jobFamilies.push("requirements_analysis");
    targetTypes.push("problem_statement", "text");
    artifacts.push("analysis");

    if (/(design doc|spec)/.test(text)) {
      artifacts.push("design_doc");
    }
  }

  if (/(idea|brainstorm|startup|ship|launch|execution plan)/.test(text)) {
    jobFamilies.push("idea_brainstorming", "strategy_review", "engineering_review");
    targetTypes.push("problem_statement", "text");
    artifacts.push("design_doc", "analysis", "execution_plan");
  }

  if (jobFamilies.length === 0 && targetTypes.length === 0 && artifacts.length === 0) {
    return undefined;
  }

  return {
    jobFamilies: uniqueStrings(jobFamilies),
    targetTypes: uniqueStrings(targetTypes),
    artifacts: uniqueStrings(artifacts),
    examples: [server.description ?? server.title ?? server.name ?? "mcp capability"]
  };
}

function queryTargetTypes(query: CapabilityQuery): CapabilityQueryTargetType[] {
  if (query.targets === undefined) {
    return [];
  }

  return uniqueStrings(query.targets.map((target) => target.type));
}

function overlapValues<T extends string>(
  left: T[] | undefined,
  right: T[] | undefined
): T[] {
  if (left === undefined || right === undefined || left.length === 0 || right.length === 0) {
    return [];
  }

  const rightSet = new Set(right);

  return left.filter((value) => rightSet.has(value));
}

function preferredCapabilityMatches(
  server: Pick<McpRegistryServer, "name" | "title">,
  preferredCapability: string | null | undefined
): boolean {
  if (preferredCapability === undefined || preferredCapability === null) {
    return false;
  }

  const normalizedPreferred = normalizeIdentifier(preferredCapability);
  const candidateNames = [
    server.name?.toLowerCase(),
    server.title?.toLowerCase(),
    normalizeIdentifier(server.name ?? ""),
    normalizeIdentifier(server.title ?? ""),
    deriveLeafSubskillId(server)
  ].filter((value): value is string => value !== undefined && value.length > 0);

  return candidateNames.includes(preferredCapability.toLowerCase()) ||
    candidateNames.includes(normalizedPreferred);
}

function emptyQueryMetadata(
  server: Pick<McpRegistryServer, "name" | "title" | "description">
): CapabilityQueryMetadata {
  return {
    jobFamilies: [],
    targetTypes: [],
    artifacts: [],
    examples: [server.description ?? server.title ?? server.name ?? "mcp capability"]
  };
}

function structuredQueryCoverage(
  server: Pick<McpRegistryServer, "name" | "title">,
  metadata: CapabilityQueryMetadata | undefined,
  query: CapabilityQuery
): RegistryQueryCoverage | null {
  if (preferredCapabilityMatches(server, query.preferredCapability)) {
    return {
      matchedBy: "preferred_capability",
      jobFamilies: [],
      targetTypes: [],
      artifacts: []
    };
  }

  if (metadata === undefined) {
    return null;
  }

  const jobFamilies = overlapValues(metadata.jobFamilies, query.jobFamilies);
  const targetTypes = overlapValues(metadata.targetTypes, queryTargetTypes(query));
  const artifacts = overlapValues(metadata.artifacts, query.artifacts);

  if (metadata.jobFamilies.includes("capability_acquisition")) {
    return {
      matchedBy: "discovery_fallback",
      jobFamilies,
      targetTypes,
      artifacts
    };
  }

  if (jobFamilies.length === 0 && targetTypes.length === 0 && artifacts.length === 0) {
    return null;
  }

  return {
    matchedBy: "structured_query",
    jobFamilies,
    targetTypes,
    artifacts
  };
}

function toCapabilityCandidate(
  server: ValidatedMcpRegistryServer | null,
  request: McpSearchRequest
): CapabilityCandidate | null {
  if (server === null) {
    return null;
  }

  const metadata = deriveQueryMetadata(server);
  const coverage =
    request.capabilityQuery === undefined
      ? matchesIntent(server, request.intent)
        ? {
            matchedBy: "intent_match" as const,
            jobFamilies: metadata?.jobFamilies ?? [],
            targetTypes: metadata?.targetTypes ?? [],
            artifacts: metadata?.artifacts ?? []
          }
        : null
      : structuredQueryCoverage(server, metadata, request.capabilityQuery);

  if (coverage === null) {
    return null;
  }

  const leafSubskillId = deriveLeafSubskillId(server);
  const manifestNames = uniqueStrings([server.name, server.title ?? server.name]);

  return {
    id: server.name,
    kind: "mcp",
    label: server.title ?? server.name,
    intent: request.intent,
    query: metadata ?? emptyQueryMetadata(server),
    package: {
      packageId: server.name,
      label: server.title ?? server.name,
      installState: "available",
      acquisition: "mcp_bundle",
      probe: {
        layouts: ["single_skill_directory"],
        manifestNames
      }
    },
    leaf: {
      capabilityId: server.name,
      packageId: server.name,
      subskillId: leafSubskillId,
      probe: {
        manifestNames,
        aliases: [leafSubskillId]
      }
    },
    implementation: {
      id: server.name,
      type: "mcp_server",
      ownerSurface: "broker_owned_downstream"
    },
    sourceMetadata: {
      registryName: server.name,
      registryTitle: server.title,
      registryVersion: server.version,
      registryTransport: server.primaryTransport,
      registryTransportTypes: server.transportTypes,
      registryEndpointCount: server.endpointCount,
      registryValidation: {
        status: "validated",
        usableRemoteCount: server.endpointCount
      },
      registryQueryCoverage: coverage
    }
  };
}

function matchesIntent(
  server: Pick<McpRegistryServer, "name" | "title" | "description">,
  intent: BrokerIntent
): boolean {
  const searchable = searchableText(server);

  switch (intent) {
    case "web_content_to_markdown":
      return (
        /markdown/.test(searchable) &&
        /(url|webpage|web page|web|page|crawl|scrape|fetch)/.test(searchable) &&
        !/(tweet|twitter|x post|x\.com|thread|bluesky|social post)/.test(
          searchable
        )
      );
    case "social_post_to_markdown":
      return (
        /markdown/.test(searchable) &&
        /(tweet|twitter|x post|x\.com|thread|bluesky|social|post)/.test(
          searchable
        )
      );
    case "capability_discovery_or_install":
      return /(skill|mcp|plugin|tool|discover|find|install)/.test(searchable);
    default:
      return false;
  }
}
