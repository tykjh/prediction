export const getSecureRandomNumber = (min, max) => {
    // Uses crypto.getRandomValues for better entropy than Math.random()
    const range = max - min + 1;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return min + (array[0] % range);
};

export const getSecureRandomSet = (count = 6, min = 1, max = 49) => {
    const set = new Set();
    while (set.size < count) {
        set.add(getSecureRandomNumber(min, max));
    }
    return Array.from(set).sort((a, b) => a - b);
};
