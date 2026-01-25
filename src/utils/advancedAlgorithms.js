
// Helper for similarity check
import { getSecureRandomNumber } from './secureRandom';
const getSimilarityScore = (targetWindow, unknownWindow, pickCount) => {
    // targetWindow: Array of arrays of numbers
    // unknownWindow: Array of arrays of numbers
    // Simple set intersection count
    let score = 0;
    // FIXED: Filter out special numbers
    const targetSet = new Set(targetWindow.flatMap(d => d.numbers.slice(0, pickCount)));
    const unknownSet = new Set(unknownWindow.flatMap(d => d.numbers.slice(0, pickCount)));

    targetSet.forEach(n => { if (unknownSet.has(n)) score++; });
    return score;
};

// --- Prophet Sub-Algorithms ---

export const predictKNN = (historySlice, gameConfig) => {
    const PICK = gameConfig?.pickCount || 6;

    // 1. Time Traveler (k-NN)
    // Use last 3 draws as pattern
    const windowSize = 3;
    let knnNums = [];

    if (historySlice.length >= windowSize + 10) {
        const recent = historySlice.slice(0, windowSize);
        let bestScore = -1;

        // Scan history
        for (let i = windowSize; i < historySlice.length - (windowSize - 1); i++) {
            const pastWindow = historySlice.slice(i, i + windowSize);
            const score = getSimilarityScore(recent, pastWindow, PICK);

            if (score > bestScore) {
                bestScore = score;
                // Prediction is the draw immediately PRECEDING the past window (since history is desc)
                if (i > 0) {
                    knnNums = historySlice[i - 1].numbers.slice(0, PICK);
                }
            }
        }
    }
    // Return empty array if not enough data, usually should be handled
    return knnNums || [];
};

export const predictMarkov = (historySlice, gameConfig) => {
    const PICK = gameConfig?.pickCount || 6;

    // 2. Chain Master (Markov)
    const transitions = {};
    for (let i = 1; i < historySlice.length; i++) {
        // FIXED: Slice 0..PICK
        const currentDraw = historySlice[i].numbers.slice(0, PICK);
        const nextDraw = historySlice[i - 1].numbers.slice(0, PICK); // Next in time

        currentDraw.forEach(fromNum => {
            if (!transitions[fromNum]) transitions[fromNum] = {};
            nextDraw.forEach(toNum => {
                transitions[fromNum][toNum] = (transitions[fromNum][toNum] || 0) + 1;
            });
        });
    }

    const recentDraws = historySlice.slice(0, 5).flatMap(d => d.numbers.slice(0, PICK));
    const markovScores = {};
    recentDraws.forEach(num => {
        if (transitions[num]) {
            Object.entries(transitions[num]).forEach(([nextNum, count]) => {
                markovScores[nextNum] = (markovScores[nextNum] || 0) + count;
            });
        }
    });

    return Object.entries(markovScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, PICK)
        .map(x => parseInt(x[0]));
};

export const predictRegression = (historySlice, gameConfig) => {
    const MAX = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;

    // 3. Trend Setter (Regression)
    const regNums = [];
    const regData = historySlice.slice(0, 50).reverse(); // Oldest to newest
    if (regData.length > 10) {
        // If history draw length < PICK, we can only regress up to draw length.
        // Assuming history data matches game config roughly.
        const loops = Math.min(PICK, regData[0].numbers.length);

        for (let pos = 0; pos < loops; pos++) {
            const y = regData.map(d => d.numbers[pos]);
            const x = y.map((_, i) => i);
            const n = x.length;

            const sum_x = x.reduce((a, b) => a + b, 0);
            const sum_y = y.reduce((a, b) => a + b, 0);
            const sum_xy = x.reduce((a, v, i) => a + v * y[i], 0);
            const sum_xx = x.reduce((a, v) => a + v * v, 0);

            const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
            const intercept = (sum_y - slope * sum_x) / n;

            let pred = Math.round(slope * n + intercept);
            if (pred < 1) pred = 1;
            if (pred > MAX) pred = MAX;
            regNums.push(pred);
        }
    }
    return regNums;
};

// --- Main Prophet Wrapper ---

export const predictProphet = (historySlice, gameConfig) => {
    const MAX = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;

    const knnNums = predictKNN(historySlice, gameConfig);
    const markovNums = predictMarkov(historySlice, gameConfig);
    const regNums = predictRegression(historySlice, gameConfig);

    // Consensus
    const pool = [...knnNums, ...markovNums, ...regNums];
    const counts = {};
    pool.forEach(n => counts[n] = (counts[n] || 0) + 1);

    const consensus = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, PICK)
        .map(x => parseInt(x[0]))
        .sort((a, b) => a - b);

    // Fill if needed
    while (consensus.length < PICK) {
        const r = getSecureRandomNumber(1, MAX);
        if (!consensus.includes(r)) consensus.push(r);
    }

    return consensus.sort((a, b) => a - b);
};

// --- 2. Chain Reactor ---

export const predictChainReactor = (historySlice, gameConfig) => {
    const MAX = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;

    // Simplified: Analyze 2-link heat and history to find best combos
    // We basically want the top scoring numbers from the top scoring pairs

    // 1. Heat
    // 1. Heat
    const heatMap = {};
    for (let i = 1; i <= MAX; i++) heatMap[i] = 0;
    // FIXED: Scan only main zone (PICK)
    historySlice.slice(0, 50).forEach(d => d.numbers.slice(0, PICK).forEach(n => {
        if (n <= MAX) heatMap[n]++;
    }));
    const maxHeat = Math.max(...Object.values(heatMap)) || 1;

    // 2. Link History
    const linkFreq = {};
    historySlice.forEach(draw => {
        // FIXED: Only analyze main zone
        const nums = [...draw.numbers.slice(0, PICK)].filter(n => n <= MAX).sort((a, b) => a - b);
        // Find adjacent pairs
        for (let i = 0; i < nums.length - 1; i++) {
            if (nums[i + 1] === nums[i] + 1) {
                const key = `${nums[i]}-${nums[i + 1]}`;
                linkFreq[key] = (linkFreq[key] || 0) + 1;
            }
        }
    });

    // 3. Score Candidates (Length 2)
    const candidates = [];
    for (let start = 1; start <= MAX - 1; start++) {
        const combo = [start, start + 1];
        let totalHeat = (heatMap[start] + heatMap[start + 1]) / maxHeat;

        const key = combo.join('-');
        const historyCount = linkFreq[key] || 0;
        const historyScore = (historyCount / historySlice.length) * 10;

        const score = (totalHeat * 70) + (historyScore * 30);
        candidates.push({ nums: combo, score });
    }

    candidates.sort((a, b) => b.score - a.score);

    // Extract numbers from top candidates until we have PICK
    const prediction = new Set();
    for (const cand of candidates) {
        if (prediction.size >= PICK) break;
        cand.nums.forEach(n => prediction.add(n));
    }

    // Fill
    while (prediction.size < PICK) {
        prediction.add(getSecureRandomNumber(1, MAX));
    }

    return Array.from(prediction).slice(0, PICK).sort((a, b) => a - b);
};

// --- 3. Monte Carlo ---

export const predictMonteCarlo = (historySlice, gameConfig) => {
    const MAX = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;

    // Synchronous simulation
    const analysisWindow = 50;
    const simCount = 500; // Fast simulation for backtest

    const relevantHistory = historySlice.slice(0, analysisWindow);
    const weights = {};
    for (let i = 1; i <= MAX; i++) weights[i] = 1;

    relevantHistory.forEach(d => {
        d.numbers.forEach(n => {
            if (n <= MAX) weights[n] += 0.1;
        });
    });

    const weightedPool = [];
    for (let i = 1; i <= MAX; i++) {
        const entries = Math.round(weights[i] * 10);
        for (let k = 0; k < entries; k++) weightedPool.push(i);
    }

    // Optimization: Batch generate random numbers
    // We need PICK numbers per sim * simCount.
    // To be safe against duplicates (re-rolls), we generate 2x buffer.
    const totalRandomNeeded = simCount * PICK * 2;
    const randomBuffer = new Uint32Array(totalRandomNeeded);
    window.crypto.getRandomValues(randomBuffer);

    let bufferIdx = 0;
    const poolSize = weightedPool.length;

    const simStats = {};
    for (let i = 1; i <= MAX; i++) simStats[i] = 0;

    for (let i = 0; i < simCount; i++) {
        const draw = new Set();
        while (draw.size < PICK) {
            if (bufferIdx >= totalRandomNeeded) {
                // Should rare/never happen with 2x buffer, but fallback just in case
                window.crypto.getRandomValues(randomBuffer);
                bufferIdx = 0;
            }

            const randVal = randomBuffer[bufferIdx++];
            const idx = randVal % poolSize;
            draw.add(weightedPool[idx]);
        }
        draw.forEach(n => simStats[n]++);
    }

    return Object.entries(simStats)
        .map(([n, c]) => ({ n: parseInt(n), c }))
        .sort((a, b) => b.c - a.c)
        .slice(0, PICK)
        .map(x => x.n)
        .sort((a, b) => a - b);
};
