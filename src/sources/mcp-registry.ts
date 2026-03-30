import { readFile } from "node:fs/promises";
import type { CapabilityCandidate } from "../core/capability-card.js";
import type { BrokerIntent } from "../core/types.js";

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
  intent: BrokerIntent,
  responseFilePath: string
): Promise<CapabilityCandidate[]> {
  const response = await readRecordedSearchResponse(responseFilePath);

  return (response.servers ?? [])
    .map((entry) => toCapabilityCandidate(entry.server, intent))
    .filter((candidate): candidate is CapabilityCandidate => candidate !== null);
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

function toCapabilityCandidate(
  server: McpRegistryServer | undefined,
  intent: BrokerIntent
): CapabilityCandidate | null {
  if (server?.name === undefined || !matchesIntent(server, intent)) {
    return null;
  }

  const leafSubskillId = deriveLeafSubskillId(server);

  return {
    id: server.name,
    kind: "mcp",
    label: server.title ?? server.name,
    intent,
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
