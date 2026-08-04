import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import ZoneTwoHybrid from './ZoneTwoHybrid';
import { calculateHybridPrediction } from '../utils/prediction';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

const ZoneTwoLab = ({ history, onSave, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    // Determine number range (Usually 1-8 for Super Lotto Zone 2)
    const MAX_ZONE_2 = activeGameConfig?.settings?.specialNumber?.max || 8;
    const POOL = Array.from({ length: MAX_ZONE_2 }, (_, i) => i + 1);

    // Filter compatible history (Super Lotto only)
    const zoneData = useMemo(() => {
        if (!history) return [];
        // Only use draws that have the special number (index 6)
        const PICK = activeGameConfig?.settings?.pickCount || 6;
        return history.map(d => {
            const val = d.numbers[PICK];
            return {
                period: d.period,
                val: val,
                isOdd: val % 2 !== 0,
                isBig: val > (MAX_ZONE_2 / 2)
            };
        }).filter(d => typeof d.val !== 'undefined');
    }, [history, activeGameConfig, MAX_ZONE_2]);

    // State for Analysis Window
    const [analysisCount, setAnalysisCount] = useState(30);

    // 1. Calculate Missing Counts (Gap Analysis) - Always based on full history for accuracy
    const missingCounts = useMemo(() => {
        const counts = {};
        POOL.forEach(n => counts[n] = 0);
        POOL.forEach(n => {
            const index = zoneData.findIndex(d => d.val === n);
            counts[n] = index === -1 ? zoneData.length : index;
        });
        return counts;
    }, [zoneData, POOL]);

    // 2. Calculate Heat (Frequency in Analysis Window)
    const heatMap = useMemo(() => {
        const h = {};
        POOL.forEach(n => h[n] = 0);
        const recent = zoneData.slice(0, analysisCount);
        recent.forEach(d => {
            if (h[d.val] !== undefined) h[d.val]++;
        });
        return h;
    }, [zoneData, POOL, analysisCount]);

    // 3. Pattern & Directional Detection (Analysis Window)
    const patterns = useMemo(() => {
        const recent = zoneData.slice(0, analysisCount);
        const odds = recent.filter(d => d.isOdd).length;
        const bigs = recent.filter(d => d.isBig).length;

        // Prime Analysis
        const primes = recent.filter(d => [2, 3, 5, 7].includes(d.val)).length;

        // 012 Road
        const road0 = recent.filter(d => d.val % 3 === 0).length;
        const road1 = recent.filter(d => d.val % 3 === 1).length;
        const road2 = recent.filter(d => d.val % 3 === 2).length;

        // Span (Volatility)
        let totalSpan = 0;
        let spanCount = 0;

        // Directional Bias (Up/Down/Same)
        let upCount = 0;
        let downCount = 0;
        let sameCount = 0;
        let dirCount = 0;

        // History Trend (Hot/Cold)
        let hotCount = 0;
        let coldCount = 0;

        for (let i = 0; i < recent.length; i++) {
            const val = recent[i].val;

            // Direction & Span
            // Compare with the next older draw in the full history to ensure full window coverage
            const prevDraw = zoneData[i + 1];

            if (prevDraw) {
                const prev = prevDraw.val;

                // Direction
                if (val > prev) upCount++;
                else if (val < prev) downCount++;
                else sameCount++;
                dirCount++;

                // Span
                totalSpan += Math.abs(val - prev);
                spanCount++;
            }

            // History Context
            const prev3 = zoneData.slice(i + 1, i + 4).map(x => x.val);
            const prev12 = zoneData.slice(i + 1, i + 13).map(x => x.val);

            if (prev3.includes(val)) hotCount++;
            else if (!prev12.includes(val) && prev12.length === 12) coldCount++;
        }

        const avgSpan = spanCount > 0 ? (totalSpan / spanCount).toFixed(1) : 0;

        // Calculate Percentages
        const upPct = dirCount > 0 ? Math.round((upCount / dirCount) * 100) : 0;
        const downPct = dirCount > 0 ? Math.round((downCount / dirCount) * 100) : 0;
        const samePct = dirCount > 0 ? Math.round((sameCount / dirCount) * 100) : 0;

        const hotPct = Math.round((hotCount / recent.length) * 100);
        const coldPct = Math.round((coldCount / recent.length) * 100);
        const normPct = 100 - hotPct - coldPct;

        return {
            oddBias: odds > (analysisCount / 2) ? 'biasOdd' : odds < (analysisCount / 2) ? 'biasEven' : 'biasBalanced',
            bigBias: bigs > (analysisCount / 2) ? 'biasBig' : bigs < (analysisCount / 2) ? 'biasSmall' : 'biasBalanced',
            oddCount: odds,
            bigCount: bigs,
            primeCount: primes,
            primeBias: primes > (analysisCount / 2) ? 'biasPrime' : primes < (analysisCount / 2) ? 'biasComposite' : 'biasBalanced',
            roads: [road0, road1, road2],
            avgSpan,
            direction: { up: upPct, down: downPct, same: samePct },
            history: { hot: hotPct, cold: coldPct, normal: normPct }
        };
    }, [zoneData, analysisCount]);

    // State for individual results
    const [markovResult, setMarkovResult] = useState(null);
    const [knnResult, setKnnResult] = useState(null);
    const [regResult, setRegResult] = useState(null);
    const [monteResult, setMonteResult] = useState(null);
    const [quantumResult, setQuantumResult] = useState(null);
    const [hybridResult, setHybridResult] = useState(null);

    // --- Advanced Models for Single Number Series ---

    // A. MARKOV CHAIN: What comes after X?
    const runMarkov = () => {
        const transitions = {};
        for (let i = 1; i < zoneData.length; i++) {
            const current = zoneData[i].val; // Older
            const next = zoneData[i - 1].val;  // Newer (Next in time)

            if (!transitions[current]) transitions[current] = {};
            transitions[current][next] = (transitions[current][next] || 0) + 1;
        }

        if (zoneData.length === 0) return;
        const currentVal = zoneData[0].val;

        const probs = transitions[currentVal];
        let result = null;
        if (probs) {
            const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
            result = parseInt(sorted[0][0]);
        } else {
            // Fallback if no transition found (rare)
            result = Math.ceil(Math.random() * MAX_ZONE_2);
        }
        setMarkovResult(result);
    };

    // B. TIME TRAVELER (k-NN): Find similar sequence of last 3
    const runKNN = (windowSize = 3) => {
        if (zoneData.length < 50) return;
        const recent = zoneData.slice(0, windowSize).map(d => d.val);

        let bestScore = -1;
        let prediction = null;

        for (let i = windowSize; i < zoneData.length - 1; i++) {
            const pastWindow = zoneData.slice(i, i + windowSize).map(d => d.val);
            let score = 0;
            recent.forEach((v, idx) => {
                if (v === pastWindow[idx]) score += 3;
                else if (Math.abs(v - pastWindow[idx]) <= 1) score += 1;
            });

            if (score > bestScore) {
                bestScore = score;
                prediction = zoneData[i - 1].val;
            }
        }
        // Fallback
        if (!prediction) prediction = Math.ceil(Math.random() * MAX_ZONE_2);
        setKnnResult(prediction);
    };

    // C. REGRESSION: Trend of last 20
    const runRegression = () => {
        const data = zoneData.slice(0, 20).reverse();
        const n = data.length;
        const y = data.map(d => d.val);
        const x = y.map((_, i) => i);

        const sum_x = x.reduce((a, b) => a + b, 0);
        const sum_y = y.reduce((a, b) => a + b, 0);
        const sum_xy = x.reduce((a, v, i) => a + v * y[i], 0);
        const sum_xx = x.reduce((a, v) => a + v * v, 0);

        const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
        const intercept = (sum_y - slope * sum_x) / n;

        let pred = Math.round(slope * n + intercept);
        if (pred < 1) pred = 1;
        if (pred > MAX_ZONE_2) pred = MAX_ZONE_2;
        setRegResult(pred);
    };

    // D. MONTE CARLO: Weighted Simulation
    const runMonteCarlo = () => {
        // Build weights based on Missing Count + Heat
        const weights = [];
        POOL.forEach(n => {
            let weight = 10;
            const heat = heatMap[n];
            const missing = missingCounts[n];

            if (heat >= 5) weight += 20; // Heat favored
            if (missing > MAX_ZONE_2 * 1.5) weight += 30; // Overdue favored

            // Add 'weight' number of entries to the pool
            for (let k = 0; k < weight; k++) weights.push(n);
        });

        // Run 1000 sims
        const wins = {};
        for (let i = 0; i < 1000; i++) {
            const pick = weights[Math.floor(Math.random() * weights.length)];
            wins[pick] = (wins[pick] || 0) + 1;
        }

        const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
        setMonteResult(parseInt(sorted[0][0]));
    };

    // E. QUANTUM RANDOM: Cryptographically Secure
    const runQuantum = () => {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const rand = (array[0] % MAX_ZONE_2) + 1;
        setQuantumResult(rand);
    };

    // F. HYBRID (Parametric)
    const runHybrid = () => {
        const hybridConfig = {
            hotCount: 3,
            coldCount: 3,
            trendDepth: 10,
            weightStrategy: 'standard',
            includeSpecial: false
        };
        const mockHistory = zoneData.slice(0, 30).map(d => ({ numbers: [d.val] }));
        if (mockHistory.length >= 10) {
            const hRes = calculateHybridPrediction(mockHistory, mockHistory, hybridConfig, { maxNumber: 8, pickCount: 1 });
            const pred = hRes.numbers[0] || Math.ceil(Math.random() * MAX_ZONE_2);
            setHybridResult(pred);
        } else {
            setHybridResult(Math.ceil(Math.random() * MAX_ZONE_2));
        }
    };

    // --- F. HYBRID EVOLUTION ENGINE (Genetic Algorithm) ---
    const [genCount, setGenCount] = useState(50);
    const [selectedModels, setSelectedModels] = useState({
        markov: true,
        knn: true,
        reg: true,
        monte: true,
        quantum: true,
        hybrid: true
    });

    // Model Config Helper
    const MODEL_CONFIG = [
        { key: 'markov', label: t('zoneTwoLab.cfgMarkov'), color: 'bg-blue-500' },
        { key: 'knn', label: t('zoneTwoLab.cfgKnn'), color: 'bg-indigo-500' },
        { key: 'reg', label: t('zoneTwoLab.cfgReg'), color: 'bg-emerald-500' },
        { key: 'monte', label: t('zoneTwoLab.cfgMonte'), color: 'bg-amber-500' },
        { key: 'quantum', label: t('zoneTwoLab.cfgQuantum'), color: 'bg-purple-500' },
        { key: 'hybrid', label: t('zoneTwoLab.cfgHybrid'), color: 'bg-cyan-500' }
    ];
    const [evolution, setEvolution] = useState({
        isEvolving: false,
        generation: 0,
        bestGenome: null, // { weights: {}, fitness: 0 }
        bestResult: null
    });

    // Helper: Predict using all models for a specific historical point
    // This allows us to "backtest" efficiently without re-rendering components
    const predictAllModels = (sliceData) => {
        const preds = {};

        // 1. Markov
        const transitions = {};
        for (let i = 1; i < sliceData.length; i++) {
            const c = sliceData[i].val;
            const n = sliceData[i - 1].val;
            if (!transitions[c]) transitions[c] = {};
            transitions[c][n] = (transitions[c][n] || 0) + 1;
        }
        if (sliceData.length > 0) {
            const curr = sliceData[0].val;
            if (transitions[curr]) {
                preds.markov = parseInt(Object.entries(transitions[curr]).sort((a, b) => b[1] - a[1])[0][0]);
            } else {
                preds.markov = Math.ceil(Math.random() * MAX_ZONE_2);
            }
        }

        // 2. KNN
        if (sliceData.length >= 50) {
            const windowSize = 3;
            const recent = sliceData.slice(0, windowSize).map(d => d.val);
            let bestScore = -1;
            let pred = null;
            for (let i = windowSize; i < sliceData.length - 1; i++) {
                const past = sliceData.slice(i, i + windowSize).map(d => d.val);
                let score = 0;
                recent.forEach((v, x) => {
                    if (v === past[x]) score += 3;
                    else if (Math.abs(v - past[x]) <= 1) score += 1;
                });
                if (score > bestScore) {
                    bestScore = score;
                    pred = sliceData[i - 1].val;
                }
            }
            preds.knn = pred || Math.ceil(Math.random() * MAX_ZONE_2);
        } else {
            preds.knn = Math.ceil(Math.random() * MAX_ZONE_2);
        }

        // 3. Regression
        const regData = sliceData.slice(0, 20).reverse();
        if (regData.length > 5) {
            const n = regData.length;
            const y = regData.map(d => d.val);
            const x = y.map((_, i) => i);
            const sum_x = x.reduce((a, b) => a + b, 0);
            const sum_y = y.reduce((a, b) => a + b, 0);
            const sum_xy = x.reduce((a, v, i) => a + v * y[i], 0);
            const sum_xx = x.reduce((a, v) => a + v * v, 0);
            const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
            const intercept = (sum_y - slope * sum_x) / n;
            let p = Math.round(slope * n + intercept);
            if (p < 1) p = 1;
            if (p > MAX_ZONE_2) p = MAX_ZONE_2;
            preds.reg = p;
        } else {
            preds.reg = Math.ceil(Math.random() * MAX_ZONE_2);
        }

        // 4. Monte Carlo
        // Recalc heat/missing for this slice? Expensive but necessary for accuracy.
        // Approx: Use global heat but weighted less? No, use local.
        const localHeat = {};
        const localMissing = {};
        POOL.forEach(n => {
            localHeat[n] = 0;
            // distinct search for missing
            const idx = sliceData.findIndex(d => d.val === n);
            localMissing[n] = idx === -1 ? sliceData.length : idx;
        });
        sliceData.slice(0, 30).forEach(d => { // Look only at last 30 for heat
            if (localHeat[d.val] !== undefined) localHeat[d.val]++;
        });

        const weights = [];
        POOL.forEach(n => {
            let w = 10;
            if (localHeat[n] >= 4) w += 20;
            if (localMissing[n] > 12) w += 30;
            for (let k = 0; k < w; k++) weights.push(n);
        });
        // Single sim for speed
        if (weights.length > 0) {
            preds.monte = weights[Math.floor(Math.random() * weights.length)];
        } else {
            preds.monte = Math.ceil(Math.random() * MAX_ZONE_2);
        }

        // 5. Quantum (Random)
        preds.quantum = Math.ceil(Math.random() * MAX_ZONE_2);

        // 6. Parametric Hybrid (Smart Buckets)
        // Adapt sliceData to format needed by calculateHybridPrediction
        // sliceData is [{period, val...}] descending (newest first)
        // calculateHybridPrediction expects [{period, numbers:[val]...}]
        // We use the same 'sliceData' for both 'targetHistory' (current state) and 'fullHistory' (trends)
        const hybridConfig = {
            hotCount: 3,
            coldCount: 3,
            trendDepth: 10,
            weightStrategy: 'standard',
            includeSpecial: false // Zone 2 is treated as main here
        };
        const mockHistory = sliceData.slice(0, 30).map(d => ({ numbers: [d.val] }));
        if (mockHistory.length >= 10) {
            const hRes = calculateHybridPrediction(mockHistory, mockHistory, hybridConfig, { maxNumber: 8, pickCount: 1 });
            preds.hybrid = hRes.numbers[0] || Math.ceil(Math.random() * MAX_ZONE_2);
        } else {
            preds.hybrid = Math.ceil(Math.random() * MAX_ZONE_2);
        }

        return preds;
    };

    const runHybridEvolution = async () => {
        try {
            // 1. Setup
            setEvolution({ isEvolving: true, generation: 0, bestGenome: null, bestResult: null });
            const POP_SIZE = 50;
            const GENERATIONS = genCount;
            const BACKTEST_DEPTH = 50;

            if (zoneData.length < BACKTEST_DEPTH + 20) {
                alert(t('zoneTwoLab.insufficientHistory'));
                setEvolution(prev => ({ ...prev, isEvolving: false }));
                return;
            }

            // Identify Active Models
            const activeKeys = Object.entries(selectedModels)
                .filter(([_, enabled]) => enabled)
                .map(([key]) => key);

            if (activeKeys.length === 0) {
                alert(t('zoneTwoLab.selectModel'));
                setEvolution(prev => ({ ...prev, isEvolving: false }));
                return;
            }

            // Initial Population (Random Weights for ACTIVE models)
            // Genome structure: { weights: { markov: 0.5, knn: 0.2 ... }, fitness: 0 }
            let population = Array.from({ length: POP_SIZE }, () => {
                const w = {};
                activeKeys.forEach(k => w[k] = Math.random());
                return { weights: w, fitness: 0 };
            });

            // 1. Pre-calculate Model Predictions for the last 50 draws.
            const historyTruths = [];

            for (let i = 0; i < BACKTEST_DEPTH; i++) {
                if (i + 50 >= zoneData.length) break;
                const target = zoneData[i].val;
                const historySlice = zoneData.slice(i + 1);

                if (historySlice.length < 20) break;

                const modelPreds = predictAllModels(historySlice);
                historyTruths.push({ actual: target, preds: modelPreds });

                if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
            }

            // 2. Run Generations
            let currentPop = [...population];

            for (let gen = 1; gen <= GENERATIONS; gen++) {
                // Evaluate
                currentPop.forEach(genome => {
                    let hits = 0;
                    historyTruths.forEach(scene => {
                        const currentVotes = {};
                        POOL.forEach(n => currentVotes[n] = 0);

                        activeKeys.forEach(key => {
                            const p = scene.preds[key];
                            const w = genome.weights[key] || 0;
                            if (p && currentVotes[p] !== undefined) {
                                currentVotes[p] += w;
                            }
                        });

                        // Winner
                        let bestNum = -1;
                        let maxVote = -1;
                        Object.entries(currentVotes).forEach(([num, score]) => {
                            if (score > maxVote) { maxVote = score; bestNum = parseInt(num); }
                        });

                        if (bestNum === scene.actual) hits++;
                    });
                    genome.fitness = historyTruths.length > 0 ? (hits / historyTruths.length) * 100 : 0;
                });

                // B. Sort & Elitism
                currentPop.sort((a, b) => b.fitness - a.fitness);

                // Yield for UI
                if (gen % 2 === 0) {
                    setEvolution(prev => ({ ...prev, generation: gen, bestGenome: currentPop[0] }));
                    await new Promise(r => setTimeout(r, 0));
                }

                // Selection & Crossover 
                const survivors = currentPop.slice(0, Math.floor(POP_SIZE * 0.2));
                const children = [];
                while (children.length < (POP_SIZE - survivors.length)) {
                    const p1 = currentPop[Math.floor(Math.random() * (POP_SIZE / 2))];
                    const p2 = currentPop[Math.floor(Math.random() * (POP_SIZE / 2))];

                    const newWeights = {};
                    activeKeys.forEach(key => {
                        let cw = (p1.weights[key] + p2.weights[key]) / 2;
                        if (Math.random() < 0.05) cw += (Math.random() - 0.5) * 0.2;
                        if (cw < 0) cw = 0; if (cw > 1) cw = 1;
                        newWeights[key] = cw;
                    });
                    children.push({ weights: newWeights, fitness: 0 });
                }
                currentPop = [...survivors, ...children];
            }

            // 3. Final Prediction
            const bestGenome = currentPop[0];
            const livePreds = predictAllModels(zoneData);

            const finalVotes = {};
            POOL.forEach(n => finalVotes[n] = 0);

            activeKeys.forEach(key => {
                const p = livePreds[key];
                const w = bestGenome.weights[key] || 0;
                if (p && finalVotes[p] !== undefined) finalVotes[p] += w;
            });

            let winner = -1;
            let finalMax = -1;
            Object.entries(finalVotes).forEach(([num, score]) => {
                if (score > finalMax) { finalMax = score; winner = parseInt(num); }
            });

            setEvolution({
                isEvolving: false,
                generation: GENERATIONS,
                bestGenome: bestGenome, // { weights: { markov: 0...}, fitness: ... }
                bestResult: winner
            });

        } catch (error) {
            console.error("Hybrid Evolution Error:", error);
            setEvolution(prev => ({ ...prev, isEvolving: false }));
            alert(t('zoneTwoLab.evolutionFailed', { msg: error.message }));
        }
    };

    if (activeGameConfig?.id !== 'SUPERLOTTO') return null;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <div className="bg-slate-900/50 light:bg-white rounded-2xl p-6 border border-slate-800 light:border-slate-200 shadow-xl overflow-hidden relative">

                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
                    <div>
                        <h2 className="text-xl font-black text-rose-400 light:text-rose-600 flex items-center gap-2">
                            ⚡ {t('zoneTwoLab.title')}
                        </h2>
                        <p className="text-sm text-slate-400 light:text-slate-500 mt-1">
                            {t('zoneTwoLab.subtitle', { max: MAX_ZONE_2 })}
                        </p>
                    </div>

                    {/* Global Analysis Window Selector */}
                    <div className="bg-slate-950 light:bg-slate-100 p-1 rounded-lg border border-slate-800 light:border-slate-300 flex items-center gap-2 px-3">
                        <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">{t('zoneTwoLab.analysisWindow')}</span>
                        <input
                            type="number"
                            min="5"
                            max="200"
                            value={analysisCount}
                            onChange={(e) => setAnalysisCount(Number(e.target.value))}
                            className="w-16 bg-slate-800 light:bg-white text-white light:text-slate-900 text-xs font-bold rounded px-2 py-1 border border-slate-700 light:border-slate-300 focus:outline-none focus:border-rose-500 text-center"
                        />
                        <span className="text-[10px] text-slate-600">{t('zoneTwoLab.draws')}</span>
                    </div>

                    <HelpIcon title={t('zoneTwoLab.help.title')} body={t('zoneTwoLab.help.body')} />
                </div>

                {/* Technical Intelligence Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">

                    {/* 1. Pattern Balance */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200">
                        <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
                            </svg>
                            {t('zoneTwoLab.patternBalance', { n: analysisCount })}
                        </h3>
                        <div className="flex flex-col gap-3">
                            {/* Odd/Even */}
                            <div className="bg-slate-900 light:bg-slate-100 rounded-lg p-2.5">
                                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase mb-1">
                                    <span>{t('zoneTwoLab.odd')}</span>
                                    <span>{t('zoneTwoLab.even')}</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 light:bg-slate-300 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${(patterns.oddCount / analysisCount) * 100}%` }} className="bg-rose-500 h-full transition-all duration-500"></div>
                                </div>
                                <div className="mt-1 text-[10px] font-bold text-center text-slate-400">
                                    {t(`zoneTwoLab.${patterns.oddBias}`)} ({patterns.oddCount})
                                </div>
                            </div>
                            {/* Big/Small */}
                            <div className="bg-slate-900 light:bg-slate-100 rounded-lg p-2.5">
                                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase mb-1">
                                    <span>{t('zoneTwoLab.big')}</span>
                                    <span>{t('zoneTwoLab.small')}</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 light:bg-slate-300 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${(patterns.bigCount / analysisCount) * 100}%` }} className="bg-purple-500 h-full transition-all duration-500"></div>
                                </div>
                                <div className="mt-1 text-[10px] font-bold text-center text-slate-400">
                                    {t(`zoneTwoLab.${patterns.bigBias}`)} ({patterns.bigCount})
                                </div>
                            </div>
                            {/* Prime/Composite */}
                            <div className="bg-slate-900 light:bg-slate-100 rounded-lg p-2.5">
                                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase mb-1">
                                    <span>{t('zoneTwoLab.prime')}</span>
                                    <span>{t('zoneTwoLab.comp')}</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 light:bg-slate-300 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${(patterns.primeCount / analysisCount) * 100}%` }} className="bg-amber-500 h-full transition-all duration-500"></div>
                                </div>
                                <div className="mt-1 text-[10px] font-bold text-center text-slate-400">
                                    {t(`zoneTwoLab.${patterns.primeBias}`)} ({patterns.primeCount})
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Advanced Metrics & Directional Bias */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4">
                        <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-emerald-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                            {t('zoneTwoLab.metrics', { n: analysisCount })}
                        </h3>

                        {/* Directional Bias */}
                        <div className="bg-slate-900 light:bg-slate-100 rounded-lg p-3">
                            <div className="flex justify-between items-end mb-2">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">{t('zoneTwoLab.directionalContext')}</div>
                                <div className="text-[10px] font-bold text-slate-300">
                                    <span className="text-rose-400">{patterns.direction.up}%</span> /
                                    <span className="text-slate-400"> {patterns.direction.same}%</span> /
                                    <span className="text-emerald-400"> {patterns.direction.down}%</span>
                                </div>
                            </div>
                            <div className="h-3 w-full flex rounded-full overflow-hidden">
                                <div style={{ width: `${patterns.direction.up}%` }} className="h-full bg-rose-500 transition-all" title={t('zoneTwoLab.higher')}></div>
                                <div style={{ width: `${patterns.direction.same}%` }} className="h-full bg-slate-600 transition-all" title={t('zoneTwoLab.same')}></div>
                                <div style={{ width: `${patterns.direction.down}%` }} className="h-full bg-emerald-500 transition-all" title={t('zoneTwoLab.lower')}></div>
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-500 mt-1 uppercase font-bold px-1">
                                <span>{t('zoneTwoLab.up')}</span>
                                <span>{t('zoneTwoLab.same')}</span>
                                <span>{t('zoneTwoLab.down')}</span>
                            </div>
                        </div>

                        {/* Recent History Trend (Hot/Cold) */}
                        <div className="bg-slate-900 light:bg-slate-100 rounded-lg p-3">
                            <div className="flex justify-between items-end mb-2">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">{t('zoneTwoLab.recentHistoryTrend')}</div>
                                <div className="text-[10px] font-bold text-slate-300">
                                    🔥 {patterns.history.hot}% /
                                    <span className="text-slate-400"> {patterns.history.normal}%</span> /
                                    ❄️ {patterns.history.cold}%
                                </div>
                            </div>
                            <div className="h-3 w-full flex rounded-full overflow-hidden">
                                <div style={{ width: `${patterns.history.hot}%` }} className="h-full bg-rose-500 transition-all" title={t('zoneTwoLab.hotRepeat')}></div>
                                <div style={{ width: `${patterns.history.normal}%` }} className="h-full bg-slate-700 light:bg-slate-300 transition-all" title={t('zoneTwoLab.normal')}></div>
                                <div style={{ width: `${patterns.history.cold}%` }} className="h-full bg-blue-500 transition-all" title={t('zoneTwoLab.coldOverdue')}></div>
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-500 mt-1 uppercase font-bold px-1">
                                <span>{t('zoneTwoLab.hot')}</span>
                                <span>{t('zoneTwoLab.normal')}</span>
                                <span>{t('zoneTwoLab.cold')}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 flex-1">
                            {/* 012 Road */}
                            <div className="flex-1">
                                <div className="text-[9px] text-slate-500 font-bold uppercase mb-2 text-center">{t('zoneTwoLab.road012')}</div>
                                <div className="flex gap-1 h-10 w-full">
                                    <div style={{ flex: patterns.roads[0] || 1 }} className="bg-cyan-500/20 border-b-2 border-cyan-500 flex flex-col items-center justify-end pb-1 text-[10px] font-bold text-cyan-400 transition-all">
                                        R0 <span className="text-[9px] opacity-70">({patterns.roads[0]})</span>
                                    </div>
                                    <div style={{ flex: patterns.roads[1] || 1 }} className="bg-lime-500/20 border-b-2 border-lime-500 flex flex-col items-center justify-end pb-1 text-[10px] font-bold text-lime-400 transition-all">
                                        R1 <span className="text-[9px] opacity-70">({patterns.roads[1]})</span>
                                    </div>
                                    <div style={{ flex: patterns.roads[2] || 1 }} className="bg-fuchsia-500/20 border-b-2 border-fuchsia-500 flex flex-col items-center justify-end pb-1 text-[10px] font-bold text-fuchsia-400 transition-all">
                                        R2 <span className="text-[9px] opacity-70">({patterns.roads[2]})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Volatility Index */}
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 border-t border-slate-800 pt-2">
                                <span>{t('zoneTwoLab.avgJump')}</span>
                                <span className={patterns.avgSpan > 4 ? 'text-rose-400' : 'text-emerald-400'}>{patterns.avgSpan}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Gap Monitor (Alerts) */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200">
                        <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-amber-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            {t('zoneTwoLab.gapAlerts')}
                        </h3>
                        <div className="flex flex-col gap-2 h-full overflow-y-auto max-h-[140px] scrollbar-thin scrollbar-thumb-slate-700">
                            {POOL.filter(n => missingCounts[n] > 8).length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 italic">
                                    {t('zoneTwoLab.noCriticalGaps')}
                                </div>
                            ) : (
                                POOL.filter(n => missingCounts[n] > 8).sort((a, b) => missingCounts[b] - missingCounts[a]).map(n => (
                                    <div key={n} className="bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded px-3 py-2 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${missingCounts[n] > 15 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500 text-slate-900'
                                                }`}>
                                                {n}
                                            </span>
                                            <span className="text-xs font-bold text-slate-300 light:text-slate-700">
                                                {t('zoneTwoLab.zone2Num', { n })}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 light:text-slate-500">
                                            <strong className="text-white light:text-slate-900 text-xs">{missingCounts[n]}</strong> {t('zoneTwoLab.drawsAgo')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Prediction Models Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">

                    {/* Model 1: Markov */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4 group hover:border-rose-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase">{t('zoneTwoLab.markovChain')}</h3>
                            <button onClick={runMarkov} className="bg-rose-500/20 text-rose-300 light:text-rose-700 hover:bg-rose-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all">
                                {t('zoneTwoLab.run')}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
                            {markovResult ? (
                                <div className="text-center animate-in zoom-in">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 light:bg-white text-rose-500 font-black text-3xl flex items-center justify-center border-4 border-rose-500/50 mb-2 shadow-lg">
                                        {markovResult}
                                    </div>
                                    <button
                                        onClick={() => onSave([markovResult], 'Zone 2 Markov')}
                                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        {t('zoneTwoLab.saveResult')}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-slate-600 text-xs italic">{t('zoneTwoLab.transitionLogic')}</span>
                            )}
                        </div>
                    </div>

                    {/* Model 2: Time Traveler */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4 group hover:border-indigo-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase">{t('zoneTwoLab.timeTraveler')}</h3>
                            <button onClick={() => runKNN(3)} className="bg-indigo-500/20 text-indigo-300 light:text-indigo-700 hover:bg-indigo-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all">
                                {t('zoneTwoLab.run')}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
                            {knnResult ? (
                                <div className="text-center animate-in zoom-in">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 light:bg-white text-indigo-500 font-black text-3xl flex items-center justify-center border-4 border-indigo-500/50 mb-2 shadow-lg">
                                        {knnResult}
                                    </div>
                                    <button
                                        onClick={() => onSave([knnResult], 'Zone 2 k-NN')}
                                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        {t('zoneTwoLab.saveResult')}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-slate-600 text-xs italic">{t('zoneTwoLab.patternMatch')}</span>
                            )}
                        </div>
                    </div>

                    {/* Model 3: Regression */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4 group hover:border-emerald-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase">{t('zoneTwoLab.regression')}</h3>
                            <button onClick={runRegression} className="bg-emerald-500/20 text-emerald-300 light:text-emerald-700 hover:bg-emerald-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all">
                                {t('zoneTwoLab.run')}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
                            {regResult ? (
                                <div className="text-center animate-in zoom-in">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 light:bg-white text-emerald-500 font-black text-3xl flex items-center justify-center border-4 border-emerald-500/50 mb-2 shadow-lg">
                                        {regResult}
                                    </div>
                                    <button
                                        onClick={() => onSave([regResult], 'Zone 2 Regression')}
                                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        {t('zoneTwoLab.saveResult')}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-slate-600 text-xs italic">{t('zoneTwoLab.linearTrend')}</span>
                            )}
                        </div>
                    </div>

                    {/* Model 4: Monte Carlo */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4 group hover:border-amber-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase">{t('zoneTwoLab.monteCarlo')}</h3>
                            <button onClick={runMonteCarlo} className="bg-amber-500/20 text-amber-300 light:text-amber-700 hover:bg-amber-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all">
                                {t('zoneTwoLab.run')}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
                            {monteResult ? (
                                <div className="text-center animate-in zoom-in">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 light:bg-white text-amber-500 font-black text-3xl flex items-center justify-center border-4 border-amber-500/50 mb-2 shadow-lg">
                                        {monteResult}
                                    </div>
                                    <button
                                        onClick={() => onSave([monteResult], 'Zone 2 Monte Carlo')}
                                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        {t('zoneTwoLab.saveResult')}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-slate-600 text-xs italic">{t('zoneTwoLab.weightedSim')}</span>
                            )}
                        </div>
                    </div>

                    {/* Model 5: Quantum Chaos */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4 group hover:border-purple-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase">{t('zoneTwoLab.quantum')}</h3>
                            <button onClick={runQuantum} className="bg-purple-500/20 text-purple-300 light:text-purple-700 hover:bg-purple-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all">
                                {t('zoneTwoLab.run')}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
                            {quantumResult ? (
                                <div className="text-center animate-in zoom-in">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 light:bg-white text-purple-500 font-black text-3xl flex items-center justify-center border-4 border-purple-500/50 mb-2 shadow-lg">
                                        {quantumResult}
                                    </div>
                                    <button
                                        onClick={() => onSave([quantumResult], 'Zone 2 Quantum')}
                                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        {t('zoneTwoLab.saveResult')}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-slate-600 text-xs italic">{t('zoneTwoLab.pureChaos')}</span>
                            )}
                        </div>
                    </div>

                    {/* Model 6: Hybrid */}
                    <div className="bg-slate-950/40 light:bg-slate-50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex flex-col gap-4 group hover:border-cyan-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase">{t('zoneTwoLab.hybrid')}</h3>
                            <button onClick={runHybrid} className="bg-cyan-500/20 text-cyan-300 light:text-cyan-700 hover:bg-cyan-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all">
                                {t('zoneTwoLab.run')}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[100px]">
                            {hybridResult ? (
                                <div className="text-center animate-in zoom-in">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 light:bg-white text-cyan-500 font-black text-3xl flex items-center justify-center border-4 border-cyan-500/50 mb-2 shadow-lg">
                                        {hybridResult}
                                    </div>
                                    <button
                                        onClick={() => onSave([hybridResult], 'Zone 2 Hybrid')}
                                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        {t('zoneTwoLab.saveResult')}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-slate-600 text-xs italic">{t('zoneTwoLab.smartWeighting')}</span>
                            )}
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 1. Missing Matrix (Bar Chart) */}
                    <div className="bg-slate-950/50 light:bg-slate-50/50 rounded-xl p-4 border border-white/5 light:border-slate-200">
                        <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider mb-4">{t('zoneTwoLab.missingCounts')}</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={POOL.map(n => ({ n, missing: missingCounts[n] }))}>
                                    <XAxis dataKey="n" tick={{ fontSize: 12, fill: isLightMode ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: isLightMode ? '#fff' : '#0f172a', borderColor: isLightMode ? '#e2e8f0' : '#334155', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="missing" radius={[4, 4, 0, 0]}>
                                        {POOL.map((n, index) => {
                                            const miss = missingCounts[n];
                                            let color = isLightMode ? '#cbd5e1' : '#334155'; // Neutral
                                            if (miss > 15) color = '#f43f5e'; // Red (Very overdue)
                                            else if (miss > 8) color = '#fbbf24'; // Amber
                                            else if (miss < 2) color = '#10b981'; // Green (Just appeared)

                                            return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Heat Thermometer + Prediction */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-950/50 light:bg-slate-50/50 rounded-xl p-4 border border-white/5 light:border-slate-200 flex-1">
                            <h3 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider mb-4">{t('zoneTwoLab.heatMap')}</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {POOL.map(n => {
                                    const heat = heatMap[n];
                                    // Heat scale: 0-2 (Cold), 3-5 (Warm), 6+ (Hot)
                                    let bgClass = "bg-slate-800 light:bg-slate-200 text-slate-500";
                                    if (heat >= 8) bgClass = "bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105";
                                    else if (heat >= 5) bgClass = "bg-orange-500 text-white";
                                    else if (heat >= 3) bgClass = "bg-yellow-500 text-slate-900";
                                    else if (heat === 0) bgClass = "bg-blue-900/40 text-blue-300 border border-blue-500/30";

                                    return (
                                        <div key={n} className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${bgClass}`}>
                                            <span className="text-lg font-bold">{n}</span>
                                            <span className="text-[9px] opacity-70">{heat}x</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Strips Container */}
                <div className="mt-8 pt-6 border-t border-white/5 light:border-slate-200 space-y-8">

                    {/* 1. Number History Strip */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">{t('zoneTwoLab.recentHistory', { n: analysisCount })}</h3>
                            <div className="flex gap-4 text-[10px] font-bold uppercase text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> {t('zoneTwoLab.legendHot')}</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {t('zoneTwoLab.legendCold')}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {zoneData.slice(0, analysisCount).map((d, i) => {
                                // Relative Analysis Context
                                const prev3 = zoneData.slice(i + 1, i + 4).map(x => x.val);
                                const prev12 = zoneData.slice(i + 1, i + 13).map(x => x.val);

                                const isHot = prev3.includes(d.val);
                                const isCold = !prev12.includes(d.val) && prev12.length === 12;

                                let borderClass = 'border-slate-700 light:border-slate-300';
                                let bgClass = 'bg-slate-800 light:bg-white text-slate-300 light:text-slate-700';
                                let indicator = null;

                                if (isHot) {
                                    borderClass = 'border-rose-500/50';
                                    bgClass = 'bg-rose-950/30 light:bg-rose-50 text-rose-400 light:text-rose-600';
                                    indicator = <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[6px] text-white">🔥</div>;
                                } else if (isCold) {
                                    borderClass = 'border-blue-500/50';
                                    bgClass = 'bg-blue-950/30 light:bg-blue-50 text-blue-400 light:text-blue-600';
                                    indicator = <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[6px] text-white">❄️</div>;
                                }

                                return (
                                    <div key={i} className="flex flex-col items-center gap-1 min-w-[36px] group relative">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border-2 transition-all relative ${borderClass} ${bgClass}`}>
                                            {d.val}
                                            {indicator}
                                        </div>
                                        <span className="text-[9px] text-slate-600 light:text-slate-400 font-mono group-hover:text-slate-300 transition-colors">{d.period.slice(-3)}</span>
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                            {isHot ? t('zoneTwoLab.repeatHit') : isCold ? t('zoneTwoLab.longAwaited') : t('zoneTwoLab.normal')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Directional Flow Strip */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">{t('zoneTwoLab.directionalFlow')}</h3>
                            <div className="flex gap-4 text-[10px] font-bold uppercase text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> {t('zoneTwoLab.legendUp')} ({'>'})</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('zoneTwoLab.legendDown')} ({'<'})</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> {t('zoneTwoLab.legendSame')} (=)</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {zoneData.slice(0, analysisCount).map((d, i) => {
                                // Compare with previous draw (which is at index i+1)
                                const prevDraw = zoneData[i + 1];
                                if (!prevDraw) return null; // Skip last item if no history

                                const prevVal = prevDraw.val;
                                let flow = 'same';
                                let flowClass = 'bg-slate-700/50 text-slate-400 border-slate-600';

                                if (d.val > prevVal) {
                                    flow = 'up';
                                    // Red for Rising (Stock market style in Asia)
                                    flowClass = 'bg-rose-950/30 border-rose-500/50 text-rose-400 font-black';
                                } else if (d.val < prevVal) {
                                    flow = 'down';
                                    // Green for Falling
                                    flowClass = 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 font-black';
                                }

                                return (
                                    <div key={i} className="flex flex-col items-center gap-1 min-w-[36px] group relative">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm border transition-all ${flowClass}`}>
                                            {d.val}
                                        </div>
                                        {/* Optional: Show delta on hover */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                            {d.val} {t('zoneTwoLab.vsLabel')} {prevVal} ({d.val - prevVal > 0 ? '+' : ''}{d.val - prevVal})
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Hybrid Evolution Lab Section */}
                <div className="mt-8 pt-8 border-t border-white/5 light:border-slate-200">
                    <div className="bg-slate-900/40 light:bg-slate-50/80 rounded-2xl p-6 border border-rose-500/20 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <span className="text-6xl">🧬</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
                            <div>
                                <h2 className="text-xl font-black text-rose-400 light:text-rose-600 flex items-center gap-2">
                                    🧬 {t('zoneTwoLab.geneticLabTitle')}
                                </h2>
                                <p className="text-sm text-slate-400 light:text-slate-500 mt-1 max-w-lg">
                                    {t('zoneTwoLab.geneticDesc', { n: genCount })}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase">{t('zoneTwoLab.generations')}</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={genCount}
                                        onChange={(e) => setGenCount(Number(e.target.value))}
                                        disabled={evolution.isEvolving}
                                        className="w-16 bg-slate-800 light:bg-slate-100 text-white light:text-slate-900 border border-slate-700 light:border-slate-300 rounded px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-rose-500"
                                    />
                                </div>
                                {/* Model Selection Checkboxes */}
                                <div className="flex flex-wrap gap-2 justify-end max-w-md mb-2">
                                    {MODEL_CONFIG.map(m => (
                                        <label key={m.key} className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none transition-colors border ${selectedModels[m.key] ? 'bg-slate-800 border-slate-600' : 'bg-transparent border-slate-800 opacity-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedModels[m.key]}
                                                onChange={e => setSelectedModels(prev => ({ ...prev, [m.key]: e.target.checked }))}
                                                className="accent-rose-500 w-3 h-3"
                                            />
                                            <span className={`text-[9px] uppercase font-bold ${selectedModels[m.key] ? 'text-white' : 'text-slate-500'}`}>{m.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={runHybridEvolution}
                                    disabled={evolution.isEvolving}
                                    className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 ${evolution.isEvolving
                                        ? 'bg-slate-800 text-slate-500 cursor-wait'
                                        : 'bg-gradient-to-r from-rose-600 to-purple-600 text-white hover:scale-105 hover:shadow-rose-500/25'
                                        }`}
                                >
                                    {evolution.isEvolving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('zoneTwoLab.evolvingGen', { gen: evolution.generation, total: genCount })}
                                        </>
                                    ) : (
                                        <>
                                            🚀 {t('zoneTwoLab.startEvolution')}
                                        </>
                                    )}
                                </button>
                                {evolution.bestResult && (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                                        {t('zoneTwoLab.evolutionComplete')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Evolution Visualization */}
                        {(evolution.isEvolving || evolution.bestResult) && (
                            <div className="space-y-6 animate-in fade-in duration-500">

                                {/* Progress Bar */}
                                {evolution.isEvolving && (
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-purple-500 transition-all duration-75 ease-linear"
                                            style={{ width: `${(evolution.generation / genCount) * 100}%` }}
                                        ></div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* DNA Bar (Weights) */}
                                    <div className="bg-slate-950/50 light:bg-white p-4 rounded-xl border border-white/5 light:border-slate-200">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex justify-between">
                                            <span>{t('zoneTwoLab.bestGenome')}</span>
                                            <span>{t('zoneTwoLab.fitLabel', { pct: evolution.bestGenome?.fitness.toFixed(1) })}</span>
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="space-y-3">
                                                {Object.entries(evolution.bestGenome?.weights || {})
                                                    .sort((a, b) => b[1] - a[1])
                                                    .map(([key, weight]) => {
                                                        const conf = MODEL_CONFIG.find(c => c.key === key) || { label: key, color: 'bg-slate-500' };
                                                        return (
                                                            <div key={key} className="flex items-center gap-3">
                                                                <span className="text-[10px] font-bold uppercase w-20 text-right text-slate-400">{conf.label}</span>
                                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-300 ${conf.color}`}
                                                                        style={{ width: `${weight * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-[10px] font-mono w-8 text-right text-slate-300">{(weight * 100).toFixed(0)}%</span>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Result Card */}
                                    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/50 light:bg-white rounded-xl border border-white/5 light:border-slate-200">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('zoneTwoLab.alphaPrediction')}</h3>
                                        {evolution.bestResult ? (
                                            <div className="text-center animate-in zoom-in duration-300">
                                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 light:from-slate-100 light:to-white shadow-2xl flex items-center justify-center border-4 border-rose-500/50 relative mb-4">
                                                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-purple-400">
                                                        {evolution.bestResult}
                                                    </div>
                                                    <div className="absolute -bottom-2 px-3 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                                                        {t('zoneTwoLab.evolved')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => onSave([evolution.bestResult], `Zone 2 Hybrid (Gen ${evolution.generation})`)}
                                                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                                >
                                                    {t('zoneTwoLab.saveResult')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-slate-600 text-sm italic">{t('zoneTwoLab.evolvingPlaceholder')}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Parametric Hybrid Lab Section */}
                <div className="mt-8 pt-8 border-t border-white/5 light:border-slate-200">
                    <ZoneTwoHybrid zoneHistory={zoneData} isLightMode={isLightMode} />
                </div>

            </div>
        </div>
    );
};

export default ZoneTwoLab;
