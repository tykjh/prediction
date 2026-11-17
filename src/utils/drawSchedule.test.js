import { describe, it, expect } from 'vitest';
import { nextPeriodOf, nextDrawDate, daysUntil, rocYearOf, taipeiDateParts } from './drawSchedule';

// 2026-11-17 is a Tuesday. Times below are written in UTC; Taipei is UTC+8.
const tuesdayNoon = new Date('2026-11-17T04:00:00Z'); // Tue 12:00 Taipei
const tuesdayLate = new Date('2026-11-17T13:00:00Z'); // Tue 21:00 Taipei

describe('nextPeriodOf', () => {
    it('adds one within the same year', () => {
        expect(nextPeriodOf('115000105', tuesdayNoon)).toBe('115000106');
    });

    it('keeps the zero padding', () => {
        expect(nextPeriodOf('115000009', tuesdayNoon)).toBe('115000010');
    });

    it('restarts at 000001 after new year', () => {
        expect(nextPeriodOf('115000310', new Date('2027-01-02T04:00:00Z'))).toBe('116000001');
    });

    it('uses Taipei time for the year boundary', () => {
        // 2026-12-31 17:00 UTC is already 2027-01-01 01:00 in Taipei.
        expect(nextPeriodOf('115000310', new Date('2026-12-31T17:00:00Z'))).toBe('116000001');
    });

    it('returns an empty string for malformed periods', () => {
        expect(nextPeriodOf('abc', tuesdayNoon)).toBe('');
        expect(nextPeriodOf(undefined, tuesdayNoon)).toBe('');
    });
});

describe('rocYearOf', () => {
    it('converts to the ROC calendar', () => {
        expect(rocYearOf(tuesdayNoon)).toBe(115);
    });
});

describe('nextDrawDate', () => {
    it('returns today when the draw is still ahead', () => {
        const next = nextDrawDate([2, 5], tuesdayNoon);
        expect(taipeiDateParts(next)).toEqual({ weekday: 2, month: 11, day: 17 });
        expect(daysUntil(next, tuesdayNoon)).toBe(0);
    });

    it('moves to the next draw day once tonight\'s draw has passed', () => {
        const next = nextDrawDate([2, 5], tuesdayLate);
        expect(taipeiDateParts(next)).toEqual({ weekday: 5, month: 11, day: 20 });
        expect(daysUntil(next, tuesdayLate)).toBe(3);
    });

    it('skips Sunday for a Monday-to-Saturday game', () => {
        const saturdayLate = new Date('2026-11-21T13:00:00Z'); // Sat 21:00 Taipei
        const next = nextDrawDate([1, 2, 3, 4, 5, 6], saturdayLate);
        expect(taipeiDateParts(next)).toEqual({ weekday: 1, month: 11, day: 23 });
    });

    it('returns null without a schedule', () => {
        expect(nextDrawDate([], tuesdayNoon)).toBeNull();
        expect(nextDrawDate(undefined, tuesdayNoon)).toBeNull();
    });
});
