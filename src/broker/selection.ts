import type { CapabilityCard } from "../core/capability-card.js";

export type CapabilitySelection = {
  package: CapabilityCard["package"];
  leafCapability: CapabilityCard["leaf"];
  implementation: CapabilityCard["implementation"];
};

function packagePrefix(value: string): string | undefined {
  if (!value.includes(".")) {
    return undefined;
  }

  return value.split(".", 1)[0];
}

export function buildCapabilitySelection(
  candidate: CapabilityCard
): CapabilitySelection {
  const packageId = candidate.package.packageId.trim();
  const capabilityId = candidate.leaf.capabilityId.trim();
  const leafPackageId = candidate.leaf.packageId.trim();
  const subskillId = candidate.leaf.subskillId.trim();
  const implementationId = candidate.implementation.id.trim();

  if (packageId.length === 0) {
    throw new Error(`Candidate "${candidate.id}" is missing package.packageId.`);
  }

  if (capabilityId.length === 0) {
    throw new Error(`Candidate "${candidate.id}" is missing leaf.capabilityId.`);
  }

  if (leafPackageId.length === 0) {
    throw new Error(`Candidate "${candidate.id}" is missing leaf.packageId.`);
  }

  if (subskillId.length === 0) {
    throw new Error(`Candidate "${candidate.id}" is missing leaf.subskillId.`);
  }

  if (implementationId.length === 0) {
    throw new Error(`Candidate "${candidate.id}" is missing implementation.id.`);
  }

  if (leafPackageId !== packageId) {
    throw new Error(
      `Candidate "${candidate.id}" has mismatched package ids: package "${packageId}" vs leaf "${leafPackageId}".`
    );
  }

  const capabilityPackageId = packagePrefix(capabilityId);
  if (capabilityPackageId !== undefined && capabilityPackageId !== packageId) {
    throw new Error(
      `Candidate "${candidate.id}" has capability "${capabilityId}" outside package "${packageId}".`
    );
  }

  const implementationPackageId = packagePrefix(implementationId);
  if (
    implementationPackageId !== undefined &&
    implementationPackageId !== packageId
  ) {
    throw new Error(
      `Candidate "${candidate.id}" has implementation "${implementationId}" outside package "${packageId}".`
    );
  }

  return {
    package: candidate.package,
    leafCapability: candidate.leaf,
    implementation: candidate.implementation
  };
}
