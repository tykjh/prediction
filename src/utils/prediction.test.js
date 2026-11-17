import { describe, it, expect } from 'vitest';
import { calculatePrediction, calculateHybridPrediction } from './prediction';
import { GAME_TYPES } from '../config/games';
import history649 from '../data/history.json';
import historySuper from '../data/history_superlotto.json';
import history539 from '../data/history_539.json';

const cases = [
    ['LOTTO649', history649],
    ['SUPERLOTTO', historySuper],
    ['539', history539],
];

const expectValidPick = (numbers, settings) => {
    const main = numbers.slice(0, settings.pickCount);
    expect(main).toHaveLength(settings.pickCount);
    expect(new Set(main).size).toBe(settings.pickCount);
    main.forEach((n) => {
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(settings.maxNumber);
    });
};

describe.each(cases)('prediction engines - %s', (gameID, history) => {
    const { settings } = GAME_TYPES[gameID];

    it('standard and weighted picks are valid tickets', () => {
        const result = calculatePrediction(history.slice(0, 100), true, settings);
        expectValidPick(result.standard, settings);
        expectValidPick(result.weighted, settings);
    });

    it('still works with very little history', () => {
        const result = calculatePrediction(history.slice(0, 3), false, settings);
        expectValidPick(result.standard, settings);
        expectValidPick(result.weighted, settings);
    });

    it('hybrid pick is a valid ticket', () => {
        const result = calculateHybridPrediction(
            history.slice(0, 200),
            history,
            { includeSpecial: true, hotCount: 10, coldCount: 10, trendDepth: 20 },
            settings,
        );
        expectValidPick(result.numbers, settings);
    });
});

describe('calculatePrediction', () => {
    it('returns empty picks when there is no history', () => {
        expect(calculatePrediction([], true, GAME_TYPES.LOTTO649.settings)).toEqual({ standard: [], weighted: [] });
    });
});

describe('bundled draw history', () => {
    it.each(cases)('%s is well formed and newest first', (gameID, history) => {
        const { settings } = GAME_TYPES[gameID];
        const expectedLength = settings.pickCount + (settings.specialNumber.enabled ? 1 : 0);
        expect(history.length).toBeGreaterThan(0);

        history.forEach((draw, index) => {
            expect(draw.period).toMatch(/^\d{9}$/);
            expect(draw.numbers).toHaveLength(expectedLength);
            if (index > 0) {
                expect(Number(history[index - 1].period)).toBeGreaterThan(Number(draw.period));
            }
        });
    });
});
