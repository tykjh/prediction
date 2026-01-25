// Helper to get weight based on recency (0-indexed index)
import { getSecureRandomNumber } from './secureRandom';

const getWeight = (index, strategy = 'standard') => {
    if (strategy === 'aggressive') {
        // Fast decay: Recent draws matter much more
        if (index < 5) return 20;
        if (index < 10) return 10;
        if (index < 20) return 5;
        if (index < 30) return 2;
        return 0.1;
    } else if (strategy === 'flat') {
        // Slow decay: History matters more evenly
        if (index < 20) return 5;
        if (index < 50) return 4;
        if (index < 100) return 3;
        return 2;
    } else {
        // Standard (Original)
        if (index < 10) return 10;
        if (index < 20) return 7;
        if (index < 30) return 4;
        if (index < 50) return 3;
        if (index < 80) return 2;
        if (index < 150) return 1;
        return 0.5;
    }
};

const fillPrediction = (predictionSet, maxNumber, count) => {
    while (predictionSet.size < count) {
        const randomNum = getSecureRandomNumber(1, maxNumber);
        predictionSet.add(randomNum);
    }
    return Array.from(predictionSet).sort((a, b) => a - b);
};

// Config Structure Expected:
// { maxNumber: 49, pickCount: 6, specialNumber: { enabled: true, isSeparate: false } }

export const calculatePrediction = (fullHistory, includeSpecial = true, gameConfig) => {
    if (!fullHistory || fullHistory.length === 0) return { standard: [], weighted: [] };

    // Default to Lotto 6/49 if no config provided (Backward Compatibility)
    const MAX = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;
    const IS_SEPARATE_SPECIAL = gameConfig?.specialNumber?.isSeparate || false;

    const standardScores = Array(MAX).fill(0);
    const weightedScores = Array(MAX).fill(0);

    fullHistory.forEach((draw, index) => {
        const recencyWeight = getWeight(index, 'standard');

        // Regular Numbers (0 to PICK-1)
        draw.numbers.slice(0, PICK).forEach(num => {
            if (num >= 1 && num <= MAX) {
                standardScores[num - 1] += 1;
                weightedScores[num - 1] += recencyWeight;
            }
        });

        // Special Number Handling
        // logic: if it IS separate (like Super Lotto), it should NOT influence the main number scores.
        // if it IS NOT separate (like Lotto 6/49), it IS part of the same pool, so it adds to the score.
        if (includeSpecial && !IS_SEPARATE_SPECIAL && draw.numbers[PICK]) {
            const spNum = draw.numbers[PICK]; // draw.numbers[6] for 6/49
            if (spNum >= 1 && spNum <= MAX) {
                standardScores[spNum - 1] += 1;
                weightedScores[spNum - 1] += (recencyWeight * 0.5);
            }
        }
    });

    // Generate Standard
    const standardSorted = standardScores
        .map((score, i) => ({ num: i + 1, score }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.num);

    const standardSet = new Set(standardSorted.slice(0, PICK));

    // Generate Weighted
    const weightedSorted = weightedScores
        .map((score, i) => ({ num: i + 1, score }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.num);

    const weightedSet = new Set(weightedSorted.slice(0, PICK));

    return {
        standard: fillPrediction(standardSet, MAX, PICK),
        weighted: fillPrediction(weightedSet, MAX, PICK)
    };
};

export const calculateHybridPrediction = (targetHistory, fullHistory, config = {}, gameConfig) => {
    const {
        includeSpecial = true,
        hotCount = 10,
        coldCount = 10,
        trendDepth = 10,
        weightStrategy = 'standard'
    } = config;

    const MAX = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;
    const IS_SEPARATE_SPECIAL = gameConfig?.specialNumber?.isSeparate || false;

    if (!targetHistory || targetHistory.length < 10) return { numbers: [], stats: {} };
    if (!fullHistory || fullHistory.length < 10) fullHistory = targetHistory;

    const nHot = Number(hotCount) || 10;
    const nCold = Number(coldCount) || 10;
    const nTrend = Number(trendDepth) || 10;

    // --- Trend Analysis (Rolling Context) ---
    const recentDraws = fullHistory.slice(0, nTrend);
    let totalHotHits = 0;
    let totalColdHits = 0;
    let totalNeutralHits = 0;

    recentDraws.forEach((draw, i) => {
        const priorHistory = fullHistory.slice(i + 1);
        const tempScores = Array(MAX).fill(0);

        priorHistory.forEach((hDraw, hIndex) => {
            const w = getWeight(hIndex, weightStrategy);
            hDraw.numbers.slice(0, PICK).forEach(num => tempScores[num - 1] += w);
            // Only count special if integrated
            if (includeSpecial && !IS_SEPARATE_SPECIAL && hDraw.numbers[PICK]) {
                tempScores[hDraw.numbers[PICK] - 1] += (w * 0.5);
            }
        });

        const tempRanked = tempScores
            .map((s, idx) => ({ num: idx + 1, score: s }))
            .sort((a, b) => b.score - a.score);

        const tempHotSet = new Set(tempRanked.slice(0, nHot).map(r => r.num));
        const tempColdSet = new Set(tempRanked.slice(tempRanked.length - nCold).map(r => r.num));

        draw.numbers.slice(0, PICK).forEach(num => {
            if (tempHotSet.has(num)) totalHotHits++;
            else if (tempColdSet.has(num)) totalColdHits++;
            else totalNeutralHits++;
        });
    });

    const avgHot = totalHotHits / nTrend;
    const avgCold = totalColdHits / nTrend;
    const avgNeutral = totalNeutralHits / nTrend;

    // --- Current State Classification ---
    const currentScores = Array(MAX).fill(0);
    targetHistory.forEach((draw, index) => {
        const w = getWeight(index, weightStrategy);
        draw.numbers.slice(0, PICK).forEach(num => currentScores[num - 1] += w);
        if (includeSpecial && !IS_SEPARATE_SPECIAL && draw.numbers[PICK]) {
            currentScores[draw.numbers[PICK] - 1] += (w * 0.5);
        }
    });

    const currentRanked = currentScores
        .map((s, idx) => ({ num: idx + 1, score: s }))
        .sort((a, b) => b.score - a.score);

    const currentHotSet = new Set(currentRanked.slice(0, nHot).map(r => r.num));
    const currentColdSet = new Set(currentRanked.slice(currentRanked.length - nCold).map(r => r.num));
    const currentNeutralSet = new Set(currentRanked.slice(nHot, currentRanked.length - nCold).map(r => r.num));

    const totalAvg = avgHot + avgCold + avgNeutral;
    let hotPool = Array.from(currentHotSet);
    let coldPool = Array.from(currentColdSet);
    let neutralPool = Array.from(currentNeutralSet);

    // Fallback if pools empty
    if (neutralPool.length === 0 && (hotPool.length + coldPool.length < MAX)) {
        const used = new Set([...hotPool, ...coldPool]);
        for (let k = 1; k <= MAX; k++) {
            if (!used.has(k)) neutralPool.push(k);
        }
    }

    const selectedNumbers = new Set();
    while (selectedNumbers.size < PICK) {
        const randInt = getSecureRandomNumber(0, 100000);
        let randomGroup = (randInt / 100000) * totalAvg;
        let chosenGroup = 'neutral';

        if (randomGroup < avgHot) chosenGroup = 'hot';
        else if (randomGroup < avgHot + avgCold) chosenGroup = 'cold';
        else chosenGroup = 'neutral';

        const pickFrom = (pool) => {
            if (pool.length === 0) return null;
            const idx = getSecureRandomNumber(0, pool.length - 1);
            const num = pool[idx];
            pool.splice(idx, 1);
            return num;
        };

        let candidate = null;
        if (chosenGroup === 'hot') {
            candidate = pickFrom(hotPool) || pickFrom(neutralPool) || pickFrom(coldPool);
        } else if (chosenGroup === 'cold') {
            candidate = pickFrom(coldPool) || pickFrom(neutralPool) || pickFrom(hotPool);
        } else {
            candidate = pickFrom(neutralPool) || pickFrom(hotPool) || pickFrom(coldPool);
        }

        if (candidate) selectedNumbers.add(candidate);
    }

    // Special Number Generation (New for Phase 2)
    // If IS_SEPARATE_SPECIAL (Super Lotto), we need to generate one extra number from correct range
    // NOTE: This function currently only returns the MAIN numbers array. 
    // The architecture implies the Special Number is handled separately or appended.
    // For now, keeping consistent with "Main Numbers Only" return signature, 
    // unless the caller expects 7 numbers.
    // Let's assume this function handles MAIN PICK only.

    return {
        numbers: Array.from(selectedNumbers).sort((a, b) => a - b),
        meta: {
            hotCount: currentHotSet.size,
            coldCount: currentColdSet.size,
            hot: Array.from(currentHotSet),
            cold: Array.from(currentColdSet)
        },
        stats: {
            avgHot: avgHot.toFixed(1),
            avgCold: avgCold.toFixed(1),
            avgNeutral: avgNeutral.toFixed(1),
            wHot: (avgHot * 10).toFixed(1),
            wCold: (avgCold * 10).toFixed(1),
            wNeutral: (avgNeutral * 10).toFixed(1)
        }
    };
};
