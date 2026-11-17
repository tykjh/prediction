import { timingSafeEqual } from 'node:crypto';
import { GAME_ENDPOINTS, fetchGameMonth } from './_lib/taiwanLotteryApi.js';
import { getFile, putFile } from './_lib/githubContents.js';

function currentYyyyMm() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Compare without leaking how many leading characters matched.
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAuthorized(authorizationHeader, secret) {
  // Without this check an unset secret would make "Bearer undefined" a valid key.
  if (typeof secret !== 'string' || secret.length < 16) return false;
  if (typeof authorizationHeader !== 'string') return false;
  return safeEqual(authorizationHeader, `Bearer ${secret}`);
}

export function isValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.LOTTERY_BOT_GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server is not configured' });
  }

  const dryRun = req.query.dryRun === 'true';
  const monthOverride = req.query.month;
  if (monthOverride !== undefined && !isValidMonth(monthOverride)) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' });
  }
  const month = monthOverride || currentYyyyMm();
  const summary = {};

  for (const gameKey of Object.keys(GAME_ENDPOINTS)) {
    const { historyFile } = GAME_ENDPOINTS[gameKey];
    try {
      const { records: fetched, skipped } = await fetchGameMonth(gameKey, month);
      const { content: existing, sha } = await getFile(historyFile);
      if (!Array.isArray(existing)) throw new Error('history file is not an array');

      const existingPeriods = new Set(existing.map((r) => r.period));
      const newRecords = fetched.filter((r) => !existingPeriods.has(r.period));

      if (newRecords.length === 0) {
        summary[gameKey] = { added: 0, skipped };
        continue;
      }

      // Preserve the descending-by-period order the prediction/hot-cold
      // algorithms rely on (index 0 = most recent draw).
      const merged = [...newRecords, ...existing].sort(
        (a, b) => Number(b.period) - Number(a.period)
      );
      const latest = [...newRecords].sort((a, b) => Number(b.period) - Number(a.period))[0];

      summary[gameKey] = {
        added: newRecords.length,
        periods: newRecords.map((r) => r.period),
        skipped,
        dryRun,
      };

      if (!dryRun) {
        await putFile(
          historyFile,
          merged,
          sha,
          `chore: auto-update ${gameKey} data to ${latest.period} (${latest.date})`
        );
      }
    } catch (err) {
      // Full detail goes to the server log. The response only gets a short
      // message, so upstream error bodies are never echoed back.
      console.error(`${gameKey} update failed`, err);
      summary[gameKey] = { error: String(err?.message || 'update failed').slice(0, 120) };
    }
  }

  return res.status(200).json({ ok: true, month, summary });
}
