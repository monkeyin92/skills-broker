import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BrokerRoutingTrace } from "./trace.js";

export function routingTraceLogFilePath(
  brokerHomeDirectory: string
): string {
  return join(brokerHomeDirectory, "state", "routing-traces.jsonl");
}

export async function appendBrokerRoutingTrace(
  filePath: string,
  trace: BrokerRoutingTrace
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(trace)}\n`, "utf8");
}

export async function readBrokerRoutingTraces(
  filePath: string
): Promise<BrokerRoutingTrace[]> {
  try {
    const raw = await readFile(filePath, "utf8");

    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as BrokerRoutingTrace];
        } catch {
          return [];
        }
      });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}
