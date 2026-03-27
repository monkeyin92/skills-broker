import {
  runBroker,
  type RunBrokerOptions,
  type RunBrokerResult
} from "./broker/run.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { NormalizeRequestInput } from "./core/request.js";

export type RunBrokerCliInput = {
  task: NormalizeRequestInput["task"];
  url: NormalizeRequestInput["url"];
};

export type RunBrokerCliOutput = RunBrokerResult;

export async function runBrokerCli(
  input: RunBrokerCliInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerCliOutput> {
  const response = await runBroker(input, options);

  process.stdout.write(JSON.stringify(response));
  return response;
}

function directRunOptions(): RunBrokerOptions {
  return {
    cacheFilePath: process.env.BROKER_CACHE_FILE,
    hostCatalogFilePath: process.env.BROKER_HOST_CATALOG,
    mcpRegistryFilePath: process.env.BROKER_MCP_REGISTRY,
    currentHost: process.env.BROKER_CURRENT_HOST,
    now: process.env.BROKER_NOW ? new Date(process.env.BROKER_NOW) : undefined
  };
}

async function runFromCommandLine(): Promise<void> {
  const rawInput = process.argv[2];

  if (rawInput === undefined) {
    throw new Error("Expected broker request JSON as the first argument.");
  }

  const input = JSON.parse(rawInput) as RunBrokerCliInput;
  await runBrokerCli(input, directRunOptions());
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1];

  if (entryPath === undefined) {
    return false;
  }

  return fileURLToPath(import.meta.url) === resolve(entryPath);
}

if (isDirectExecution()) {
  await runFromCommandLine();
}
