import { test, expect, vi } from "vitest";
import { runBrokerCli } from "../../src/cli";

test("cli writes the broker result payload to stdout", async () => {
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
    ok: true,
    outcome: {
      code: "HANDOFF_READY"
    },
    winner: {
      id: "skill-webpage-to-markdown"
    },
    handoff: {
      brokerDone: true
    }
  });

  expect(writes).toHaveLength(1);
  const stdoutPayload = JSON.parse(writes[0]);
  expect(stdoutPayload).toMatchObject({
    ok: true,
    outcome: {
      code: "HANDOFF_READY"
    },
    winner: {
      id: "skill-webpage-to-markdown"
    },
    handoff: {
      brokerDone: true
    }
  });
});
