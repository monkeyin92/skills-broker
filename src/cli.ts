import {
  runBroker,
  type RunBrokerOptions,
  type RunBrokerResult
} from "./broker/run.js";
import { fileURLToPath } from "node:url";
import { delimiter, resolve } from "node:path";
import { parseBrokerEnvelope, type BrokerEnvelope } from "./core/envelope.js";
import { BROKER_HOSTS, isBrokerHost } from "./core/types.js";

export type RunBrokerCliInput = BrokerEnvelope;

export type RunBrokerCliOptions = RunBrokerOptions & {
  includeTrace?: boolean;
};

export type RunBrokerCliOutput = RunBrokerResult;
export type BrokerCliCommandLineArgs = {
  rawInput: string;
  includeTrace: boolean;
};

function resolveCurrentHost(
  input: BrokerEnvelope,
  options: RunBrokerOptions
): RunBrokerOptions["currentHost"] {
  if (
    options.currentHost !== undefined &&
    !isBrokerHost(options.currentHost)
  ) {
    throw new Error(
      `Expected broker currentHost to be one of ${BROKER_HOSTS.join(", ")}.`
    );
  }

  if (options.currentHost !== undefined && options.currentHost !== input.host) {
    throw new Error(
      `Broker host conflict: envelope host "${input.host}" does not match currentHost "${options.currentHost}".`
    );
  }

  return options.currentHost ?? input.host;
}

export async function runBrokerCli(
  input: RunBrokerCliInput,
  options: RunBrokerCliOptions = {}
): Promise<RunBrokerCliOutput> {
  const envelope = parseBrokerEnvelope(input);
  const currentHost = resolveCurrentHost(envelope, options);
  const response = await runBroker(envelope, {
    ...options,
    currentHost
  });
  const output =
    options.includeTrace === true
      ? response
      : (() => {
          const { trace: _trace, ...rest } = response;
          return rest as RunBrokerCliOutput;
        })();

  process.stdout.write(JSON.stringify(output));
  return output;
}

function shouldIncludeTrace(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  return /^(?:1|true|yes|trace)$/i.test(value);
}

function directRunOptions(includeTraceOverride = false): RunBrokerCliOptions {
  const includeTraceFromEnvironment = shouldIncludeTrace(
    process.env.BROKER_DEBUG ?? process.env.BROKER_TRACE
  );
  const currentHost =
    process.env.BROKER_CURRENT_HOST !== undefined &&
    isBrokerHost(process.env.BROKER_CURRENT_HOST)
      ? process.env.BROKER_CURRENT_HOST
      : undefined;

  return {
    cacheFilePath: process.env.BROKER_CACHE_FILE,
    hostCatalogFilePath: process.env.BROKER_HOST_CATALOG,
    mcpRegistryFilePath: process.env.BROKER_MCP_REGISTRY,
    brokerHomeDirectory: process.env.BROKER_HOME_DIR,
    packageSearchRoots:
      process.env.BROKER_PACKAGE_SEARCH_ROOTS?.split(delimiter).filter(Boolean),
    currentHost,
    now: process.env.BROKER_NOW ? new Date(process.env.BROKER_NOW) : undefined,
    includeTrace: includeTraceOverride || includeTraceFromEnvironment
  };
}

export function parseBrokerCliCommandLineArgs(
  argv: string[]
): BrokerCliCommandLineArgs {
  let includeTrace = false;
  let inputIndex = 0;

  if (argv[0] === "--debug") {
    includeTrace = true;
    inputIndex = 1;
  }

  const rawInput = argv[inputIndex];

  if (rawInput === undefined) {
    throw new Error(
      "Expected broker envelope JSON as the first argument. Usage: cli.js [--debug] '<broker-envelope-json>'."
    );
  }

  if (argv.length !== inputIndex + 1) {
    throw new Error(
      "Unexpected extra CLI arguments. Usage: cli.js [--debug] '<broker-envelope-json>'."
    );
  }

  return {
    rawInput,
    includeTrace
  };
}

async function runFromCommandLine(): Promise<void> {
  const commandLine = parseBrokerCliCommandLineArgs(process.argv.slice(2));
  const input = parseBrokerEnvelopeFromCommandLine(commandLine.rawInput);
  await runBrokerCli(input, directRunOptions(commandLine.includeTrace));
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
