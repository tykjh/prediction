import { describe, it, expect, vi, afterEach } from 'vitest';
import handler, { isAuthorized, isValidMonth } from '../update-lottery.js';
import { isValidRecord, isoToRocDate, GAME_ENDPOINTS } from '../_lib/taiwanLotteryApi.js';

const SECRET = 'a-long-enough-secret-value';

const createRes = () => {
    const res = { statusCode: 200, headers: {}, body: undefined };
    res.setHeader = (name, value) => { res.headers[name] = value; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('isAuthorized', () => {
    it('accepts the exact bearer secret', () => {
        expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    });

    it.each([
        ['wrong secret', `Bearer ${SECRET}x`],
        ['no scheme', SECRET],
        ['missing header', undefined],
        ['array header', [`Bearer ${SECRET}`]],
    ])('rejects %s', (_label, header) => {
        expect(isAuthorized(header, SECRET)).toBe(false);
    });

    it('rejects everything when the secret is not configured', () => {
        expect(isAuthorized('Bearer undefined', undefined)).toBe(false);
        expect(isAuthorized('Bearer ', '')).toBe(false);
        expect(isAuthorized('Bearer short', 'short')).toBe(false);
    });
});

describe('isValidMonth', () => {
    it('accepts YYYY-MM only', () => {
        expect(isValidMonth('2026-11')).toBe(true);
        expect(isValidMonth('2026-13')).toBe(false);
        expect(isValidMonth('2026-00')).toBe(false);
        expect(isValidMonth('2026-11&x=1')).toBe(false);
        expect(isValidMonth(['2026-11'])).toBe(false);
    });
});

describe('handler', () => {
    it('refuses requests when CRON_SECRET is unset, even with "Bearer undefined"', async () => {
        vi.stubEnv('CRON_SECRET', '');
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const res = createRes();
        await handler({ method: 'GET', headers: { authorization: 'Bearer undefined' }, query: {} }, res);

        expect(res.statusCode).toBe(401);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('refuses non-GET methods', async () => {
        vi.stubEnv('CRON_SECRET', SECRET);
        const res = createRes();
        await handler({ method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, query: {} }, res);
        expect(res.statusCode).toBe(405);
    });

    it('rejects a malformed month before calling anything', async () => {
        vi.stubEnv('CRON_SECRET', SECRET);
        vi.stubEnv('LOTTERY_BOT_GITHUB_TOKEN', 'token');
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const res = createRes();
        await handler({ method: 'GET', headers: { authorization: `Bearer ${SECRET}` }, query: { month: '2026-11/../x' } }, res);

        expect(res.statusCode).toBe(400);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not write in dry-run mode and does not echo upstream error bodies', async () => {
        vi.stubEnv('CRON_SECRET', SECRET);
        vi.stubEnv('LOTTERY_BOT_GITHUB_TOKEN', 'token');
        const calls = [];
        vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
            calls.push({ url: String(url), method: options.method || 'GET' });
            if (String(url).includes('taiwanlottery')) {
                return { ok: false, status: 503, json: async () => ({}), text: async () => 'SECRET INTERNAL DETAIL' };
            }
            return { ok: true, status: 200, json: async () => ({ content: Buffer.from('[]').toString('base64'), sha: 'x' }) };
        }));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = createRes();
        await handler({ method: 'GET', headers: { authorization: `Bearer ${SECRET}` }, query: { dryRun: 'true' } }, res);

        expect(res.statusCode).toBe(200);
        expect(calls.every((c) => c.method === 'GET')).toBe(true);
        expect(JSON.stringify(res.body)).not.toContain('SECRET INTERNAL DETAIL');
    });
});

describe('isValidRecord', () => {
    const lotto = GAME_ENDPOINTS.LOTTO649;
    const superLotto = GAME_ENDPOINTS.SUPERLOTTO;
    const daily = GAME_ENDPOINTS['539'];
    const base = { period: '115000106', date: '115/11/17' };

    it('accepts well-formed draws', () => {
        expect(isValidRecord({ ...base, numbers: [1, 2, 3, 4, 5, 49, 7] }, lotto)).toBe(true);
        expect(isValidRecord({ ...base, numbers: [1, 2, 3, 4, 5, 38, 8] }, superLotto)).toBe(true);
        expect(isValidRecord({ ...base, numbers: [1, 2, 3, 4, 39] }, daily)).toBe(true);
    });

    it.each([
        ['number above the pool', { ...base, numbers: [1, 2, 3, 4, 5, 50, 7] }, lotto],
        ['zone 2 above 8', { ...base, numbers: [1, 2, 3, 4, 5, 6, 9] }, superLotto],
        ['duplicate main numbers', { ...base, numbers: [1, 1, 3, 4, 5, 6, 7] }, lotto],
        ['wrong count', { ...base, numbers: [1, 2, 3, 4, 5, 6] }, lotto],
        ['non-integer', { ...base, numbers: [1, 2, 3, 4, '5'] }, daily],
        ['bad period', { ...base, period: '11500010', numbers: [1, 2, 3, 4, 5] }, daily],
        ['markup in date', { ...base, date: '<b>115/11/17</b>', numbers: [1, 2, 3, 4, 5] }, daily],
        ['missing date', { period: base.period, date: null, numbers: [1, 2, 3, 4, 5] }, daily],
    ])('rejects %s', (_label, record, rules) => {
        expect(isValidRecord(record, rules)).toBe(false);
    });
});

describe('isoToRocDate', () => {
    it('converts to the ROC calendar', () => {
        expect(isoToRocDate('2026-11-17T00:00:00')).toBe('115/11/17');
        expect(isoToRocDate(undefined)).toBeNull();
    });
});
