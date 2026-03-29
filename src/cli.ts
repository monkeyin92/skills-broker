import {
  runBroker,
  type RunBrokerOptions,
  type RunBrokerResult
} from "./broker/run.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseBrokerEnvelope, type BrokerEnvelope } from "./core/envelope.js";
import type { NormalizeRequestInput } from "./core/request.js";

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

/**
 * Temporary adapter for the only CLI flow we still support in Task 1.
 * It converts a raw webpage-markdown envelope into the legacy broker input.
 * The only accepted shape is requestText === `turn this webpage into markdown: ${urls[0]}`.
 * Other validated envelope fields remain parsed at the contract layer but are
 * intentionally ignored by this temporary adapter until later tasks wire them through.
 */
function toTemporaryWebpageMarkdownInput(
  input: BrokerEnvelope
): NormalizeRequestInput {
  const urls = input.urls;
  const url = urls?.[0];
  const requestText = input.requestText;
  const currentWebpageTask = "turn this webpage into markdown";

  if (urls === undefined || url === undefined) {
    throw new Error(
      "Temporary CLI compatibility only supports webpage markdown envelopes with urls[0]."
    );
  }

  if (urls.length !== 1) {
    throw new Error(
      "Temporary CLI compatibility only supports webpage markdown envelopes with exactly one URL."
    );
  }

  const expectedRequestText = `${currentWebpageTask}: ${url}`;

  if (requestText !== expectedRequestText) {
    throw new Error(
      `Temporary CLI compatibility only supports requestText exactly matching "${expectedRequestText}".`
    );
  }

  return {
    task: currentWebpageTask,
    url
  };
}

export async function runBrokerCli(
  input: RunBrokerCliInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerCliOutput> {
  const envelope = parseBrokerEnvelope(input);
  const currentHost = resolveCurrentHost(envelope, options);
  const response = await runBroker(
    toTemporaryWebpageMarkdownInput(envelope),
    {
      ...options,
      currentHost
    }
  );

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
