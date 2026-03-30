import {
  runBroker,
  type RunBrokerOptions,
  type RunBrokerResult
} from "./broker/run.js";
import { fileURLToPath } from "node:url";
import { delimiter, resolve } from "node:path";
import { parseBrokerEnvelope, type BrokerEnvelope } from "./core/envelope.js";

export type RunBrokerCliInput = BrokerEnvelope;

export type RunBrokerCliOutput = RunBrokerResult;

function resolveCurrentHost(
  input: BrokerEnvelope,
  options: RunBrokerOptions
): RunBrokerOptions["currentHost"] {
  if (options.currentHost !== undefined && options.currentHost !== input.host) {
    throw new Error(
      `Broker host conflict: envelope host "${input.host}" does not match currentHost "${options.currentHost}".`
    );
  }

  return options.currentHost ?? input.host;
}

export async function runBrokerCli(
  input: RunBrokerCliInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerCliOutput> {
  const envelope = parseBrokerEnvelope(input);
  const currentHost = resolveCurrentHost(envelope, options);
  const response = await runBroker(envelope, {
    ...options,
    currentHost
  });

  process.stdout.write(JSON.stringify(response));
  return response;
}

function directRunOptions(): RunBrokerOptions {
  return {
    cacheFilePath: process.env.BROKER_CACHE_FILE,
    hostCatalogFilePath: process.env.BROKER_HOST_CATALOG,
    mcpRegistryFilePath: process.env.BROKER_MCP_REGISTRY,
    brokerHomeDirectory: process.env.BROKER_HOME_DIR,
    packageSearchRoots:
      process.env.BROKER_PACKAGE_SEARCH_ROOTS?.split(delimiter).filter(Boolean),
    currentHost: process.env.BROKER_CURRENT_HOST,
    now: process.env.BROKER_NOW ? new Date(process.env.BROKER_NOW) : undefined
  };
}

async function runFromCommandLine(): Promise<void> {
  const rawInput = process.argv[2];

  if (rawInput === undefined) {
    throw new Error("Expected broker envelope JSON as the first argument.");
  }

  const input = parseBrokerEnvelopeFromCommandLine(rawInput);
  await runBrokerCli(input, directRunOptions());
}

export function parseBrokerEnvelopeFromCommandLine(
  rawInput: string
): BrokerEnvelope {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawInput);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected JSON parse failure.";

    throw new Error(`Invalid broker envelope JSON: ${message}`);
  }

  return parseBrokerEnvelope(parsed);
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1];

  if (entryPath === undefined) {
    return false;
  }

  return fileURLToPath(import.meta.url) === resolve(entryPath);
}

if (isDirectExecution()) {
  try {
    await runFromCommandLine();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected CLI failure.";

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
