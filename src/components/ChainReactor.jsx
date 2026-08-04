import React, { useState, useEffect, useMemo } from 'react';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

const ChainReactor = ({ history, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    const [range, setRange] = useState(100);
    const [analysis, setAnalysis] = useState(null);

    // 1. Core Analysis Logic
    const ignite = () => {
        const data = history.slice(0, range);
        const totalDraws = data.length;
        const MAX = activeGameConfig?.settings?.maxNumber || 49;
        const PICK = activeGameConfig?.settings?.pickCount || 6; // Standardize

        // 1. Calculate Individual Number "Heat" (Frequency)
        // This answers: "is this number a hot number?"
        const heatMap = {};
        for (let i = 1; i <= MAX; i++) heatMap[i] = 0;

        // FIXED: Only analyze first PICK numbers (Main Zone)
        data.forEach(d => {
            d.numbers.slice(0, PICK).forEach(n => {
                if (n <= MAX) heatMap[n]++;
            });
        });

        // Normalize Heat (0 to 1 scale relative to max)
        const maxHeat = Math.max(...Object.values(heatMap)) || 1;

        // 2. Scan History for actual Pair Frequencies AND Draw Hit Rates
        const linkFreq = { 2: {}, 3: {}, 4: {} };
        let drawsWith2 = 0;
        let drawsWith3 = 0;
        let drawsWith4 = 0;

        data.forEach(draw => {
            // FIXED: Filter numbers out of range if game type changed? Ideally history matches game type.
            // AND Slice to PICK to exclude Special Number
            const nums = [...draw.numbers.slice(0, PICK)].filter(n => n <= MAX).sort((a, b) => a - b);

            // 1. Group into consecutive sequences
            // e.g., [1, 2, 3, 10, 11] -> [[1,2,3], [10,11]]
            const distinctSeqs = [];
            if (nums.length > 0) {
                let current = [nums[0]];
                for (let i = 1; i < nums.length; i++) {
                    if (nums[i] === nums[i - 1] + 1) {
                        current.push(nums[i]);
                    } else {
                        if (current.length >= 2) distinctSeqs.push(current);
                        current = [nums[i]];
                    }
                }
                if (current.length >= 2) distinctSeqs.push(current);
            }

            let has2 = false;
            let has3 = false;
            let has4 = false;

            // 2. Process disjoint sequences strictly
            distinctSeqs.forEach(seq => {
                const len = seq.length;
                if (len === 2) {
                    has2 = true;
                    const key = seq.join('-');
                    linkFreq[2][key] = (linkFreq[2][key] || 0) + 1;
                }
                else if (len === 3) {
                    has3 = true;
                    const key = seq.join('-');
                    linkFreq[3][key] = (linkFreq[3][key] || 0) + 1;
                }
                else if (len >= 4) {
                    has4 = true;
                    // Take first 4 or usage logic? 
                    // User asks for 4-link stats. We'll store the full sequence or just the identifier?
                    // To keep candidate generation simple, let's just store the first 4 if len > 4, or just treat as 4.
                    // Actually, if it's 5 numbers, it's a 5-link. But we only track up to 4. 
                    // Let's count it as 4-link for hit rate, and store the "key" up to 4 for frequency matching?
                    // Or strict exact match? User said 2/3/4.
                    // If 1-2-3-4-5 happens, does it count as 4-link? Yes probably.
                    // Does it count as 2-link? No.
                    const key = seq.slice(0, 4).join('-');
                    linkFreq[4][key] = (linkFreq[4][key] || 0) + 1;
                }
            });

            if (has2) drawsWith2++;
            if (has3) drawsWith3++;
            if (has4) drawsWith4++;
        });

        // 3. Generate & Score Candidates
        // We look at ALL possible consecutive combinations, not just ones that happened.
        // Score = (Heat_A + Heat_B + ...) * Weight_Heat + (Historical_Freq) * Weight_History

        const generateCandidates = (length) => {
            const candidates = [];
            const limit = MAX - length + 1;

            for (let start = 1; start <= limit; start++) {
                const combo = [];
                let totalHeat = 0;

                for (let k = 0; k < length; k++) {
                    const num = start + k;
                    combo.push(num);
                    totalHeat += (heatMap[num] / maxHeat); // Normalized heat contribution
                }

                const key = combo.join('-');
                const historyCount = linkFreq[length][key] || 0;
                const historyScore = (historyCount / totalDraws) * 10; // Normalized-ish

                // Formula: 70% based on recent Heat (Trend), 30% on History
                // This allows "Hot numbers forming new pairs" to rise to the top
                const score = (totalHeat * 70) + (historyScore * 30);

                candidates.push({
                    nums: combo,
                    score: score,
                    history: historyCount,
                    avgHeat: Math.round((totalHeat / length) * 100)
                });
            }
            // Sort by score descending
            return candidates.sort((a, b) => b.score - a.score).slice(0, 5); // Return top 5
        };

        setAnalysis({
            // Probability of ANY link appearing (Draw Hit Rate)
            globalProbs: {
                prob2: totalDraws > 0 ? (drawsWith2 / totalDraws) * 100 : 0,
                prob3: totalDraws > 0 ? (drawsWith3 / totalDraws) * 100 : 0,
                prob4: totalDraws > 0 ? (drawsWith4 / totalDraws) * 100 : 0
            },
            candidates: {
                top2: generateCandidates(2),
                top3: generateCandidates(3),
                top4: generateCandidates(4)
            }
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-8">
            <div className="bg-slate-900/50 light:bg-white rounded-2xl p-6 border border-slate-800 light:border-slate-200 shadow-xl light:shadow-lg">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
                            ⛓️ The Chain Reactor <span className="text-xs bg-rose-900/50 light:bg-rose-100 text-rose-300 light:text-rose-700 px-2 py-0.5 rounded border border-rose-700/50 light:border-rose-200">EXP-05</span>
                        </h2>
                        <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                            {t('chainReactor.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t('chainReactor.refData')}</label>
                            <select
                                value={range}
                                onChange={(e) => setRange(Number(e.target.value))}
                                className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {Array.from({ length: Math.ceil(history.length / 10) }, (_, i) => (i + 1) * 10).map(val => (
                                    <option key={val} value={val}>{t('chainReactor.lastN', { n: val })}</option>
                                ))}
                                <option value={history.length}>{t('chainReactor.allN', { n: history.length })}</option>
                            </select>
                        </div>

                        <button
                            onClick={ignite}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-rose-500/30 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-rose-500/50 hover:ring-2 hover:ring-white/20 ml-2"
                        >
                            {t('chainReactor.ignite')}
                        </button>

                        <HelpIcon title={t('chainReactor.help.title')} body={t('chainReactor.help.body')} />
                    </div>
                </div>

                {/* Dashboard */}
                {analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                        {/* 2-Link Card */}
                        <div className="bg-slate-800/50 light:bg-slate-50 p-5 rounded-xl border border-slate-700 light:border-slate-200 relative overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">{t('chainReactor.link2')}</h3>
                                <span className="text-xs font-mono text-emerald-400 light:text-emerald-700 bg-emerald-900/30 light:bg-emerald-100 px-2 py-1 rounded">{t('chainReactor.hitRate', { pct: analysis.globalProbs.prob2.toFixed(0) })}</span>
                            </div>

                            <div className="space-y-3">
                                {analysis.candidates.top2.map((cand, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30 light:bg-white border border-slate-700/50 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-50 transition-colors">
                                        <div className="flex gap-1">
                                            {cand.nums.map(n => (
                                                <span key={n} className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-emerald-500/30">{n}</span>
                                            ))}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[10px] text-slate-400 light:text-slate-500 mb-1">
                                                <span>{t('chainReactor.strength')}</span>
                                                <span className="text-emerald-300 light:text-emerald-600">{t('chainReactor.hot', { pct: cand.avgHeat })}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 light:bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(cand.score / 2, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3-Link Card */}
                        <div className="bg-slate-800/50 light:bg-slate-50 p-5 rounded-xl border border-slate-700 light:border-slate-200 relative overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">{t('chainReactor.link3')}</h3>
                                <span className="text-xs font-mono text-amber-400 light:text-amber-700 bg-amber-900/30 light:bg-amber-100 px-2 py-1 rounded">{t('chainReactor.hitRate', { pct: analysis.globalProbs.prob3.toFixed(0) })}</span>
                            </div>

                            <div className="space-y-3">
                                {analysis.candidates.top3.length > 0 ? analysis.candidates.top3.map((cand, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30 light:bg-white border border-slate-700/50 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-50 transition-colors">
                                        <div className="flex gap-1">
                                            {cand.nums.map(n => (
                                                <span key={n} className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-amber-500/30">{n}</span>
                                            ))}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[10px] text-slate-400 light:text-slate-500 mb-1">
                                                <span>{t('chainReactor.strength')}</span>
                                                <span className="text-amber-300 light:text-amber-600">{t('chainReactor.hot', { pct: cand.avgHeat })}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 light:bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-amber-500 h-full" style={{ width: `${Math.min(cand.score / 2, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="text-xs text-slate-500 text-center py-4">{t('chainReactor.noCandidates')}</div>}
                            </div>
                        </div>

                        {/* 4-Link Card */}
                        <div className="bg-slate-800/50 light:bg-slate-50 p-5 rounded-xl border border-slate-700 light:border-slate-200 relative overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">{t('chainReactor.link4')}</h3>
                                <span className="text-xs font-mono text-rose-400 light:text-rose-700 bg-rose-900/30 light:bg-rose-100 px-2 py-1 rounded">{t('chainReactor.hitRate', { pct: analysis.globalProbs.prob4.toFixed(0) })}</span>
                            </div>

                            <div className="space-y-3">
                                {analysis.candidates.top4.length > 0 ? analysis.candidates.top4.map((cand, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30 light:bg-white border border-slate-700/50 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-50 transition-colors">
                                        <div className="flex gap-1">
                                            {cand.nums.map(n => (
                                                <span key={n} className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-rose-500/30">{n}</span>
                                            ))}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[10px] text-slate-400 light:text-slate-500 mb-1">
                                                <span>{t('chainReactor.strength')}</span>
                                                <span className="text-rose-300 light:text-rose-600">{t('chainReactor.hot', { pct: cand.avgHeat })}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 light:bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-rose-500 h-full" style={{ width: `${Math.min(cand.score / 2, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="text-xs text-slate-500 text-center py-4">No strong candidates</div>}
                            </div>
                        </div>

                    </div>
                )}


            </div>
        </div>
    );
};

export default ChainReactor;
