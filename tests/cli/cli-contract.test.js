import { runBrokerCli } from "../../src/cli.js";

const expected = {
  ok: false,
  error: {
    code: "NOT_IMPLEMENTED",
    message: "broker pipeline not wired yet"
  }
};

async function runContractTest() {
  const result = await runBrokerCli({
    task: "turn this webpage into markdown",
    url: "https://example.com"
  });

  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`result mismatch: ${JSON.stringify(result)} !== ${JSON.stringify(expected)}`);
  }

  console.log("tests/cli/cli-contract.test.js: PASS");
}

runContractTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
