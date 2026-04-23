import { runLocalVerificationCli } from "../src/dev/local-verification.ts";

const exitCode = await runLocalVerificationCli();
process.exitCode = exitCode;
