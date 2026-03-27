import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileBackedCacheStore } from "../../src/core/cache/store";
import {
  handleRefreshFailure,
  isWithinHardTtl,
  shouldRefreshToday
} from "../../src/core/cache/policy";

describe("cache freshness policy", () => {
  it("shouldRefreshToday returns true for yesterday's card", () => {
    const yesterdayCard = {
      fetchedAt: "2026-03-26T10:00:00.000Z"
    };
    const now = new Date("2026-03-27T09:00:00.000Z");

    expect(shouldRefreshToday(yesterdayCard, now)).toBe(true);
  });

  it("shouldRefreshToday returns true for invalid fetchedAt", () => {
    const invalidCard = {
      fetchedAt: "not-a-date"
    };
    const now = new Date("2026-03-27T09:00:00.000Z");

    expect(shouldRefreshToday(invalidCard, now)).toBe(true);
  });

  it("handleRefreshFailure deletes stale cards and forces rediscovery", () => {
    const staleCard = {
      fetchedAt: "2026-03-01T00:00:00.000Z"
    };

    expect(handleRefreshFailure(staleCard)).toEqual({
      deleteCard: true,
      forceRediscovery: true
    });
  });

  it("isWithinHardTtl returns false after the hard ttl window", () => {
    const oldCard = {
      fetchedAt: "2026-01-01T00:00:00.000Z"
    };
    const now = new Date("2026-03-27T00:00:00.000Z");

    expect(isWithinHardTtl(oldCard, now)).toBe(false);
  });

  it("isWithinHardTtl returns false for future fetchedAt values", () => {
    const futureCard = {
      fetchedAt: "2026-04-27T00:00:00.000Z"
    };
    const now = new Date("2026-03-27T00:00:00.000Z");

    expect(isWithinHardTtl(futureCard, now)).toBe(false);
  });
});

describe("file-backed cache store", () => {
  it("returns null when cache json is corrupted", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-broker-cache-"));
    const filePath = join(directory, "cache.json");
    const store = new FileBackedCacheStore(filePath);

    await writeFile(filePath, "{\"card\":", "utf8");

    await expect(store.read()).resolves.toBeNull();
    await rm(directory, { recursive: true, force: true });
  });
});
