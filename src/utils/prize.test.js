import { describe, it, expect } from 'vitest';
import { checkTicket, checkVault, summarizeByMethod, isCheckable } from './prize';
import { GAME_TYPES } from '../config/games';

const lotto = GAME_TYPES.LOTTO649;
const superLotto = GAME_TYPES.SUPERLOTTO;
const jinCai = GAME_TYPES['539'];

describe('checkTicket - Lotto 6/49', () => {
    const draw = { numbers: [1, 2, 3, 4, 5, 6, 7] }; // 7 = special

    it.each([
        [[1, 2, 3, 4, 5, 6], 'jackpot'],
        [[1, 2, 3, 4, 5, 7], 'p2'],
        [[1, 2, 3, 4, 5, 40], 'p3'],
        [[1, 2, 3, 4, 7, 40], 'p4'],
        [[1, 2, 3, 4, 40, 41], 'p5'],
        [[1, 2, 3, 7, 40, 41], 'p6'],
        [[1, 2, 7, 40, 41, 42], 'p7'],
        [[1, 2, 3, 40, 41, 42], 'general'],
        [[1, 2, 40, 41, 42, 43], 'none'],
        [[7, 40, 41, 42, 43, 44], 'none'],
    ])('%j -> %s', (numbers, prizeKey) => {
        expect(checkTicket({ numbers }, draw, lotto).prizeKey).toBe(prizeKey);
    });

    it('reports which numbers matched', () => {
        const result = checkTicket({ numbers: [1, 2, 3, 40, 41, 42] }, draw, lotto);
        expect(result.hits).toBe(3);
        expect(result.matchedNumbers).toEqual([1, 2, 3]);
        expect(result.specialHit).toBe(false);
    });

    it('ignores a 7th predicted number when counting hits', () => {
        const result = checkTicket({ numbers: [10, 11, 12, 13, 14, 15, 1] }, draw, lotto);
        expect(result.hits).toBe(0);
        expect(result.prizeKey).toBe('none');
    });
});

describe('checkTicket - Super Lotto', () => {
    const draw = { numbers: [1, 2, 3, 4, 5, 6, 8] }; // 8 = zone 2

    it.each([
        [[1, 2, 3, 4, 5, 6], 8, 'jackpot'],
        [[1, 2, 3, 4, 5, 6], 1, 'p2'],
        [[1, 2, 3, 4, 5, 30], 8, 'p3'],
        [[1, 2, 3, 4, 5, 30], 1, 'p4'],
        [[1, 2, 3, 4, 30, 31], 8, 'p5'],
        [[1, 2, 3, 4, 30, 31], 1, 'p6'],
        [[1, 2, 3, 30, 31, 32], 8, 'p7'],
        [[1, 2, 30, 31, 32, 33], 8, 'p8'],
        [[1, 2, 3, 30, 31, 32], 1, 'p9'],
        [[1, 30, 31, 32, 33, 34], 8, 'general'],
        [[1, 2, 30, 31, 32, 33], 1, 'none'],
        [[30, 31, 32, 33, 34, 35], 8, 'none'],
    ])('%j + zone2 %i -> %s', (numbers, specialNumber, prizeKey) => {
        expect(checkTicket({ numbers, specialNumber }, draw, superLotto).prizeKey).toBe(prizeKey);
    });

    it('reads the zone-2 pick from the 7th number when no specialNumber is stored', () => {
        const result = checkTicket({ numbers: [1, 2, 3, 30, 31, 32, 8] }, draw, superLotto);
        expect(result.specialHit).toBe(true);
        expect(result.prizeKey).toBe('p7');
    });

    it('treats a ticket without a zone-2 pick as a zone-2 miss', () => {
        const result = checkTicket({ numbers: [1, 2, 3, 4, 5, 6], specialNumber: null }, draw, superLotto);
        expect(result.specialHit).toBe(false);
        expect(result.prizeKey).toBe('p2');
    });

    it('handles zone-2 lab guesses as a single-number check', () => {
        const hit = checkTicket({ numbers: [8], type: 'Zone 2 Markov' }, draw, superLotto);
        expect(hit.zoneTwoOnly).toBe(true);
        expect(hit.specialHit).toBe(true);
        expect(hit.prizeKey).toBe('none');

        const miss = checkTicket({ numbers: [1], type: 'Zone 2 k-NN' }, draw, superLotto);
        expect(miss.specialHit).toBe(false);
    });
});

describe('checkTicket - Jin Cai 539', () => {
    const draw = { numbers: [1, 2, 3, 4, 5] };

    it.each([
        [[1, 2, 3, 4, 5], 'jackpot'],
        [[1, 2, 3, 4, 30], 'p2'],
        [[1, 2, 3, 30, 31], 'p3'],
        [[1, 2, 30, 31, 32], 'p4'],
        [[1, 30, 31, 32, 33], 'none'],
    ])('%j -> %s', (numbers, prizeKey) => {
        expect(checkTicket({ numbers }, draw, jinCai).prizeKey).toBe(prizeKey);
    });
});

describe('checkVault', () => {
    const historyByGame = {
        LOTTO649: [{ period: '115000010', date: '115/02/01', numbers: [1, 2, 3, 4, 5, 6, 7] }],
        SUPERLOTTO: [{ period: '115000020', date: '115/02/02', numbers: [1, 2, 3, 4, 5, 6, 8] }],
        539: [{ period: '115000030', date: '115/02/03', numbers: [1, 2, 3, 4, 5] }],
    };

    it('checks every game in one pass and counts winners', () => {
        const predictions = [
            { id: 1, gameID: 'LOTTO649', period: '115000010', numbers: [1, 2, 3, 40, 41, 42] },
            { id: 2, gameID: 'SUPERLOTTO', period: '115000020', numbers: [30, 31, 32, 33, 34, 35] },
            { id: 3, gameID: '539', period: '115000030', numbers: [1, 2, 3, 4, 5] },
        ];
        const result = checkVault(predictions, historyByGame, GAME_TYPES);
        expect(result.newlyChecked).toBe(3);
        expect(result.winners).toBe(2);
        expect(result.predictions[0].verification.prizeKey).toBe('general');
        expect(result.predictions[0].verification.drawNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(result.predictions[2].verification.prizeKey).toBe('jackpot');
    });

    it('leaves predictions alone when their draw has not happened', () => {
        const predictions = [{ id: 1, gameID: 'LOTTO649', period: '115000011', numbers: [1, 2, 3, 4, 5, 6] }];
        const result = checkVault(predictions, historyByGame, GAME_TYPES);
        expect(result.newlyChecked).toBe(0);
        expect(result.predictions[0]).toBe(predictions[0]);
    });

    it('skips fortune poems and other non-number entries', () => {
        const predictions = [{ id: 1, gameID: 'LOTTO649', period: '115000010', numbers: 'a poem', type: '雷雨師' }];
        const result = checkVault(predictions, historyByGame, GAME_TYPES);
        expect(result.newlyChecked).toBe(0);
        expect(isCheckable(predictions[0])).toBe(false);
    });

    it('assumes Lotto 6/49 for old entries without a gameID', () => {
        const predictions = [{ id: 1, period: '115000010', numbers: [1, 2, 3, 4, 5, 6] }];
        const result = checkVault(predictions, historyByGame, GAME_TYPES);
        expect(result.predictions[0].verification.prizeKey).toBe('jackpot');
    });

    it('re-checks results stored by older versions (no prizeKey)', () => {
        const legacy = { id: 1, gameID: '539', period: '115000030', numbers: [1, 2, 3, 4, 5], verification: { checked: true, hits: 5, prize: 'Jackpot' } };
        const result = checkVault([legacy], historyByGame, GAME_TYPES, { onlyUnchecked: true });
        expect(result.newlyChecked).toBe(1);
        expect(result.predictions[0].verification.prizeKey).toBe('jackpot');
    });

    it('can skip entries that were already checked', () => {
        const checked = { id: 1, gameID: '539', period: '115000030', numbers: [1, 2, 3, 4, 5], verification: { checked: true, prizeKey: 'none' } };
        const result = checkVault([checked], historyByGame, GAME_TYPES, { onlyUnchecked: true });
        expect(result.newlyChecked).toBe(0);
        expect(result.predictions[0]).toBe(checked);
    });
});

describe('summarizeByMethod', () => {
    it('averages hits per game and method, best first', () => {
        const predictions = [
            { gameID: '539', type: 'Standard', verification: { checked: true, hits: 1, prizeKey: 'none' } },
            { gameID: '539', type: 'Standard', verification: { checked: true, hits: 3, prizeKey: 'p3' } },
            { gameID: '539', type: 'Weighted', verification: { checked: true, hits: 0, prizeKey: 'none' } },
            { gameID: '539', type: 'Weighted' },
            { gameID: 'SUPERLOTTO', type: 'Zone 2 Markov', verification: { checked: true, hits: 0, zoneTwoOnly: true } },
        ];
        const rows = summarizeByMethod(predictions);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ type: 'Standard', checked: 2, avgHits: 2, bestHits: 3, wins: 1 });
        expect(rows[1]).toMatchObject({ type: 'Weighted', checked: 1, avgHits: 0, wins: 0 });
    });
});
