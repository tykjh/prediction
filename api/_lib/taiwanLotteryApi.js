// Official JSON API used by taiwanlottery.com's own frontend. No key/auth required.
const BASE = 'https://api.taiwanlottery.com/TLCAPIWeB/Lottery';

export const GAME_ENDPOINTS = {
  LOTTO649: {
    path: 'Lotto649Result',
    contentKey: 'lotto649Res',
    historyFile: 'src/data/history.json',
    expectedNumbersLength: 7, // 6 main + 1 special
  },
  SUPERLOTTO: {
    path: 'SuperLotto638Result',
    contentKey: 'superLotto638Res',
    historyFile: 'src/data/history_superlotto.json',
    expectedNumbersLength: 7, // 6 main + 1 special
  },
  '539': {
    path: 'Daily539Result',
    contentKey: 'daily539Res',
    historyFile: 'src/data/history_539.json',
    expectedNumbersLength: 5, // no special number
  },
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

// "2026-07-30T00:00:00" -> "115/07/30" (ROC era). Parses the Y/M/D digits
// directly instead of going through Date(), which parses date-TIME strings
// without a zone offset as local time (not UTC) per the ECMA-262 spec.
export function isoToRocDate(isoString) {
  const match = typeof isoString === 'string' && isoString.match(ISO_DATE_RE);
  if (!match) return null;
  const [, y, m, d] = match;
  const rocYear = Number(y) - 1911;
  return `${rocYear}/${m}/${d}`;
}

function isValidRecord(record, expectedNumbersLength) {
  if (!record || typeof record.period !== 'string' && typeof record.period !== 'number') return false;
  if (!/^\d+$/.test(String(record.period))) return false;
  if (!record.date) return false;
  if (!Array.isArray(record.numbers) || record.numbers.length !== expectedNumbersLength) return false;
  return record.numbers.every((n) => Number.isInteger(n) && n > 0);
}

export async function fetchGameMonth(gameKey, yyyyMm) {
  const { path, contentKey, expectedNumbersLength } = GAME_ENDPOINTS[gameKey];
  const res = await fetch(`${BASE}/${path}?month=${yyyyMm}&pageSize=31`);
  if (!res.ok) {
    throw new Error(`${gameKey} fetch failed: ${res.status}`);
  }
  const json = await res.json();
  const records = json?.content?.[contentKey] ?? [];

  const transformed = records.map((r) => ({
    period: String(r.period),
    date: isoToRocDate(r.lotteryDate),
    numbers: r.drawNumberSize,
  }));

  const valid = [];
  let skipped = 0;
  for (const record of transformed) {
    if (isValidRecord(record, expectedNumbersLength)) {
      valid.push(record);
    } else {
      skipped++;
      console.warn(`${gameKey}: skipping malformed record from API`, record);
    }
  }

  return { records: valid, skipped };
}
