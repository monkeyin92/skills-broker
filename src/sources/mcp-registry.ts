import { readFile } from "node:fs/promises";
import type { CapabilityCandidate } from "../core/capability-card";
import type { BrokerIntent } from "../core/types";

type McpRegistrySearchResponse = {
  results?: CapabilityCandidate[];
};

export async function searchMcpRegistry(
  intent: BrokerIntent,
  responseFilePath: string
): Promise<CapabilityCandidate[]> {
  const response = await readRecordedSearchResponse(responseFilePath);

  return (response.results ?? []).filter(
    (candidate) => candidate.kind === "mcp" && candidate.intent === intent
  );
}

async function readRecordedSearchResponse(
  filePath: string
): Promise<McpRegistrySearchResponse> {
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as McpRegistrySearchResponse;
}
