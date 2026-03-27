import { describe, expect, it } from "vitest";
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
});
