import { GAME_ENDPOINTS, fetchGameMonth } from './_lib/taiwanLotteryApi.js';
import { getFile, putFile } from './_lib/githubContents.js';

function currentYyyyMm() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query.dryRun === 'true';
  const monthOverride = req.query.month;
  if (monthOverride && !/^\d{4}-\d{2}$/.test(monthOverride)) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' });
  }
  const month = monthOverride || currentYyyyMm();
  const summary = {};

  for (const gameKey of Object.keys(GAME_ENDPOINTS)) {
    const { historyFile } = GAME_ENDPOINTS[gameKey];
    try {
      const fetched = await fetchGameMonth(gameKey, month);
      const { content: existing, sha } = await getFile(historyFile);

      const existingPeriods = new Set(existing.map((r) => r.period));
      const newRecords = fetched.filter((r) => !existingPeriods.has(r.period));

      if (newRecords.length === 0) {
        summary[gameKey] = { added: 0 };
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
      summary[gameKey] = { error: err.message };
    }
  }

  return res.status(200).json({ ok: true, month, summary });
}
