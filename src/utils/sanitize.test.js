import { describe, it, expect } from 'vitest';
import { sanitizeVault, sanitizeVaultItem, sanitizeDrawEntries, LIMITS } from './sanitize';

const goodPick = {
    id: 1,
    date: '2026-11-17T04:00:00.000Z',
    period: '115000106',
    numbers: [1, 2, 3, 4, 5, 6],
    type: 'Standard',
    gameID: 'LOTTO649',
    specialNumber: null,
};

describe('sanitizeVaultItem', () => {
    it('keeps a normal pick unchanged', () => {
        expect(sanitizeVaultItem(goodPick)).toEqual(goodPick);
    });

    it('keeps a fortune poem (text payload)', () => {
        const poem = sanitizeVaultItem({ id: 2, numbers: '第一籤\n日出便見風雲散', type: '雷雨師' });
        expect(poem.numbers).toBe('第一籤\n日出便見風雲散');
        expect(poem.type).toBe('雷雨師');
    });

    it('drops unknown fields', () => {
        const clean = sanitizeVaultItem({ ...goodPick, __proto__: { admin: true }, onClick: 'alert(1)', note: '<img src=x>' });
        expect(Object.keys(clean).sort()).toEqual(['date', 'gameID', 'id', 'numbers', 'period', 'specialNumber', 'type']);
        expect(clean.admin).toBeUndefined();
    });

    it.each([
        ['not an object', 'text'],
        ['null', null],
        ['an array', [1, 2, 3]],
        ['missing id', { numbers: [1, 2, 3] }],
        ['object id', { id: {}, numbers: [1, 2, 3] }],
        ['id with markup', { id: '<script>', numbers: [1, 2, 3] }],
        ['missing numbers', { id: 1 }],
        ['empty numbers', { id: 1, numbers: [] }],
        ['objects as numbers', { id: 1, numbers: [{ a: 1 }] }],
        ['strings as numbers', { id: 1, numbers: ['1', '2'] }],
        ['out of range numbers', { id: 1, numbers: [0, 5] }],
        ['huge numbers', { id: 1, numbers: [1, 1000] }],
        ['too many numbers', { id: 1, numbers: Array.from({ length: 50 }, (_, i) => i + 1) }],
        ['empty text', { id: 1, numbers: '' }],
    ])('rejects %s', (_label, value) => {
        expect(sanitizeVaultItem(value)).toBeNull();
    });

    it('repairs fields that have a safe default', () => {
        const clean = sanitizeVaultItem({ id: 5, numbers: [1, 2, 3], gameID: 'HACK', period: 'x', type: 42, date: 'nope' });
        expect(clean.gameID).toBe('LOTTO649');
        expect(clean.period).toBe('');
        expect(clean.type).toBe('Manual');
        expect(clean.date).toBe(new Date(0).toISOString());
    });

    it('truncates very long text', () => {
        const clean = sanitizeVaultItem({ id: 1, numbers: 'a'.repeat(LIMITS.maxTextLength + 500), type: 'b'.repeat(500) });
        expect(clean.numbers).toHaveLength(LIMITS.maxTextLength);
        expect(clean.type).toHaveLength(LIMITS.maxTypeLength);
    });

    it('keeps a complete verification and drops a malformed one', () => {
        const verification = {
            checked: true,
            hits: 2,
            matchedNumbers: [1, 2],
            specialHit: false,
            zoneTwoOnly: false,
            prizeKey: 'none',
            drawNumbers: [1, 2, 30, 31, 32, 33, 34],
            drawDate: '115/11/13',
            checkDate: '2026-11-17T04:00:00.000Z',
        };
        expect(sanitizeVaultItem({ ...goodPick, verification }).verification).toEqual(verification);
        expect(sanitizeVaultItem({ ...goodPick, verification: { checked: true, hits: 'many' } }).verification).toBeUndefined();
        expect(sanitizeVaultItem({ ...goodPick, verification: { checked: true, hits: 2, prize: 'Jackpot' } }).verification).toBeUndefined();
    });
});

describe('sanitizeVault', () => {
    it('returns null for anything that is not a list', () => {
        expect(sanitizeVault({ items: [] })).toBeNull();
        expect(sanitizeVault('[]')).toBeNull();
        expect(sanitizeVault(null)).toBeNull();
    });

    it('keeps valid items, counts rejected ones and removes duplicate ids', () => {
        const result = sanitizeVault([goodPick, { id: 1, numbers: [7, 8, 9] }, 'junk', { ...goodPick, id: 2 }]);
        expect(result.items.map((i) => i.id)).toEqual([1, 2]);
        expect(result.rejected).toBe(2);
    });

    it('caps the number of items', () => {
        const many = Array.from({ length: LIMITS.maxItems + 25 }, (_, i) => ({ ...goodPick, id: i + 1 }));
        const result = sanitizeVault(many);
        expect(result.items).toHaveLength(LIMITS.maxItems);
        expect(result.rejected).toBe(25);
    });
});

describe('sanitizeDrawEntries', () => {
    it('keeps valid draws and drops the rest', () => {
        const entries = sanitizeDrawEntries([
            { period: '115000200', date: '115/11/20', numbers: [1, 2, 3, 4, 5, 6, 7], gameID: 'SUPERLOTTO', extra: 'x' },
            { period: 115000201, date: '115/11/24', numbers: [1, 2, 3, 4, 5, 6, 7] },
            { period: 'abc', numbers: [1, 2, 3] },
            { period: '115000202', numbers: ['1'] },
            null,
        ]);
        expect(entries).toEqual([
            { period: '115000200', date: '115/11/20', numbers: [1, 2, 3, 4, 5, 6, 7], gameID: 'SUPERLOTTO' },
            { period: '115000201', date: '115/11/24', numbers: [1, 2, 3, 4, 5, 6, 7], gameID: 'LOTTO649' },
        ]);
    });

    it('returns an empty list for non-list input', () => {
        expect(sanitizeDrawEntries({})).toEqual([]);
    });
});
