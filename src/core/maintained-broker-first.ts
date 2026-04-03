import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrokerIntent } from "./types.js";

const SUPPORTED_SCHEMA_VERSION = 1;
const SUPPORTED_BROKER_INTENTS = new Set<BrokerIntent>([
  "web_content_to_markdown",
  "social_post_to_markdown",
  "capability_discovery_or_install"
]);

export type MaintainedBrokerFirstFamily = {
  family: string;
  winnerId: string;
  capabilityId: string;
  expectedIntent: BrokerIntent;
  boundaryExamples: string[];
};

export type MaintainedBrokerFirstContract = {
  schemaVersion: typeof SUPPORTED_SCHEMA_VERSION;
  maintainedFamilies: MaintainedBrokerFirstFamily[];
};

export class MaintainedBrokerFirstContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaintainedBrokerFirstContractValidationError";
  }
}

function fail(filePath: string, path: string, reason: string): never {
  throw new MaintainedBrokerFirstContractValidationError(
    `Invalid maintained broker-first contract at ${filePath} (${path}): ${reason}.`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(
  filePath: string,
  path: string,
  value: unknown
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(filePath, path, "expected a non-empty string");
  }
}

function validateBoundaryExamples(
  filePath: string,
  path: string,
  value: unknown
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(filePath, path, "expected a non-empty array of strings");
  }

  return value.map((entry, index) => {
    validateNonEmptyString(filePath, `${path}[${index}]`, entry);
    return entry;
  });
}

function validateMaintainedFamilyEntry(
  filePath: string,
  path: string,
  value: unknown
): MaintainedBrokerFirstFamily {
  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  validateNonEmptyString(filePath, `${path}.family`, value.family);
  validateNonEmptyString(filePath, `${path}.winnerId`, value.winnerId);
  validateNonEmptyString(filePath, `${path}.capabilityId`, value.capabilityId);
  validateNonEmptyString(filePath, `${path}.expectedIntent`, value.expectedIntent);

  if (!SUPPORTED_BROKER_INTENTS.has(value.expectedIntent as BrokerIntent)) {
    fail(
      filePath,
      `${path}.expectedIntent`,
      `expected one of ${Array.from(SUPPORTED_BROKER_INTENTS).join(", ")}`
    );
  }

  return {
    family: value.family,
    winnerId: value.winnerId,
    capabilityId: value.capabilityId,
    expectedIntent: value.expectedIntent as BrokerIntent,
    boundaryExamples: validateBoundaryExamples(
      filePath,
      `${path}.boundaryExamples`,
      value.boundaryExamples
    )
  };
}

function ensureUnique(
  filePath: string,
  entries: MaintainedBrokerFirstFamily[],
  key: keyof Pick<MaintainedBrokerFirstFamily, "family" | "winnerId" | "capabilityId">
): void {
  const seen = new Set<string>();

  for (const entry of entries) {
    const value = entry[key];

    if (seen.has(value)) {
      fail(filePath, `maintainedFamilies.${key}`, `duplicate value "${value}"`);
    }

    seen.add(value);
  }
}

export function defaultMaintainedBrokerFirstContractFilePath(
  cwd = process.cwd()
): string {
  return join(cwd, "config", "maintained-broker-first-families.json");
}

export function parseMaintainedBrokerFirstContract(
  filePath: string,
  raw: unknown
): MaintainedBrokerFirstContract {
  if (!isRecord(raw)) {
    fail(filePath, "root", "expected an object");
  }

  if (raw.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    fail(
      filePath,
      "schemaVersion",
      `expected ${SUPPORTED_SCHEMA_VERSION}`
    );
  }

  if (!Array.isArray(raw.maintainedFamilies) || raw.maintainedFamilies.length === 0) {
    fail(filePath, "maintainedFamilies", "expected a non-empty array");
  }

  const maintainedFamilies = raw.maintainedFamilies.map((entry, index) =>
    validateMaintainedFamilyEntry(filePath, `maintainedFamilies[${index}]`, entry)
  );

  ensureUnique(filePath, maintainedFamilies, "family");
  ensureUnique(filePath, maintainedFamilies, "winnerId");
  ensureUnique(filePath, maintainedFamilies, "capabilityId");

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    maintainedFamilies
  };
}

export async function loadMaintainedBrokerFirstContract(
  filePath = defaultMaintainedBrokerFirstContractFilePath()
): Promise<MaintainedBrokerFirstContract> {
  const raw = await readFile(filePath, "utf8");
  return parseMaintainedBrokerFirstContract(
    filePath,
    JSON.parse(raw) as unknown
  );
}

export function maintainedBrokerFirstBoundaryExamples(
  contract: MaintainedBrokerFirstContract
): string[] {
  return Array.from(
    new Set(contract.maintainedFamilies.flatMap((entry) => entry.boundaryExamples))
  );
}
