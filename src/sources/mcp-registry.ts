import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CapabilityCandidate } from "../core/capability-card";
import type { BrokerIntent } from "../core/types";

type McpRegistrySearchResponse = {
  results?: CapabilityCandidate[];
};

export async function searchMcpRegistry(
  intent: BrokerIntent
): Promise<CapabilityCandidate[]> {
  const response = await readRecordedSearchResponse();

  return (response.results ?? []).filter(
    (candidate) => candidate.kind === "mcp" && candidate.intent === intent
  );
}

async function readRecordedSearchResponse(): Promise<McpRegistrySearchResponse> {
  const filePath = join(
    process.cwd(),
    "tests",
    "fixtures",
    "mcp-registry",
    "search-response.json"
  );
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as McpRegistrySearchResponse;
}
