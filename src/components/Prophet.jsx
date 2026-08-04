import React, { useState, useEffect, useMemo } from 'react';
import { getSecureRandomNumber } from '../utils/secureRandom';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

const Prophet = ({ history, onSave, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    const [range, setRange] = useState(100);
    const [similarityWindow, setSimilarityWindow] = useState(3);
    const [predictors, setPredictors] = useState(null);

    // 1. Data Slicing
    // The "Training Set" based on user selection
    const trainingData = useMemo(() => {
        return history.slice(0, range);
    }, [history, range]);

    // 2. Algorithms
    const PICK = activeGameConfig?.settings?.pickCount || 6;
    const MAX = activeGameConfig?.settings?.maxNumber || 49;

    // --- Algorithm A: The Time Traveler (k-NN / Similarity) ---
    // Finds the past sequence most similar to the recent X draws
    const runTimeTraveler = (data) => {
        const windowSize = similarityWindow;
        if (data.length < windowSize + 10) return null; // Need some history

        // Target pattern: Last N draws
        const recent = data.slice(0, windowSize);

        let bestScore = -1;
        let prediction = [];
        let bestMatch = null;

        // Scan history (skipping recent window)
        // Ensure i + (windowSize - 1) is valid index
        // Loop condition i < length - (windowSize - 1)
        for (let i = windowSize; i < data.length - (windowSize - 1); i++) {
            // Compare window data[i]...data[i+windowSize-1]
            let score = 0;
            // FIXED: Exclude special number (slice 0..PICK)
            const recentSet = new Set(recent.flatMap(d => d.numbers.slice(0, PICK)));
            const pastSet = new Set(data.slice(i, i + windowSize).flatMap(d => d.numbers.slice(0, PICK)));

            // Intersection
            recentSet.forEach(n => { if (pastSet.has(n)) score++; });

            if (score > bestScore) {
                bestScore = score;
                // Prediction is from previous draw, ensure sliced too if we return raw? 
                // Using full numbers here is OK if we slice later, but let's be safe.
                // The 'prediction' variable holds the numbers to display.
                // If we want to suggest next draw numbers, we should suggest MAIN numbers.
                prediction = data[i - 1].numbers.slice(0, PICK);
                bestMatch = {
                    start: data[i].period,
                    end: data[i + windowSize - 1].period,
                    source: data[i - 1].period
                };
            }
        }
        return { numbers: prediction.length ? prediction : [], score: bestScore, match: bestMatch };
    };

    // --- Algorithm B: The Chain Master (Markov) ---
    // Probability of Number B following Number A
    const runMarkov = (data) => {
        const transitions = {};

        // Build Matrix
        // Scan all draws. For each draw, look at immediate next draw (index - 1)
        for (let i = 1; i < data.length; i++) {
            // FIXED: Slice 0..PICK
            const currentDraw = data[i].numbers.slice(0, PICK);
            const nextDraw = data[i - 1].numbers.slice(0, PICK);

            currentDraw.forEach(fromNum => {
                if (!transitions[fromNum]) transitions[fromNum] = {};
                nextDraw.forEach(toNum => {
                    transitions[fromNum][toNum] = (transitions[fromNum][toNum] || 0) + 1;
                });
            });
        }

        // Predict based on LAST 5 DRAWS (User Request)
        const recentDraws = data.slice(0, 5).flatMap(d => d.numbers.slice(0, PICK));
        const scores = {};

        recentDraws.forEach(num => {
            const potentialNext = transitions[num];
            if (potentialNext) {
                Object.entries(potentialNext).forEach(([nextNum, count]) => {
                    scores[nextNum] = (scores[nextNum] || 0) + count;
                });
            }
        });

        // Top PICK
        return Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, PICK)
            .map(x => parseInt(x[0]))
            .sort((a, b) => a - b);
    };

    // --- Algorithm C: The Trend Setter (Regression) ---
    // Linear regression on each of the 6 positions
    const runRegression = (data) => {
        const result = [];
        const n = Math.min(data.length, 50); // Limit regression to recent 50 of the selected range for noise reduction
        const dataset = data.slice(0, n).reverse(); // Oldest to Newest for regression

        // Dynamic Max
        const MAX = activeGameConfig?.settings?.maxNumber || 49;

        for (let pos = 0; pos < PICK; pos++) {
            // Gather Y values (numbers at this position)
            const y = dataset.map(d => d.numbers[pos]);
            const x = y.map((_, i) => i);

            // Calc Slope
            const n_cnt = x.length;
            const sum_x = x.reduce((a, b) => a + b, 0);
            const sum_y = y.reduce((a, b) => a + b, 0);
            const sum_xy = x.reduce((a, v, i) => a + v * y[i], 0);
            const sum_xx = x.reduce((a, v) => a + v * v, 0);

            const slope = (n_cnt * sum_xy - sum_x * sum_y) / (n_cnt * sum_xx - sum_x * sum_x);
            const intercept = (sum_y - slope * sum_x) / n_cnt;

            // Predict next (index = n_cnt)
            let pred = Math.round(slope * n_cnt + intercept);

            // Clamp
            if (pred < 1) pred = 1;
            if (pred > MAX) pred = MAX;
            result.push(pred);
        }

        // Ensure unique
        const unique = Array.from(new Set(result)).sort((a, b) => a - b);
        // Fill if unique < PICK (rare)
        while (unique.length < PICK) {
            let r = getSecureRandomNumber(1, MAX);
            if (!unique.includes(r)) unique.push(r);
        }
        return unique.sort((a, b) => a - b);
    };


    const runProphet = () => {
        const knn = runTimeTraveler(trainingData);
        const markov = runMarkov(trainingData);
        const reg = runRegression(trainingData);

        // Consensus
        // Count frequency of all numbers predicted
        const pool = [
            ...(knn?.numbers || []),
            ...(markov || []),
            ...(reg || [])
        ];

        const counts = {};
        pool.forEach(n => counts[n] = (counts[n] || 0) + 1);

        const consensus = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, PICK)
            .map(x => parseInt(x[0]))
            .sort((a, b) => a - b);

        setPredictors({
            knn,
            markov,
            reg,
            consensus
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-8">
            <div className="bg-slate-900/50 light:bg-white rounded-2xl p-6 border border-slate-800 light:border-slate-200 shadow-xl light:shadow-lg">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
                            🔮 The Prophet <span className="text-xs bg-indigo-900/50 light:bg-indigo-100 text-indigo-300 light:text-indigo-700 px-2 py-0.5 rounded border border-indigo-700/50 light:border-indigo-200">EXP-04</span>
                        </h2>
                        <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                            {t('prophet.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Controls */}
                        <div className="flex flex-col">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t('prophet.refData')}</label>
                            <select
                                value={range}
                                onChange={(e) => setRange(Number(e.target.value))}
                                className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {Array.from({ length: Math.ceil(history.length / 10) }, (_, i) => (i + 1) * 10).map(val => (
                                    <option key={val} value={val}>{t('prophet.lastN', { n: val })}</option>
                                ))}
                                <option value={history.length}>{t('prophet.allN', { n: history.length })}</option>
                            </select>
                        </div>

                        <div className="flex flex-col border-l border-slate-700 pl-4">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t('prophet.patternSize')}</label>
                            <select
                                value={similarityWindow}
                                onChange={(e) => setSimilarityWindow(Number(e.target.value))}
                                className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {[1, 2, 3, 5, 10, 20].map(val => (
                                    <option key={val} value={val}>{t('prophet.drawsN', { n: val })}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={runProphet}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-indigo-500/50 hover:ring-2 hover:ring-white/20 ml-2"
                        >
                            {t('prophet.summon')}
                        </button>

                        <HelpIcon title={t('prophet.help.title')} body={t('prophet.help.body')} />
                    </div>
                </div>

                {/* Results Grid */}
                {predictors && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* 1. Time Traveler */}
                        <div className="bg-slate-800/50 light:bg-slate-50 p-4 rounded-xl border border-slate-700 light:border-slate-200 relative group/card shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xs font-bold text-blue-400 light:text-blue-600 uppercase tracking-wider">🕰️ {t('prophet.timeTraveler')}</h3>
                                {onSave && predictors.knn?.numbers.length > 0 && (
                                    <button
                                        onClick={() => onSave(predictors.knn.numbers, 'Time Traveler')}
                                        className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-300 flex items-center justify-center hover:bg-white hover:text-blue-600 transition-all"
                                        title={t('prophet.save')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {predictors.knn?.numbers.length > 0 ? predictors.knn.numbers.map(n => (
                                    <span key={n} className="w-8 h-8 rounded-full bg-slate-700 light:bg-slate-200 flex items-center justify-center text-sm font-bold text-white light:text-slate-800 shadow-inner">{n}</span>
                                )) : <span className="text-xs text-slate-500 italic">{t('prophet.noMatch')}</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-2 text-center flex flex-col gap-1">
                                {predictors.knn?.match ? (
                                    <>
                                        <span className="text-slate-400">{t('prophet.matchLabel')} <span className="text-blue-300">{predictors.knn.match.start}...{predictors.knn.match.end}</span></span>
                                        <span className="text-slate-400">{t('prophet.sourceLabel')} <span className="text-white font-bold text-xs">{predictors.knn.match.source}</span></span>
                                    </>
                                ) : (
                                    t('prophet.basedOnSimilarity')
                                )}
                            </div>
                        </div>

                        {/* 2. Chain Master */}
                        <div className="bg-slate-800/50 light:bg-slate-50 p-4 rounded-xl border border-slate-700 light:border-slate-200 relative group/card shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xs font-bold text-green-400 light:text-green-600 uppercase tracking-wider">🔗 {t('prophet.chainMaster')}</h3>
                                {onSave && predictors.markov.length > 0 && (
                                    <button
                                        onClick={() => onSave(predictors.markov, 'Chain Master')}
                                        className="w-6 h-6 rounded-full bg-green-500/10 text-green-300 flex items-center justify-center hover:bg-white hover:text-green-600 transition-all"
                                        title={t('prophet.save')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {predictors.markov.map(n => (
                                    <span key={n} className="w-8 h-8 rounded-full bg-slate-700 light:bg-slate-200 flex items-center justify-center text-sm font-bold text-white light:text-slate-800 shadow-inner">{n}</span>
                                ))}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-2 text-center">{t('prophet.basedOnMarkov')}</div>
                        </div>

                        {/* 3. Trend Setter */}
                        <div className="bg-slate-800/50 light:bg-slate-50 p-4 rounded-xl border border-slate-700 light:border-slate-200 relative group/card shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xs font-bold text-orange-400 light:text-orange-600 uppercase tracking-wider">📈 {t('prophet.trendSetter')}</h3>
                                {onSave && predictors.reg.length > 0 && (
                                    <button
                                        onClick={() => onSave(predictors.reg, 'Trend Setter')}
                                        className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-300 flex items-center justify-center hover:bg-white hover:text-orange-600 transition-all"
                                        title={t('prophet.save')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {predictors.reg.map(n => (
                                    <span key={n} className="w-8 h-8 rounded-full bg-slate-700 light:bg-slate-200 flex items-center justify-center text-sm font-bold text-white light:text-slate-800 shadow-inner">{n}</span>
                                ))}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-2 text-center">{t('prophet.basedOnRegression')}</div>
                        </div>

                        {/* 4. THE VERDICT */}
                        {/* 4. THE VERDICT */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 light:from-indigo-100 light:to-purple-100 p-4 rounded-xl border border-indigo-500/50 light:border-indigo-200 relative overflow-hidden group shadow-lg">
                            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-300 light:text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        ⚖️ {t('prophet.verdict')}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {predictors.consensus.map(n => (
                                            <span key={n} className="w-8 h-8 rounded-full bg-white light:bg-indigo-600 flex items-center justify-center text-sm font-bold text-indigo-900 light:text-white shadow-lg shadow-indigo-500/50">{n}</span>
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-indigo-300/70 mt-2 text-center">{t('prophet.ensembleConsensus')}</div>
                                </div>

                                {onSave && (
                                    <button
                                        onClick={() => onSave(predictors.consensus, 'Prophet Verdict')}
                                        className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center hover:bg-white hover:text-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/50"
                                        title={t('prophet.saveToVault')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Prophet;
