import { runCapabilityTrustCheckCli } from "../src/dev/capability-trust-check.ts";

const exitCode = await runCapabilityTrustCheckCli({
  brokerHomeDirectory: process.env.BROKER_HOME_DIR,
  hostCatalogFilePath: process.env.BROKER_HOST_CATALOG,
  mcpRegistryFilePath: process.env.BROKER_MCP_REGISTRY,
  now: process.env.BROKER_NOW ? new Date(process.env.BROKER_NOW) : undefined
});

process.exitCode = exitCode;
