// Ticket checking for the three Taiwan Lottery games.
//
// Prize ranks are returned as language-neutral keys ('jackpot', 'p2' ... 'p9',
// 'general', 'none') and translated by the UI.

export const PRIZE_NONE = 'none';

const lotto649Prize = (hits, specialHit) => {
    if (hits === 6) return 'jackpot';
    if (hits === 5) return specialHit ? 'p2' : 'p3';
    if (hits === 4) return specialHit ? 'p4' : 'p5';
    if (hits === 3) return specialHit ? 'p6' : 'general';
    if (hits === 2 && specialHit) return 'p7';
    return PRIZE_NONE;
};

const superLottoPrize = (hits, zoneTwoHit) => {
    if (hits === 6) return zoneTwoHit ? 'jackpot' : 'p2';
    if (hits === 5) return zoneTwoHit ? 'p3' : 'p4';
    if (hits === 4) return zoneTwoHit ? 'p5' : 'p6';
    if (hits === 3) return zoneTwoHit ? 'p7' : 'p9';
    if (hits === 2 && zoneTwoHit) return 'p8';
    if (hits === 1 && zoneTwoHit) return 'general';
    return PRIZE_NONE;
};

const jinCai539Prize = (hits) => {
    if (hits === 5) return 'jackpot';
    if (hits === 4) return 'p2';
    if (hits === 3) return 'p3';
    if (hits === 2) return 'p4';
    return PRIZE_NONE;
};

const isZoneTwoOnly = (prediction) =>
    typeof prediction.type === 'string' && prediction.type.startsWith('Zone 2');

// Can this saved item be checked against a draw at all? Fortune poems are
// stored in the same list with a text payload instead of numbers.
export const isCheckable = (prediction) =>
    !!prediction && Array.isArray(prediction.numbers) && prediction.numbers.length > 0 && !!prediction.period;

/**
 * Compare one saved prediction with the draw of its period.
 * @param prediction { numbers, specialNumber?, type? }
 * @param draw       { numbers } - main numbers first, then the special / zone-2 number
 * @param gameConfig entry of GAME_TYPES
 */
export const checkTicket = (prediction, draw, gameConfig) => {
    const { pickCount, specialNumber } = gameConfig.settings;
    const drawnMain = draw.numbers.slice(0, pickCount);
    const drawnSpecial = specialNumber.enabled ? draw.numbers[pickCount] : undefined;

    // Zone-2 lab results are a single second-zone guess, not a full ticket.
    if (gameConfig.id === 'SUPERLOTTO' && isZoneTwoOnly(prediction)) {
        const guess = prediction.numbers[0];
        const hit = guess === drawnSpecial;
        return {
            hits: 0,
            matchedNumbers: [],
            specialHit: hit,
            zoneTwoOnly: true,
            prizeKey: PRIZE_NONE,
        };
    }

    const main = prediction.numbers.slice(0, pickCount);
    const matchedNumbers = main.filter((n) => drawnMain.includes(n));
    const hits = matchedNumbers.length;

    let specialHit = false;
    let prizeKey = PRIZE_NONE;

    if (gameConfig.id === 'LOTTO649') {
        // The special number is drawn from the same pool, so it counts when
        // one of the ticket's own numbers equals it.
        specialHit = drawnSpecial !== undefined && main.includes(drawnSpecial);
        prizeKey = lotto649Prize(hits, specialHit);
    } else if (gameConfig.id === 'SUPERLOTTO') {
        const zoneTwoPick = prediction.specialNumber ?? prediction.numbers[pickCount];
        specialHit = zoneTwoPick !== undefined && zoneTwoPick !== null && zoneTwoPick === drawnSpecial;
        prizeKey = superLottoPrize(hits, specialHit);
    } else if (gameConfig.id === '539') {
        prizeKey = jinCai539Prize(hits);
    }

    return { hits, matchedNumbers, specialHit, zoneTwoOnly: false, prizeKey };
};

/**
 * Check every saved prediction whose draw is already known.
 * @param predictions     saved vault items
 * @param historyByGame   { [gameID]: draws[] }
 * @param gameTypes       GAME_TYPES
 * @param options.onlyUnchecked  skip items that already carry a verification
 * @returns { predictions, newlyChecked, winners }
 */
export const checkVault = (predictions, historyByGame, gameTypes, { onlyUnchecked = false } = {}) => {
    const drawIndex = {};
    Object.keys(historyByGame).forEach((gameID) => {
        const map = new Map();
        (historyByGame[gameID] || []).forEach((draw) => map.set(String(draw.period), draw));
        drawIndex[gameID] = map;
    });

    let newlyChecked = 0;
    let winners = 0;

    const next = predictions.map((prediction) => {
        if (!isCheckable(prediction)) return prediction;
        // Results saved by older versions have no prizeKey and are checked again.
        if (onlyUnchecked && prediction.verification?.checked && prediction.verification.prizeKey) return prediction;

        const gameID = prediction.gameID || 'LOTTO649';
        const gameConfig = gameTypes[gameID];
        const draw = drawIndex[gameID]?.get(String(prediction.period));
        if (!gameConfig || !draw) return prediction;

        const result = checkTicket(prediction, draw, gameConfig);
        newlyChecked += 1;
        if (result.prizeKey !== PRIZE_NONE) winners += 1;

        return {
            ...prediction,
            verification: {
                checked: true,
                ...result,
                drawNumbers: draw.numbers,
                drawDate: draw.date,
                checkDate: prediction.verification?.checkDate || new Date().toISOString(),
            },
        };
    });

    return { predictions: next, newlyChecked, winners };
};

/**
 * Per-method scoreboard built from checked predictions.
 * @returns [{ type, checked, avgHits, bestHits, wins }] sorted by average hits
 */
export const summarizeByMethod = (predictions) => {
    const byType = new Map();
    predictions.forEach((p) => {
        const v = p.verification;
        if (!v?.checked || v.zoneTwoOnly || typeof v.hits !== 'number') return;
        const key = `${p.gameID || 'LOTTO649'}|${p.type || 'Manual'}`;
        const row = byType.get(key) || {
            gameID: p.gameID || 'LOTTO649',
            type: p.type || 'Manual',
            checked: 0,
            totalHits: 0,
            bestHits: 0,
            wins: 0,
        };
        row.checked += 1;
        row.totalHits += v.hits;
        row.bestHits = Math.max(row.bestHits, v.hits);
        if (v.prizeKey && v.prizeKey !== PRIZE_NONE) row.wins += 1;
        byType.set(key, row);
    });

    return Array.from(byType.values())
        .map((row) => ({ ...row, avgHits: row.totalHits / row.checked }))
        .sort((a, b) => b.avgHits - a.avgHits || b.checked - a.checked);
};
