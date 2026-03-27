export type CachedCard = {
  fetchedAt: string;
};

export type RefreshFailureAction = {
  deleteCard: boolean;
  forceRediscovery: boolean;
};

const HARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shouldRefreshToday(card: CachedCard, now: Date): boolean {
  return utcDayKey(new Date(card.fetchedAt)) !== utcDayKey(now);
}

export function handleRefreshFailure(_card: CachedCard): RefreshFailureAction {
  return {
    deleteCard: true,
    forceRediscovery: true
  };
}

export function isWithinHardTtl(card: CachedCard, now: Date): boolean {
  return now.getTime() - new Date(card.fetchedAt).getTime() <= HARD_TTL_MS;
}
