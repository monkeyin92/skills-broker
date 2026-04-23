import { runCiTrustCli } from "../src/dev/ci-trust.ts";

const exitCode = await runCiTrustCli();
process.exitCode = exitCode;
