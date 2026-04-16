import type { CapabilityCard } from "../core/capability-card.js";

export type CapabilitySelection = {
  package: CapabilityCard["package"];
  leafCapability: CapabilityCard["leaf"];
  implementation: CapabilityCard["implementation"];
};

function staysWithinPackageNamespace(
  value: string,
  packageId: string
): boolean {
  return value === packageId || value.startsWith(`${packageId}.`);
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

  if (!staysWithinPackageNamespace(capabilityId, packageId)) {
    throw new Error(
      `Candidate "${candidate.id}" has capability "${capabilityId}" outside package "${packageId}".`
    );
  }

  if (!staysWithinPackageNamespace(implementationId, packageId)) {
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
