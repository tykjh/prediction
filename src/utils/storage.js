// Safe localStorage helpers. A corrupted value or a blocked storage must
// never take the whole app down, so every read falls back to a default.

export const loadJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        const parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch {
        return fallback;
    }
};

export const saveJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
};

// Like loadJSON, but guarantees an array comes back.
export const loadArray = (key) => {
    const value = loadJSON(key, []);
    return Array.isArray(value) ? value : [];
};

// Like loadJSON, but merges the stored object over the defaults so newly
// added settings get their default value for existing users.
export const loadObject = (key, defaults) => {
    const value = loadJSON(key, null);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults };
    return { ...defaults, ...value };
};
