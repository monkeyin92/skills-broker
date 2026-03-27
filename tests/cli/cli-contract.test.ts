import { test, expect } from "vitest";
import { runBrokerCli } from "../../src/cli";

test("cli returns not implemented error when run without pipeline", async () => {
  const result = await runBrokerCli({
    task: "turn this webpage into markdown",
    url: "https://example.com"
  });

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED"
    }
  });
});
