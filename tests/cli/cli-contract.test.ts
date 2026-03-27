import { test, expect, vi } from "vitest";
import { runBrokerCli } from "../../src/cli";

test("cli returns not implemented error when run without pipeline", async () => {
  const writes: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string) => {
      writes.push(String(chunk));
      return true;
    });

  let result: Awaited<ReturnType<typeof runBrokerCli>>;
  try {
    result = await runBrokerCli({
      task: "turn this webpage into markdown",
      url: "https://example.com"
    });
  } finally {
    writeSpy.mockRestore();
  }

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED"
    }
  });

  expect(writes).toHaveLength(1);
  const stdoutPayload = JSON.parse(writes[0]);
  expect(stdoutPayload).toMatchObject({
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED"
    }
  });
});
