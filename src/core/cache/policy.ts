export type CachedCard = {
  fetchedAt: string;
};

export type RefreshFailureAction = {
  deleteCard: boolean;
  forceRediscovery: boolean;
};

const HARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function utcDayKey(date: Date): string | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function shouldRefreshToday(card: CachedCard, now: Date): boolean {
  const fetchedDay = utcDayKey(new Date(card.fetchedAt));
  const today = utcDayKey(now);

  if (fetchedDay === null || today === null) {
    return true;
  }

  return fetchedDay !== today;
}

export function handleRefreshFailure(_card: CachedCard): RefreshFailureAction {
  return {
    deleteCard: true,
    forceRediscovery: true
  };
}

export function isWithinHardTtl(card: CachedCard, now: Date): boolean {
  const fetchedAt = new Date(card.fetchedAt).getTime();
  const nowTime = now.getTime();

  if (Number.isNaN(fetchedAt) || Number.isNaN(nowTime)) {
    return false;
  }

  const ageMs = nowTime - fetchedAt;

  if (ageMs < 0) {
    return false;
  }

  return ageMs <= HARD_TTL_MS;
}
