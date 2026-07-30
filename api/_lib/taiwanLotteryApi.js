// Official JSON API used by taiwanlottery.com's own frontend. No key/auth required.
const BASE = 'https://api.taiwanlottery.com/TLCAPIWeB/Lottery';

export const GAME_ENDPOINTS = {
  LOTTO649: {
    path: 'Lotto649Result',
    contentKey: 'lotto649Res',
    historyFile: 'src/data/history.json',
  },
  SUPERLOTTO: {
    path: 'SuperLotto638Result',
    contentKey: 'superLotto638Res',
    historyFile: 'src/data/history_superlotto.json',
  },
  '539': {
    path: 'Daily539Result',
    contentKey: 'daily539Res',
    historyFile: 'src/data/history_539.json',
  },
};

// "2026-07-30T00:00:00" (no timezone suffix, parsed as UTC) -> "115/07/30" (ROC era)
export function isoToRocDate(isoString) {
  const d = new Date(isoString);
  const rocYear = d.getUTCFullYear() - 1911;
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${rocYear}/${mm}/${dd}`;
}

export async function fetchGameMonth(gameKey, yyyyMm) {
  const { path, contentKey } = GAME_ENDPOINTS[gameKey];
  const res = await fetch(`${BASE}/${path}?month=${yyyyMm}&pageSize=31`);
  if (!res.ok) {
    throw new Error(`${gameKey} fetch failed: ${res.status}`);
  }
  const json = await res.json();
  const records = json?.content?.[contentKey] ?? [];
  return records.map((r) => ({
    period: String(r.period),
    date: isoToRocDate(r.lotteryDate),
    numbers: r.drawNumberSize,
  }));
}
