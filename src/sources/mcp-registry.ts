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

type McpRegistryServer = {
  name?: string;
  title?: string;
  description?: string;
};

type McpRegistrySearchResponse = {
  servers?: Array<{
    server?: McpRegistryServer;
  }>;
};

export async function searchMcpRegistry(
  input: BrokerIntent | McpSearchRequest,
  responseFilePath: string
): Promise<CapabilityCandidate[]> {
  const request = normalizeSearchRequest(input);
  const response = await readRecordedSearchResponse(responseFilePath);

  return (response.servers ?? [])
    .map((entry) => toCapabilityCandidate(entry.server, request))
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

function deriveLeafSubskillId(server: McpRegistryServer): string {
  const rawSegment =
    server.name?.split("/").pop() ??
    server.title ??
    server.name ??
    "default";

  return normalizeIdentifier(rawSegment);
}

function searchableText(server: McpRegistryServer): string {
  return [server.name, server.title, server.description]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLowerCase();
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function deriveQueryMetadata(
  server: McpRegistryServer
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

function overlaps(left: string[] | undefined, right: string[] | undefined): boolean {
  if (left === undefined || right === undefined || left.length === 0 || right.length === 0) {
    return false;
  }

  const rightSet = new Set(right);

  return left.some((value) => rightSet.has(value));
}

function preferredCapabilityMatches(
  server: McpRegistryServer,
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

function matchesCapabilityQuery(
  server: McpRegistryServer,
  metadata: CapabilityQueryMetadata | undefined,
  query: CapabilityQuery
): boolean {
  if (preferredCapabilityMatches(server, query.preferredCapability)) {
    return true;
  }

  if (metadata === undefined) {
    return false;
  }

  if (metadata.jobFamilies.includes("capability_acquisition")) {
    return true;
  }

  return (
    overlaps(metadata.jobFamilies, query.jobFamilies) ||
    overlaps(metadata.targetTypes, queryTargetTypes(query)) ||
    overlaps(metadata.artifacts, query.artifacts)
  );
}

function toCapabilityCandidate(
  server: McpRegistryServer | undefined,
  request: McpSearchRequest
): CapabilityCandidate | null {
  if (server?.name === undefined) {
    return null;
  }

  const metadata = deriveQueryMetadata(server);

  if (
    (request.capabilityQuery === undefined && !matchesIntent(server, request.intent)) ||
    (request.capabilityQuery !== undefined &&
      !matchesCapabilityQuery(server, metadata, request.capabilityQuery))
  ) {
    return null;
  }

  const leafSubskillId = deriveLeafSubskillId(server);

  return {
    id: server.name,
    kind: "mcp",
    label: server.title ?? server.name,
    intent: request.intent,
    query: metadata,
    package: {
      packageId: server.name,
      label: server.title ?? server.name,
      installState: "available",
      acquisition: "mcp_bundle",
      probe: {
        layouts: ["single_skill_directory"],
        manifestNames: [server.name, server.title ?? server.name]
      }
    },
    leaf: {
      capabilityId: server.name,
      packageId: server.name,
      subskillId: leafSubskillId,
      probe: {
        manifestNames: [server.name, server.title ?? server.name],
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
      registryTitle: server.title
    }
  };
}

function matchesIntent(server: McpRegistryServer, intent: BrokerIntent): boolean {
  const searchableText = [
    server.name,
    server.title,
    server.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  switch (intent) {
    case "web_content_to_markdown":
      return (
        /markdown/.test(searchableText) &&
        /(url|webpage|web page|web|page|crawl|scrape|fetch)/.test(searchableText) &&
        !/(tweet|twitter|x post|x\.com|thread|bluesky|social post)/.test(
          searchableText
        )
      );
    case "social_post_to_markdown":
      return (
        /markdown/.test(searchableText) &&
        /(tweet|twitter|x post|x\.com|thread|bluesky|social|post)/.test(
          searchableText
        )
      );
    case "capability_discovery_or_install":
      return /(skill|mcp|plugin|tool|discover|find|install)/.test(
        searchableText
      );
    default:
      return false;
  }
}
