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

function toCapabilityCandidate(
  server: McpRegistryServer | undefined,
  intent: BrokerIntent
): CapabilityCandidate | null {
  if (server?.name === undefined || !matchesIntent(server, intent)) {
    return null;
  }

  return {
    id: server.name,
    kind: "mcp",
    label: server.title ?? server.name,
    intent
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
