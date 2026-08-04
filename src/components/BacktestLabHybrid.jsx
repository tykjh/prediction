import React, { useState, useEffect, useMemo } from 'react';
import MultiBetCell from './MultiBetCell';
import { calculateHybridPrediction } from '../utils/prediction';
import { getSecureRandomSet } from '../utils/secureRandom';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

// Default Config Template
const DEFAULT_CONFIG = {
    hotCount: 10,
    coldCount: 10,
    trendDepth: 10,
    weightStrategy: 'standard', // standard, aggressive, flat
    includeSpecial: true
};

const BacktestLabHybrid = ({ historyData, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    // --- State: Global Settings ---
    const [startPeriod, setStartPeriod] = useState(0); // Index
    const [endPeriod, setEndPeriod] = useState(0);   // Index
    // Allow string for empty input handling
    const [referenceSize, setReferenceSize] = useState('100');
    const [isAccumulating, setIsAccumulating] = useState(false);

    // Multi-Bet (Global for simplicity, per User Request this might be implied global or per col? 
    // "Also result has 5 columns + 1 random... input params for front 5 cols". 
    // I will keep bet counts global to avoid UI clutter, but parameters specific.)
    const [hybridBetCount, setHybridBetCount] = useState('1');
    const [randomBetCount, setRandomBetCount] = useState('1');

    // --- State: Column Configurations (5 columns) ---
    const [columnConfigs, setColumnConfigs] = useState([
        { ...DEFAULT_CONFIG },
        { ...DEFAULT_CONFIG },
        { ...DEFAULT_CONFIG },
        { ...DEFAULT_CONFIG },
        { ...DEFAULT_CONFIG }
    ]);
    const [activeTab, setActiveTab] = useState(0); // 0-4

    // --- State: Execution ---
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Initialize Ranges
    useEffect(() => {
        if (historyData && historyData.length > 50) {
            setStartPeriod(49);
            setEndPeriod(0);
        }
    }, [historyData]);

    const updateConfig = (key, value) => {
        setColumnConfigs(prev => {
            const next = [...prev];
            next[activeTab] = { ...next[activeTab], [key]: value };
            return next;
        });
    };

    const runBacktest = async () => {
        setErrorMsg(null);

        // 1. Validate Ref Size vs Trend Depth
        const refNum = Number(referenceSize);
        if (!refNum || refNum < 20) {
            setErrorMsg(t('backtestLabHybrid.errorRefMin'));
            return;
        }

        // Check against ALL column trend depths
        let maxTrend = 0;
        columnConfigs.forEach((c, idx) => {
            if (c.trendDepth > maxTrend) maxTrend = c.trendDepth;
        });

        if (refNum < maxTrend + 20) {
            setErrorMsg(t('backtestLabHybrid.errorRefTooSmall', { refNum, maxTrend, suggestion: maxTrend + 20 }));
            return;
        }

        setIsRunning(true);
        setLogs([]);
        setSummary(null);
        setProgress(0);

        const totalSteps = startPeriod - endPeriod + 1;
        let completed = 0;
        const tempLogs = [];

        // Stats accumulators
        const stats = {
            h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, rnd: 0
        };
        const wins = {
            h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, rnd: 0
        };

        const hBetNum = Math.max(1, Number(hybridBetCount) || 1);
        const rBetNum = Math.max(1, Number(randomBetCount) || 1);

        // Game Config
        const MAX = activeGameConfig?.settings?.maxNumber || 49;
        const PICK = activeGameConfig?.settings?.pickCount || 6;

        await new Promise(r => setTimeout(r, 100));

        for (let i = startPeriod; i >= endPeriod; i--) {
            // 1. Data Prep
            const anchorIndex = startPeriod + 1 + refNum;
            const endIndex = isAccumulating ? anchorIndex : (i + 1 + refNum);
            const pastData = historyData.slice(i + 1, endIndex);

            if (pastData.length < 20) {
                console.warn(`Skipping period ${historyData[i].period} - insufficient history`);
                continue;
            }

            const target = historyData[i];
            const isSeparate = activeGameConfig?.settings?.specialNumber?.isSeparate || false;

            const targetSet = new Set(target.numbers.slice(0, PICK));
            if (!isSeparate && target.numbers[PICK]) {
                targetSet.add(target.numbers[PICK]);
            }

            // 2. Predict (5 Columns)
            // Function to generate bets for a specific config
            const generateHybridBets = (config, count) => {
                const results = [];
                const metaStats = [];
                for (let b = 0; b < count; b++) {
                    // targetHistory = pastData.slice(0, config.trendDepth) ?? No, targetHistory for Hot/Cold is based on user selection?
                    // Actually `calculateHybridPrediction` uses `targetHistory` for "Current State" (Hot/Cold NOW) and `fullHistory` for avg trends.
                    // Usually we use the whole `pastData` as `fullHistory`. 
                    // `targetHistory` should probably be `pastData` as well? 
                    // Wait, `calculateHybridPrediction` signature: (targetHistory, fullHistory, config)
                    // In `BacktestLab.jsx` we passed `pastData.slice(0, 30)` as targetHistory.
                    // But here we want it configurable? "Trend Depth" in config is used for "Group Probabilities".
                    // What about "Hot/Cold Determination Window"? 
                    // Let's assume passed `pastData` is the "available history".
                    // The function `calculateHybridPrediction` uses `config.trendDepth` internally for the Trend Analysis part.
                    // But determining "Current Hot/Cold" relies on `targetHistory`.
                    // I will pass `pastData` as `fullHistory`.
                    // And pass `pastData` as `targetHistory` but the function iterates it with weights.
                    // Ideally, the "Hot/Cold Logic" uses the *entire* weighted history or a subset?
                    // Standard practice: Use all available weighted history for Hot/Cold classification.

                    // Pass activeGameConfig.settings
                    const res = calculateHybridPrediction(pastData, pastData, config, activeGameConfig?.settings || {});
                    results.push(res.numbers);
                    metaStats.push(res.stats);
                }
                return { results, stats: metaStats[0] };
            };

            const h1 = generateHybridBets(columnConfigs[0], hBetNum);
            const h2 = generateHybridBets(columnConfigs[1], hBetNum);
            const h3 = generateHybridBets(columnConfigs[2], hBetNum);
            const h4 = generateHybridBets(columnConfigs[3], hBetNum);
            const h5 = generateHybridBets(columnConfigs[4], hBetNum);

            // Random
            const rndResults = [];
            for (let b = 0; b < rBetNum; b++) {
                const set = getSecureRandomSet(PICK, 1, MAX);
                rndResults.push(Array.from(set).sort((a, b) => a - b));
            }

            // 3. Score
            const checkHits = (preds) => {
                const hitCounts = preds.map(p => p.filter(n => targetSet.has(n)).length);
                return Math.max(...hitCounts); // Best bet counts
            };

            const hits = {
                h1: checkHits(h1.results),
                h2: checkHits(h2.results),
                h3: checkHits(h3.results),
                h4: checkHits(h4.results),
                h5: checkHits(h5.results),
                rnd: checkHits(rndResults)
            };

            // Accumulate
            Object.keys(hits).forEach(k => {
                stats[k] += hits[k];
                if (hits[k] >= 3) wins[k]++;
            });

            tempLogs.push({
                period: target.period,
                actual: target.numbers,
                predictions: {
                    h1: h1.results,
                    h2: h2.results,
                    h3: h3.results,
                    h4: h4.results,
                    h5: h5.results,
                    rnd: rndResults
                },
                meta: {
                    h1: h1.stats,
                    h2: h2.stats,
                    h3: h3.stats,
                    h4: h4.stats,
                    h5: h5.stats
                },
                hits
            });

            completed++;
            if (completed % 5 === 0) {
                setProgress(Math.round((completed / totalSteps) * 100));
                setLogs([...tempLogs].reverse());
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const count = tempLogs.length;
        if (count > 0) {
            setSummary({
                count,
                avgs: {
                    h1: (stats.h1 / count).toFixed(2),
                    h2: (stats.h2 / count).toFixed(2),
                    h3: (stats.h3 / count).toFixed(2),
                    h4: (stats.h4 / count).toFixed(2),
                    h5: (stats.h5 / count).toFixed(2),
                    rnd: (stats.rnd / count).toFixed(2)
                },
                wins: {
                    h1: ((wins.h1 / count) * 100).toFixed(1),
                    h2: ((wins.h2 / count) * 100).toFixed(1),
                    h3: ((wins.h3 / count) * 100).toFixed(1),
                    h4: ((wins.h4 / count) * 100).toFixed(1),
                    h5: ((wins.h5 / count) * 100).toFixed(1),
                    rnd: ((wins.rnd / count) * 100).toFixed(1)
                }
            });
            setLogs(tempLogs.reverse());
        } else {
            setErrorMsg(t('backtestLabHybrid.errorNoData'));
        }

        setIsRunning(false);
        setProgress(100);
    };

    // UI Helpers with Light Mode & Detailed Highlights
    const getTabColor = (index, isActive) => {
        const colors = [
            'text-blue-400 border-blue-500',
            'text-purple-400 border-purple-500',
            'text-amber-400 border-amber-500',
            'text-emerald-400 border-emerald-500',
            'text-rose-400 border-rose-500'
        ];
        const base = 'px-4 py-2 border-b-2 font-bold text-sm transition-all cursor-pointer';
        if (isActive) return `${base} ${colors[index]} bg-white/5 light:bg-slate-100`;
        return `${base} text-slate-500 border-transparent hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-50`;
    };

    return (
        <div className="w-full max-w-7xl mx-auto mt-16 mb-16">
            <div className="bg-slate-900/40 light:bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/5 light:border-slate-200 overflow-hidden shadow-2xl relative">

                {/* Header Section */}
                <div className="p-8 border-b border-white/5 light:border-slate-200 bg-gradient-to-r from-slate-900/50 to-transparent light:from-slate-50/50">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-2xl shadow-inner">
                                🧬
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white light:text-slate-800">{t('backtestLabHybrid.title')}</h2>
                                <p className="text-xs text-slate-400 light:text-slate-500 font-medium">{t('backtestLabHybrid.subtitle')}</p>
                            </div>
                        </div>
                        <HelpIcon title={t('backtestLabHybrid.help.title')} body={t('backtestLabHybrid.help.body')} />
                    </div>

                    {/* Global Simulation Controls */}
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{t('backtestLabHybrid.inputDataRef')}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" className="w-20 bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-2 py-1.5 text-xs text-white light:text-slate-800 text-center focus:outline-none focus:border-cyan-500 transition-colors"
                                    value={referenceSize}
                                    onChange={e => setReferenceSize(e.target.value)}
                                    placeholder={t('backtestLabHybrid.refPlaceholder')}
                                />
                                <label className="flex items-center gap-2 text-xs text-slate-400 light:text-slate-600 cursor-pointer select-none border border-transparent hover:border-white/10 px-2 py-1 rounded transition-colors">
                                    <input type="checkbox" checked={isAccumulating} onChange={e => setIsAccumulating(e.target.checked)} className="accent-cyan-500" />
                                    {t('backtestLabHybrid.accumulate')}
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{t('backtestLabHybrid.testRange')}</label>
                            <div className="flex items-center gap-2">
                                <select
                                    className="bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-3 py-1.5 text-xs text-white light:text-slate-800 outline-none cursor-pointer focus:border-cyan-500 transition-colors"
                                    value={startPeriod}
                                    onChange={e => setStartPeriod(Number(e.target.value))}
                                    disabled={isRunning}
                                >
                                    {historyData.map((d, i) => <option key={d.period} value={i}>{d.period}</option>)}
                                </select>
                                <span className="text-slate-600">→</span>
                                <select
                                    className="bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-3 py-1.5 text-xs text-white light:text-slate-800 outline-none cursor-pointer focus:border-cyan-500 transition-colors"
                                    value={endPeriod}
                                    onChange={e => setEndPeriod(Number(e.target.value))}
                                    disabled={isRunning}
                                >
                                    {historyData.map((d, i) => <option key={d.period} value={i}>{d.period}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{t('backtestLabHybrid.multiBets')}</label>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <input
                                        type="number" className="w-16 bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-2 py-1.5 text-xs text-cyan-300 light:text-cyan-600 text-center font-bold focus:outline-none focus:border-cyan-500"
                                        value={hybridBetCount} onChange={e => setHybridBetCount(e.target.value)}
                                    />
                                    <span className="absolute right-1 top-1.5 text-[8px] text-slate-500 pointer-events-none">HYB</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number" className="w-16 bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-2 py-1.5 text-xs text-slate-300 light:text-slate-600 text-center font-bold focus:outline-none focus:border-slate-500"
                                        value={randomBetCount} onChange={e => setRandomBetCount(e.target.value)}
                                    />
                                    <span className="absolute right-1 top-1.5 text-[8px] text-slate-500 pointer-events-none">RND</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={runBacktest}
                            disabled={isRunning}
                            className={`ml-auto px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${isRunning ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg props-hover'}`}
                        >
                            {isRunning ? t('backtestLabHybrid.running', { progress }) : t('backtestLabHybrid.executeSimulation')}
                        </button>
                    </div>

                    {/* Error Message Display */}
                    {errorMsg && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold animate-pulse">
                            ⚠️ {errorMsg}
                        </div>
                    )}
                </div>

                {/* Configuration Deck */}
                <div className="bg-black/20 light:bg-slate-50/50 border-b border-white/5 light:border-slate-200">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5 light:border-slate-200">
                        {[0, 1, 2, 3, 4].map(idx => (
                            <div
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={getTabColor(idx, activeTab === idx)}
                            >
                                {t('backtestLabHybrid.hybridTab', { n: idx + 1 })}
                            </div>
                        ))}
                    </div>

                    {/* Active Config Panel */}
                    <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">{t('backtestLabHybrid.hotPoolSize')}</label>
                            <input
                                type="range" min="1" max="25" step="1"
                                value={columnConfigs[activeTab].hotCount}
                                onChange={e => updateConfig('hotCount', Number(e.target.value))}
                                className="accent-cyan-500"
                            />
                            <div className="flex justify-between text-xs font-mono text-cyan-400 light:text-cyan-600">
                                <span>1</span>
                                <span className="font-bold text-lg">{columnConfigs[activeTab].hotCount}</span>
                                <span>25</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">{t('backtestLabHybrid.coldPoolSize')}</label>
                            <input
                                type="range" min="1" max="25" step="1"
                                value={columnConfigs[activeTab].coldCount}
                                onChange={e => updateConfig('coldCount', Number(e.target.value))}
                                className="accent-blue-500"
                            />
                            <div className="flex justify-between text-xs font-mono text-blue-400 light:text-blue-600">
                                <span>1</span>
                                <span className="font-bold text-lg">{columnConfigs[activeTab].coldCount}</span>
                                <span>25</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">{t('backtestLabHybrid.trendDepth')}</label>
                            <input
                                type="range" min="5" max="100" step="5"
                                value={columnConfigs[activeTab].trendDepth}
                                onChange={e => updateConfig('trendDepth', Number(e.target.value))}
                                className="accent-purple-500"
                            />
                            <div className="flex justify-between text-xs font-mono text-purple-400 light:text-purple-600">
                                <span>5</span>
                                <span className="font-bold text-lg">{columnConfigs[activeTab].trendDepth}</span>
                                <span>100</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">{t('backtestLabHybrid.weightStrategy')}</label>
                            <select
                                value={columnConfigs[activeTab].weightStrategy}
                                onChange={e => updateConfig('weightStrategy', e.target.value)}
                                className="bg-slate-800 light:bg-white border border-slate-700 light:border-slate-300 text-xs text-white light:text-slate-800 rounded px-3 py-2 outline-none focus:border-cyan-500"
                            >
                                <option value="standard">{t('backtestLabHybrid.weightStandard')}</option>
                                <option value="aggressive">{t('backtestLabHybrid.weightAggressive')}</option>
                                <option value="flat">{t('backtestLabHybrid.weightFlat')}</option>
                            </select>
                            <div className="text-[10px] text-slate-500 leading-tight mt-1">
                                {columnConfigs[activeTab].weightStrategy === 'aggressive' ? t('backtestLabHybrid.descAggressive') :
                                    columnConfigs[activeTab].weightStrategy === 'flat' ? t('backtestLabHybrid.descFlat') :
                                        t('backtestLabHybrid.descStandard')}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 justify-center">
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded bg-white/5 light:bg-slate-100 border border-white/5 light:border-slate-300 hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={columnConfigs[activeTab].includeSpecial}
                                    onChange={e => updateConfig('includeSpecial', e.target.checked)}
                                    className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-600 accent-cyan-500"
                                />
                                <span className="text-xs font-bold text-slate-300 light:text-slate-700">{t('backtestLabHybrid.includeSpecial')}</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Summary Panel */}
                {summary && (
                    <div className="grid grid-cols-7 divide-x divide-white/10 light:divide-slate-200 border-b border-white/10 light:border-slate-200 bg-slate-950/30 light:bg-slate-100">
                        {/* Headers */}
                        <div className="p-4 flex flex-col justify-center items-center text-slate-500 text-[10px] uppercase font-bold">{t('backtestLabHybrid.model')}</div>
                        {['h1', 'h2', 'h3', 'h4', 'h5', 'rnd'].map((k, i) => (
                            <div key={k} className="p-4 text-center">
                                <div className={`text-xs font-black uppercase mb-1 ${k === 'rnd' ? 'text-slate-500' :
                                    i === 0 ? 'text-blue-400' : i === 1 ? 'text-purple-400' : i === 2 ? 'text-amber-400' : i === 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {k === 'rnd' ? t('backtestLabHybrid.random') : t('backtestLabHybrid.hybridTab', { n: i + 1 })}
                                </div>
                                <div className="text-xl text-white light:text-slate-800 font-bold">{summary.avgs[k]} <span className="text-[10px] text-slate-500 font-normal">{t('backtestLabHybrid.avg')}</span></div>
                                <div className="text-xs text-yellow-500 font-mono">{summary.wins[k]}% <span className="text-[9px] text-slate-600">{t('backtestLabHybrid.win')}</span></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Results Table */}
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-900 light:bg-slate-50">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950 light:bg-white sticky top-0 z-50 shadow-lg">
                            <tr>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">{t('backtestLabHybrid.colPeriod')}</th>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">{t('backtestLabHybrid.colActual')}</th>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <th key={i} className="p-3 border-b border-slate-800 light:border-slate-200 min-w-[140px]">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase ${i === 0 ? 'text-blue-400' : i === 1 ? 'text-purple-400' : i === 2 ? 'text-amber-400' : i === 3 ? 'text-emerald-400' : 'text-rose-400'
                                                }`}>{t('backtestLabHybrid.hybridTab', { n: i + 1 })}</span>
                                            <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                                                H:{columnConfigs[i].hotCount} C:{columnConfigs[i].coldCount} T:{columnConfigs[i].trendDepth} {columnConfigs[i].weightStrategy[0].toUpperCase()}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">{t('backtestLabHybrid.random')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 light:divide-slate-200">
                            {logs.map(log => {
                                const isSeparate = activeGameConfig?.settings?.specialNumber?.isSeparate || false;
                                const PICK = activeGameConfig?.settings?.pickCount || 6;

                                const targetSet = new Set(log.actual.slice(0, PICK));
                                if (!isSeparate && log.actual[PICK]) {
                                    targetSet.add(log.actual[PICK]);
                                }

                                const getCell = (preds, hits, stats = null) => {
                                    // Use Config or Default
                                    const JACKPOT = activeGameConfig?.settings?.prizeRules?.jackpotHits || 6;

                                    // Match styles from BacktestLab Highlighting
                                    let bg = 'p-3';
                                    if (hits >= JACKPOT) bg = "p-3 bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.3)_0px,rgba(239,68,68,0.3)_10px,rgba(249,115,22,0.3)_10px,rgba(249,115,22,0.3)_20px,rgba(234,179,8,0.3)_20px,rgba(234,179,8,0.3)_30px,rgba(34,197,94,0.3)_30px,rgba(34,197,94,0.3)_40px,rgba(59,130,246,0.3)_40px,rgba(59,130,246,0.3)_50px)] border-4 border-yellow-400 shadow-[0_0_20px_-3px_rgba(234,179,8,0.5)] relative overflow-hidden backdrop-brightness-125";
                                    else if (hits === JACKPOT - 1) bg = "p-3 bg-[repeating-linear-gradient(45deg,rgba(168,85,247,0.25)_0px,rgba(168,85,247,0.25)_10px,rgba(239,68,68,0.25)_10px,rgba(239,68,68,0.25)_20px)] border-2 border-purple-500/50 shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)] relative overflow-hidden backdrop-brightness-110";
                                    else if (hits === JACKPOT - 2) bg = "p-3 bg-gradient-to-br from-red-500/10 via-orange-600/5 to-transparent light:bg-red-100 light:border-red-400 border-2 border-red-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] relative overflow-hidden backdrop-brightness-110";
                                    else if (hits === JACKPOT - 3) bg = "p-3 bg-gradient-to-br from-yellow-400/10 via-yellow-600/5 to-transparent light:bg-yellow-100 light:border-yellow-400 border-2 border-yellow-400/40 shadow-[0_0_15px_-3px_rgba(250,204,21,0.2)] relative overflow-hidden backdrop-brightness-110";

                                    return (
                                        <div className={`h-full w-full ${bg} transition-all duration-300`}>
                                            <MultiBetCell
                                                predictions={preds}
                                                targetSet={targetSet}
                                                specialNum={log.actual[PICK]}
                                                maxHits={hits}
                                                isSeparate={isSeparate}
                                            />
                                            {stats && (
                                                <div className="text-[9px] text-slate-500 light:text-slate-600 mt-2 font-mono whitespace-nowrap">
                                                    H:{stats.avgHot} C:{stats.avgCold} N:{stats.avgNeutral}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return (
                                    <tr key={log.period} className="hover:bg-white/5 light:hover:bg-slate-100 transition-colors">
                                        <td className="p-3 text-xs font-mono text-slate-400 light:text-slate-500 border-r border-slate-800/50 light:border-slate-200">{log.period}</td>
                                        <td className="p-3 border-r border-slate-800/50 light:border-slate-200 bg-black/10 light:bg-slate-100">
                                            <div className="flex flex-wrap gap-1 w-max">
                                                {log.actual.slice(0, PICK).map(n => (
                                                    <span key={n} className="w-5 h-5 rounded-full bg-slate-700 light:bg-slate-200 text-white light:text-slate-700 flex items-center justify-center text-[9px] font-bold">{n}</span>
                                                ))}
                                                {!isSeparate && activeGameConfig?.settings?.specialNumber?.enabled && log.actual[PICK] && <span className="w-5 h-5 rounded-full bg-indigo-900 light:bg-indigo-100 text-indigo-300 light:text-indigo-700 flex items-center justify-center text-[9px] font-bold">{log.actual[PICK]}</span>}
                                            </div>
                                        </td>
                                        <td className="p-0 border-r border-slate-800/30 light:border-slate-200">{getCell(log.predictions.h1, log.hits.h1, log.meta.h1)}</td>
                                        <td className="p-0 border-r border-slate-800/30 light:border-slate-200">{getCell(log.predictions.h2, log.hits.h2, log.meta.h2)}</td>
                                        <td className="p-0 border-r border-slate-800/30 light:border-slate-200">{getCell(log.predictions.h3, log.hits.h3, log.meta.h3)}</td>
                                        <td className="p-0 border-r border-slate-800/30 light:border-slate-200">{getCell(log.predictions.h4, log.hits.h4, log.meta.h4)}</td>
                                        <td className="p-0 border-r border-slate-800/30 light:border-slate-200">{getCell(log.predictions.h5, log.hits.h5, log.meta.h5)}</td>
                                        <td className="p-0 opacity-70">{getCell(log.predictions.rnd, log.hits.rnd)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BacktestLabHybrid;
