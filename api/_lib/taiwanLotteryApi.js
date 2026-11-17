// Official JSON API used by taiwanlottery.com's own frontend. No key/auth required.
const BASE = 'https://api.taiwanlottery.com/TLCAPIWeB/Lottery';
const FETCH_TIMEOUT_MS = 15000;

export const GAME_ENDPOINTS = {
  LOTTO649: {
    path: 'Lotto649Result',
    contentKey: 'lotto649Res',
    historyFile: 'src/data/history.json',
    expectedNumbersLength: 7, // 6 main + 1 special
    mainCount: 6,
    mainMax: 49,
    specialMax: 49,
  },
  SUPERLOTTO: {
    path: 'SuperLotto638Result',
    contentKey: 'superLotto638Res',
    historyFile: 'src/data/history_superlotto.json',
    expectedNumbersLength: 7, // 6 main + 1 second-zone number
    mainCount: 6,
    mainMax: 38,
    specialMax: 8,
  },
  '539': {
    path: 'Daily539Result',
    contentKey: 'daily539Res',
    historyFile: 'src/data/history_539.json',
    expectedNumbersLength: 5, // no special number
    mainCount: 5,
    mainMax: 39,
    specialMax: 0,
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

// Everything written to the repository passes through here, so a broken or
// tampered upstream response cannot put arbitrary data into the app.
export function isValidRecord(record, rules) {
  const { expectedNumbersLength, mainCount, mainMax, specialMax } = rules;
  if (!record || typeof record.period !== 'string') return false;
  if (!/^\d{9}$/.test(record.period)) return false;
  if (typeof record.date !== 'string' || !/^\d{2,3}\/\d{2}\/\d{2}$/.test(record.date)) return false;
  if (!Array.isArray(record.numbers) || record.numbers.length !== expectedNumbersLength) return false;

  const main = record.numbers.slice(0, mainCount);
  if (!main.every((n) => Number.isInteger(n) && n >= 1 && n <= mainMax)) return false;
  if (new Set(main).size !== main.length) return false;

  const special = record.numbers.slice(mainCount);
  return special.every((n) => Number.isInteger(n) && n >= 1 && n <= specialMax);
}

export async function fetchGameMonth(gameKey, yyyyMm) {
  const rules = GAME_ENDPOINTS[gameKey];
  const { path, contentKey } = rules;
  const res = await fetch(`${BASE}/${path}?month=${encodeURIComponent(yyyyMm)}&pageSize=31`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${gameKey} fetch failed: ${res.status}`);
  }
  const json = await res.json();
  const raw = json?.content?.[contentKey];
  const records = Array.isArray(raw) ? raw : [];

  const transformed = records.map((r) => ({
    period: String(r?.period),
    date: isoToRocDate(r?.lotteryDate),
    numbers: r?.drawNumberSize,
  }));

  const valid = [];
  let skipped = 0;
  for (const record of transformed) {
    if (isValidRecord(record, rules)) {
      valid.push(record);
    } else {
      skipped++;
      console.warn(`${gameKey}: skipping malformed record from API (period ${String(record.period).slice(0, 12)})`);
    }
  }

  return { records: valid, skipped };
}
