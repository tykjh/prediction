// Data that comes from outside the code (a backup file the user imports, or
// whatever is sitting in localStorage) is rebuilt field by field before the
// app uses it. Unknown fields are dropped and wrong types are rejected, so a
// crafted or damaged file cannot crash the page or smuggle anything in.

const KNOWN_GAMES = ['LOTTO649', 'SUPERLOTTO', '539'];

export const LIMITS = {
    maxItems: 2000,
    maxNumbers: 10,
    maxNumberValue: 99,
    maxTextLength: 4000,
    maxTypeLength: 80,
    maxImportBytes: 2 * 1024 * 1024,
};

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const cleanString = (value, maxLength) => (typeof value === 'string' ? value.slice(0, maxLength) : '');

const cleanNumberList = (value) => {
    if (!Array.isArray(value) || value.length === 0 || value.length > LIMITS.maxNumbers) return null;
    const ok = value.every((n) => Number.isInteger(n) && n >= 1 && n <= LIMITS.maxNumberValue);
    return ok ? [...value] : null;
};

const cleanId = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && /^[\w-]{1,40}$/.test(value)) return value;
    return null;
};

const cleanDate = (value) => {
    if (typeof value !== 'string') return new Date(0).toISOString();
    const time = Date.parse(value);
    return Number.isNaN(time) ? new Date(0).toISOString() : new Date(time).toISOString();
};

const cleanVerification = (value) => {
    if (!isPlainObject(value) || value.checked !== true) return undefined;
    // Keep only the fields the app writes itself. Anything incomplete is
    // dropped, and the pick is simply checked again on load.
    if (typeof value.prizeKey !== 'string' || !/^[a-z0-9]{1,10}$/.test(value.prizeKey)) return undefined;
    if (!Number.isInteger(value.hits) || value.hits < 0 || value.hits > LIMITS.maxNumbers) return undefined;
    const matched = Array.isArray(value.matchedNumbers) && value.matchedNumbers.length === 0
        ? []
        : cleanNumberList(value.matchedNumbers);
    const drawn = cleanNumberList(value.drawNumbers);
    if (!matched || !drawn) return undefined;
    return {
        checked: true,
        hits: value.hits,
        matchedNumbers: matched,
        specialHit: value.specialHit === true,
        zoneTwoOnly: value.zoneTwoOnly === true,
        prizeKey: value.prizeKey,
        drawNumbers: drawn,
        drawDate: cleanString(value.drawDate, 12),
        checkDate: cleanDate(value.checkDate),
    };
};

// One saved pick (numbers) or one saved fortune poem (text).
export const sanitizeVaultItem = (item) => {
    if (!isPlainObject(item)) return null;
    const id = cleanId(item.id);
    if (id === null) return null;

    let numbers = null;
    if (typeof item.numbers === 'string') {
        numbers = item.numbers.slice(0, LIMITS.maxTextLength);
        if (numbers.length === 0) return null;
    } else {
        numbers = cleanNumberList(item.numbers);
        if (!numbers) return null;
    }

    const period = typeof item.period === 'string' && /^\d{9}$/.test(item.period) ? item.period : '';
    const special = Number.isInteger(item.specialNumber) && item.specialNumber >= 1 && item.specialNumber <= LIMITS.maxNumberValue
        ? item.specialNumber
        : null;

    const clean = {
        id,
        date: cleanDate(item.date),
        period,
        numbers,
        type: cleanString(item.type, LIMITS.maxTypeLength) || 'Manual',
        gameID: KNOWN_GAMES.includes(item.gameID) ? item.gameID : 'LOTTO649',
        specialNumber: special,
    };

    const verification = cleanVerification(item.verification);
    if (verification) clean.verification = verification;
    return clean;
};

/**
 * @returns { items, rejected } - valid items (ids unique) and how many were dropped.
 *          Returns null when the input is not a list at all.
 */
export const sanitizeVault = (data) => {
    if (!Array.isArray(data)) return null;
    const seen = new Set();
    const items = [];
    let rejected = 0;

    data.slice(0, LIMITS.maxItems).forEach((raw) => {
        const item = sanitizeVaultItem(raw);
        if (!item || seen.has(item.id)) {
            rejected += 1;
            return;
        }
        seen.add(item.id);
        items.push(item);
    });

    rejected += Math.max(0, data.length - LIMITS.maxItems);
    return { items, rejected };
};

// A draw the user typed in by hand.
export const sanitizeDrawEntry = (entry) => {
    if (!isPlainObject(entry)) return null;
    const period = typeof entry.period === 'number' ? String(entry.period) : entry.period;
    if (typeof period !== 'string' || !/^\d{9}$/.test(period)) return null;
    const numbers = cleanNumberList(entry.numbers);
    if (!numbers) return null;

    return {
        period,
        date: cleanString(entry.date, 12) || '-',
        numbers,
        gameID: KNOWN_GAMES.includes(entry.gameID) ? entry.gameID : 'LOTTO649',
    };
};

export const sanitizeDrawEntries = (data) => {
    if (!Array.isArray(data)) return [];
    return data.slice(0, LIMITS.maxItems).map(sanitizeDrawEntry).filter(Boolean);
};
