import { describe, it, expect, beforeEach } from 'vitest';
import { loadJSON, saveJSON, loadArray, loadObject } from './storage';

// Minimal in-memory localStorage so the helpers can run under Node.
const createStorage = () => {
    const data = new Map();
    return {
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key),
    };
};

beforeEach(() => {
    globalThis.localStorage = createStorage();
});

describe('storage helpers', () => {
    it('round-trips values', () => {
        expect(saveJSON('k', { a: 1 })).toBe(true);
        expect(loadJSON('k', null)).toEqual({ a: 1 });
    });

    it('falls back when the key is missing', () => {
        expect(loadJSON('missing', 'fallback')).toBe('fallback');
    });

    it('falls back instead of throwing on corrupted JSON', () => {
        localStorage.setItem('k', '{not json');
        expect(loadJSON('k', 'fallback')).toBe('fallback');
        expect(loadArray('k')).toEqual([]);
    });

    it('falls back when storage itself throws', () => {
        globalThis.localStorage = {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
        };
        expect(loadJSON('k', 1)).toBe(1);
        expect(saveJSON('k', 1)).toBe(false);
    });

    it('loadArray rejects non-array values', () => {
        saveJSON('k', { a: 1 });
        expect(loadArray('k')).toEqual([]);
    });

    it('loadObject merges stored values over defaults', () => {
        saveJSON('k', { sound: true });
        expect(loadObject('k', { sound: false, motion: false })).toEqual({ sound: true, motion: false });
    });

    it('loadObject ignores non-object values', () => {
        saveJSON('k', [1, 2]);
        expect(loadObject('k', { sound: false })).toEqual({ sound: false });
    });
});
