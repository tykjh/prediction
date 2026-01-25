import React, { useState, useEffect } from 'react';
import MultiBetCell from './MultiBetCell';
import { calculateHybridPrediction } from '../utils/prediction';
import { getSecureRandomSet } from '../utils/secureRandom';

// Default Config Template
const DEFAULT_CONFIG = {
    hotCount: 3,
    coldCount: 3,
    trendDepth: 10,
    weightStrategy: 'standard', // standard, aggressive, flat
    includeSpecial: false // Not relevant for single zone but kept for structure
};

const ZoneTwoHybrid = ({ zoneHistory, isLightMode }) => {
    // zoneHistory comes in as array of { period, val, isOdd, isBig ... }
    // We need to transform it to standard "Draw History" format for the predictor
    // Format: { period, numbers: [val] } 

    // --- State: Global Settings ---
    const [startPeriod, setStartPeriod] = useState(0); // Index
    const [endPeriod, setEndPeriod] = useState(0);   // Index
    const [referenceSize, setReferenceSize] = useState('50');
    const [isAccumulating, setIsAccumulating] = useState(false);

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
        if (zoneHistory && zoneHistory.length > 50) {
            setStartPeriod(49);
            setEndPeriod(0);
        }
    }, [zoneHistory]);

    const updateConfig = (key, value) => {
        setColumnConfigs(prev => {
            const next = [...prev];
            next[activeTab] = { ...next[activeTab], [key]: value };
            return next;
        });
    };

    const runBacktest = async () => {
        setErrorMsg(null);

        // 1. Data Transformation
        // We create a mock "fullHistory" structure that the predictor understands
        const mockHistory = zoneHistory.map(d => ({
            period: d.period,
            numbers: [d.val] // Treat the single zone number as the only number in the draw
        }));

        // 2. Validate Ref Size
        const refNum = Number(referenceSize);
        if (!refNum || refNum < 10) {
            setErrorMsg("Reference Depth must be at least 10.");
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
        const stats = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, rnd: 0 };
        const wins = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, rnd: 0 };

        const hBetNum = Math.max(1, Number(hybridBetCount) || 1);
        const rBetNum = Math.max(1, Number(randomBetCount) || 1);

        // Mock Game Config for Zone 2 (1-8)
        const mockGameConfig = {
            maxNumber: 8,
            pickCount: 1,
            specialNumber: { isSeparate: false }
        };
        const MAX = 8;
        const PICK = 1;

        await new Promise(r => setTimeout(r, 100));

        for (let i = startPeriod; i >= endPeriod; i--) {
            // 1. Data Prep
            const anchorIndex = startPeriod + 1 + refNum;
            const endIndex = isAccumulating ? anchorIndex : (i + 1 + refNum);

            // Slice format: [newest ... oldest]
            // We need past data relative to current 'i'
            // history[i] is TARGET. history[i+1...end] is PAST.
            const pastData = mockHistory.slice(i + 1, endIndex);

            if (pastData.length < 10) {
                continue;
            }

            const target = mockHistory[i];

            // 2. Predict
            const generateHybridBets = (config, count) => {
                const results = [];
                const metaStats = [];
                for (let b = 0; b < count; b++) {
                    const res = calculateHybridPrediction(pastData, pastData, config, mockGameConfig);
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
                rndResults.push(Array.from(set));
            }

            // 3. Score
            const targetVal = target.numbers[0];
            const checkHits = (preds) => {
                // preds is array of arrays [[x], [y]]
                // hit if any array contains targetVal
                let maxHit = 0;
                preds.forEach(p => {
                    if (p.includes(targetVal)) maxHit = 1;
                });
                return maxHit;
            };

            const hits = {
                h1: checkHits(h1.results),
                h2: checkHits(h2.results),
                h3: checkHits(h3.results),
                h4: checkHits(h4.results),
                h5: checkHits(h5.results),
                rnd: checkHits(rndResults)
            };

            Object.keys(hits).forEach(k => {
                stats[k] += hits[k];
                if (hits[k] > 0) wins[k]++;
            });

            tempLogs.push({
                period: target.period,
                actual: target.numbers,
                predictions: {
                    h1: h1.results, h2: h2.results, h3: h3.results, h4: h4.results, h5: h5.results, rnd: rndResults
                },
                meta: {
                    h1: h1.stats, h2: h2.stats, h3: h3.stats, h4: h4.stats, h5: h5.stats
                },
                hits
            });

            completed++;
            if (completed % 10 === 0) {
                setProgress(Math.round((completed / totalSteps) * 100));
                setLogs([...tempLogs].reverse());
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const count = tempLogs.length;
        if (count > 0) {
            setSummary({
                count,
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
        }

        setIsRunning(false);
        setProgress(100);
    };

    // UI Helpers
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

    if (!zoneHistory || zoneHistory.length === 0) return null;

    return (
        <div className="w-full">
            <div className="bg-slate-900/40 light:bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/5 light:border-slate-200 overflow-hidden shadow-xl relative">

                {/* Header */}
                <div className="p-8 border-b border-white/5 light:border-slate-200 bg-gradient-to-r from-slate-900/50 to-transparent light:from-slate-50/50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner">
                            🔬
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white light:text-slate-800">Parametric Hybrid Lab</h2>
                            <p className="text-xs text-slate-400 light:text-slate-500 font-medium">Fine-tune Hot/Cold strategies for Zone 2</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Input Data Ref</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" className="w-20 bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-2 py-1.5 text-xs text-white light:text-slate-800 text-center focus:outline-none focus:border-cyan-500"
                                    value={referenceSize} onChange={e => setReferenceSize(e.target.value)}
                                />
                                <label className="flex items-center gap-2 text-xs text-slate-400 light:text-slate-600 cursor-pointer select-none">
                                    <input type="checkbox" checked={isAccumulating} onChange={e => setIsAccumulating(e.target.checked)} className="accent-cyan-500" />
                                    Accumulate
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Test Range</label>
                            <div className="flex items-center gap-2">
                                <select
                                    className="bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-3 py-1.5 text-xs text-white light:text-slate-800 outline-none cursor-pointer focus:border-cyan-500"
                                    value={startPeriod} onChange={e => setStartPeriod(Number(e.target.value))}
                                    disabled={isRunning}
                                >
                                    {zoneHistory.map((d, i) => <option key={d.period} value={i}>{d.period}</option>)}
                                </select>
                                <span className="text-slate-600">→</span>
                                <select
                                    className="bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-3 py-1.5 text-xs text-white light:text-slate-800 outline-none cursor-pointer focus:border-cyan-500"
                                    value={endPeriod} onChange={e => setEndPeriod(Number(e.target.value))}
                                    disabled={isRunning}
                                >
                                    {zoneHistory.map((d, i) => <option key={d.period} value={i}>{d.period}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Multi-Bets</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" className="w-16 bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-2 py-1.5 text-xs text-cyan-300 light:text-cyan-600 text-center font-bold focus:outline-none focus:border-cyan-500"
                                    value={hybridBetCount} onChange={e => setHybridBetCount(e.target.value)}
                                />
                                <input
                                    type="number" className="w-16 bg-black/20 light:bg-white border border-white/10 light:border-slate-300 rounded px-2 py-1.5 text-xs text-slate-300 light:text-slate-600 text-center font-bold focus:outline-none focus:border-slate-500"
                                    value={randomBetCount} onChange={e => setRandomBetCount(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={runBacktest}
                            disabled={isRunning}
                            className={`ml-auto px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${isRunning ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'}`}
                        >
                            {isRunning ? `Running ${progress}%` : 'Execute Simulation'}
                        </button>
                    </div>
                    {errorMsg && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold animate-pulse">
                            ⚠️ {errorMsg}
                        </div>
                    )}
                </div>

                {/* Config Deck */}
                <div className="bg-black/20 light:bg-slate-50/50 border-b border-white/5 light:border-slate-200">
                    <div className="flex border-b border-white/5 light:border-slate-200">
                        {[0, 1, 2, 3, 4].map(idx => (
                            <div key={idx} onClick={() => setActiveTab(idx)} className={getTabColor(idx, activeTab === idx)}>
                                Strat {idx + 1}
                            </div>
                        ))}
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">Hot Count</label>
                            <input type="range" min="1" max="8" step="1" value={columnConfigs[activeTab].hotCount} onChange={e => updateConfig('hotCount', Number(e.target.value))} className="accent-cyan-500" />
                            <div className="text-center text-xs font-mono text-cyan-400">{columnConfigs[activeTab].hotCount}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">Cold Count</label>
                            <input type="range" min="1" max="8" step="1" value={columnConfigs[activeTab].coldCount} onChange={e => updateConfig('coldCount', Number(e.target.value))} className="accent-blue-500" />
                            <div className="text-center text-xs font-mono text-blue-400">{columnConfigs[activeTab].coldCount}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">Trend Depth</label>
                            <input type="range" min="5" max="50" step="5" value={columnConfigs[activeTab].trendDepth} onChange={e => updateConfig('trendDepth', Number(e.target.value))} className="accent-purple-500" />
                            <div className="text-center text-xs font-mono text-purple-400">{columnConfigs[activeTab].trendDepth}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-bold">Strategy</label>
                            <select value={columnConfigs[activeTab].weightStrategy} onChange={e => updateConfig('weightStrategy', e.target.value)} className="bg-slate-800 light:bg-white text-xs text-white light:text-slate-800 rounded px-2 py-1 outline-none">
                                <option value="standard">Standard</option>
                                <option value="aggressive">Aggressive</option>
                                <option value="flat">Flat</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Panel */}
                {summary && (
                    <div className="grid grid-cols-7 divide-x divide-white/10 light:divide-slate-200 border-b border-white/10 light:border-slate-200 bg-slate-950/30 light:bg-slate-100">
                        <div className="p-4 flex flex-col justify-center items-center text-slate-500 text-[10px] uppercase font-bold">Win Rate</div>
                        {['h1', 'h2', 'h3', 'h4', 'h5', 'rnd'].map((k, i) => (
                            <div key={k} className="p-4 text-center">
                                <div className="text-xl text-yellow-500 font-bold">{summary.wins[k]}%</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Results Table */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar bg-slate-900 light:bg-slate-50">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950/90 light:bg-white sticky top-0 z-20 backdrop-blur-md shadow-lg">
                            <tr>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">Period</th>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">Actual</th>
                                {[1, 2, 3, 4, 5].map(i => <th key={i} className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">Strat {i}</th>)}
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 light:border-slate-200">Random</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 light:divide-slate-200">
                            {logs.map(log => {
                                const actual = log.actual[0];
                                const Cell = ({ preds }) => {
                                    const isHit = preds.find(p => p.includes(actual));
                                    const bg = isHit ? 'bg-rose-500/20 text-rose-300 light:text-rose-700 font-bold' : 'text-slate-500 light:text-slate-400';
                                    return (
                                        <div className={`text-xs font-mono p-2 rounded ${bg}`}>
                                            {preds.map(p => p[0]).join(', ')}
                                        </div>
                                    )
                                };
                                return (
                                    <tr key={log.period} className="hover:bg-white/5 light:hover:bg-slate-100">
                                        <td className="p-3 text-xs font-mono text-slate-400 light:text-slate-500">{log.period}</td>
                                        <td className="p-3 text-sm font-black text-white light:text-slate-900 bg-black/10 light:bg-white">{actual}</td>
                                        <td className="p-2"><Cell preds={log.predictions.h1} /></td>
                                        <td className="p-2"><Cell preds={log.predictions.h2} /></td>
                                        <td className="p-2"><Cell preds={log.predictions.h3} /></td>
                                        <td className="p-2"><Cell preds={log.predictions.h4} /></td>
                                        <td className="p-2"><Cell preds={log.predictions.h5} /></td>
                                        <td className="p-2 opacity-50"><Cell preds={log.predictions.rnd} /></td>
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

export default ZoneTwoHybrid;
