import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

// Helper to calc hot/cold from previous data
const analyzePriorStats = (priorHistory, includeSpecial, gameConfig, limit) => {
    // defaults
    const maxNum = gameConfig?.settings?.maxNumber || 49;
    const scores = Array(maxNum).fill(0);
    const isSpecialSeparate = gameConfig?.settings?.specialNumber?.isSeparate || false;

    // Apply Lookback Limit (N)
    const activeHistory = limit ? priorHistory.slice(0, limit) : priorHistory;

    activeHistory.forEach((draw, index) => {
        let weight = 1;
        if (index < 10) weight = 10;          // 0-9: +10
        else if (index < 20) weight = 7;      // 10-19: +7
        else if (index < 30) weight = 4;      // 20-29: +4
        else if (index < 50) weight = 3;      // 30-49: +3
        else if (index < 80) weight = 2;      // 50-79: +2
        else if (index < 150) weight = 1;     // 80-149: +1
        else weight = 0.5;                    // 150+: +0.5

        // Main Numbers (First N)
        const pickCount = gameConfig?.settings?.pickCount || 6;
        draw.numbers.slice(0, pickCount).forEach(num => {
            if (num >= 1 && num <= maxNum) scores[num - 1] += weight;
        });

        // Special Number Logic
        // Only include special in MAIN stats if it is NOT separate (like Lotto 6/49)
        // If it is separate (Super Lotto), do NOT mix it into the main 1-38 stats.
        if (includeSpecial && !isSpecialSeparate && draw.numbers[pickCount]) {
            const sp = draw.numbers[pickCount];
            if (sp >= 1 && sp <= maxNum) scores[sp - 1] += (weight * 0.5);
        }
    });

    // Return full ranked list for dynamic slicing
    const ranked = scores.map((s, i) => ({ num: i + 1, score: s }))
        .sort((a, b) => b.score - a.score);

    return ranked;
};

const HistoryList = ({
    historyData,
    activeGameConfig,
    // Contextual AI Params (Lifted)
    highlightCount,
    setHighlightCount,
    hotColdRange,
    setHotColdRange,
    analysisDepth,
    setAnalysisDepth
}) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('All');
    const [analyzeIncludeSpecial, setAnalyzeIncludeSpecial] = useState(true);
    const [historyOffset, setHistoryOffset] = useState(0); // 0 = Latest

    const pickCount = activeGameConfig?.settings?.pickCount || 6;
    const hasSpecial = activeGameConfig?.settings?.specialNumber?.enabled || false;

    // "Time Travel" View of Data
    const effectiveHistory = useMemo(() => {
        if (!historyData) return [];
        return historyData.slice(historyOffset);
    }, [historyData, historyOffset]);

    // Analyze LAST N DRAWS relative to offset
    const recentAnalysisMap = useMemo(() => {
        if (!historyData || historyData.length < 2) return {};

        const analysisMap = {};
        // Use user-defined depth or full length if 0
        const depthLimit = analysisDepth > 0 ? analysisDepth : historyData.length;

        // We analyze rows from `historyOffset` to `historyOffset + hotColdRange`
        // But map keys should probably be the *absolute* index or relative?
        // Let's use relative index (0 to N) matching filtered view rows?
        // No, map key needs to match the item we are rendering.
        // Let's map by `draw.period` to be safe/stable.

        // Loop through the *visible view* indices (0 to hotColdRange)
        for (let i = 0; i < hotColdRange; i++) {
            // Absolute index in original data
            const absIndex = historyOffset + i;
            if (absIndex + 1 >= historyData.length) break;

            const targetDraw = historyData[absIndex];
            const priorHistory = historyData.slice(absIndex + 1);

            // Map by Period for robust lookups
            analysisMap[targetDraw.period] = analyzePriorStats(priorHistory, analyzeIncludeSpecial, activeGameConfig, depthLimit);
        }
        return analysisMap;
    }, [historyData, analyzeIncludeSpecial, activeGameConfig, hotColdRange, historyOffset, analysisDepth]);

    const availableYears = useMemo(() => {
        if (!effectiveHistory) return [];
        const years = new Set(effectiveHistory.map(d => d.period.substring(0, 3)));
        return Array.from(years).sort().reverse();
    }, [effectiveHistory]);

    const filteredHistory = useMemo(() => {
        let data = effectiveHistory;
        if (selectedYear !== 'All') {
            data = data.filter(d => d.period.startsWith(selectedYear));
        }
        if (searchTerm) {
            data = data.filter(item =>
                item.period.includes(searchTerm) ||
                (item.date && item.date.includes(searchTerm))
            );
        }
        return data;
    }, [effectiveHistory, searchTerm, selectedYear]);

    const getStatsForDraw = (draw) => {
        // Find mapped stats by period
        if (recentAnalysisMap[draw.period]) {
            const ranked = recentAnalysisMap[draw.period];
            // Calculate sets dynamic to highlightCount
            const hotSet = new Set(ranked.slice(0, highlightCount).map(r => r.num));
            const maxNum = activeGameConfig?.settings?.maxNumber || 49;
            // Ensure cold slice doesn't overlap hot if count is huge
            const coldStart = Math.max(highlightCount, maxNum - highlightCount);
            const coldSet = new Set(ranked.slice(coldStart, maxNum).map(r => r.num));
            return { hotSet, coldSet };
        }
        return null;
    };

    const getNumberColor = (num, stats) => {
        if (!stats) return "bg-slate-700/80 text-white light:bg-slate-200 light:text-slate-900 light:font-bold";

        if (stats.hotSet.has(num)) return "bg-red-600/90 text-white shadow-red-500/20 light:bg-red-500 light:text-white font-bold ring-1 ring-white/20";
        if (stats.coldSet.has(num)) return "bg-blue-600/90 text-white shadow-blue-500/20 light:bg-blue-500 light:text-white font-bold ring-1 ring-white/20";
        return "bg-slate-700/80 text-white light:bg-slate-200 light:text-slate-900 light:font-bold";
    };

    // Calculate Contextual Stats (Trend & Current Hot/Cold)
    const contextualStats = useMemo(() => {
        if (!effectiveHistory || effectiveHistory.length < 20) return null;

        const trendLimit = hotColdRange;
        const hotLimit = highlightCount;
        const coldLimit = highlightCount;

        // 1. Trend Analysis
        let totalHotHits = 0;
        let totalColdHits = 0;
        let totalNeutralHits = 0;

        effectiveHistory.slice(0, trendLimit).forEach((draw, i) => {
            const prior = effectiveHistory.slice(i + 1);
            const ranked = analyzePriorStats(prior, analyzeIncludeSpecial, activeGameConfig, analysisDepth);
            const hotSet = new Set(ranked.slice(0, hotLimit).map(r => r.num));
            const coldSet = new Set(ranked.slice(ranked.length - coldLimit).map(r => r.num));

            draw.numbers.slice(0, pickCount).forEach(num => {
                if (hotSet.has(num)) totalHotHits++;
                else if (coldSet.has(num)) totalColdHits++;
                else totalNeutralHits++;
            });
        });

        // 2. Current Hot/Cold
        const currentRanked = analyzePriorStats(effectiveHistory, analyzeIncludeSpecial, activeGameConfig, analysisDepth);
        const currentHot = currentRanked.slice(0, hotLimit).map(r => r.num).sort((a, b) => a - b);
        const currentCold = currentRanked.slice(currentRanked.length - coldLimit).map(r => r.num).sort((a, b) => a - b);

        return {
            avgHot: (totalHotHits / trendLimit).toFixed(1),
            avgCold: (totalColdHits / trendLimit).toFixed(1),
            avgNeutral: (totalNeutralHits / trendLimit).toFixed(1),
            currentHot,
            currentCold,
            trendLimit,
            analysisDepth // pass for display
        };
    }, [effectiveHistory, hotColdRange, highlightCount, analyzeIncludeSpecial, activeGameConfig, pickCount, analysisDepth]);

    if (!historyData || historyData.length === 0) return null;
    const TOTAL_HISTORY = historyData.length;

    return (
        <div className="bg-slate-900/40 light:bg-white backdrop-blur-md rounded-2xl p-6 border border-white/5 light:border-slate-300 shadow-inner light:shadow-none mt-8 overflow-hidden">

            {/* Header and Controls */}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
                    <h2 className="text-xl font-bold text-slate-200 light:text-slate-900 flex items-center gap-3">
                        <span className="text-2xl">📜</span> {t('historyList.title')}
                        <span className="text-xs font-black text-slate-900 light:text-slate-600 bg-white light:bg-slate-200 px-2 py-0.5 rounded-full shadow-lg shadow-white/20 light:shadow-none border light:border-slate-300">
                            {filteredHistory.length}
                        </span>
                    </h2>

                    <div className="flex flex-wrap justify-center items-center gap-4 bg-slate-950/30 light:bg-slate-100/50 p-2 rounded-2xl border border-white/5 light:border-slate-200">
                        {/* 1. Highlight Qty */}
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-bold text-slate-400 light:text-slate-600 uppercase">{t('historyList.hlQty')}</span>
                            <input
                                type="range"
                                min="3"
                                max="15"
                                step="1"
                                value={highlightCount}
                                onChange={(e) => setHighlightCount(Number(e.target.value))}
                                className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <span className="text-xs font-mono font-bold text-purple-400 light:text-purple-600 w-4 text-right">{highlightCount}</span>
                        </div>

                        {/* 2. Analysis Depth (N) */}
                        <div className="flex items-center gap-2 px-2 border-l border-white/10 light:border-slate-300">
                            <span className="text-[10px] font-bold text-slate-400 light:text-slate-600 uppercase">{t('historyList.lookbackN')}</span>
                            <input
                                type="range"
                                min="10"
                                max={TOTAL_HISTORY}
                                step="10"
                                value={analysisDepth === 0 ? TOTAL_HISTORY : analysisDepth}
                                onChange={(e) => setAnalysisDepth(Number(e.target.value) === TOTAL_HISTORY ? 0 : Number(e.target.value))}
                                className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-xs font-mono font-bold text-emerald-400 light:text-emerald-600 w-8 text-right">
                                {analysisDepth === 0 ? t('historyList.all') : analysisDepth}
                            </span>
                        </div>

                        {/* 3. Analysis Rows (Displayed) */}
                        <div className="flex items-center gap-2 px-2 border-l border-white/10 light:border-slate-300">
                            <span className="text-[10px] font-bold text-slate-400 light:text-slate-600 uppercase">{t('historyList.vizRows')}</span>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                step="5"
                                value={hotColdRange}
                                onChange={(e) => setHotColdRange(Number(e.target.value))}
                                className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-xs font-mono font-bold text-blue-400 light:text-blue-600 w-6 text-right">{hotColdRange}</span>
                        </div>

                        {/* 3. Replay / Time Travel */}
                        <div className="flex items-center gap-2 px-2 border-l border-white/10 light:border-slate-300">
                            <span className="text-[10px] font-bold text-slate-400 light:text-slate-600 uppercase">{t('historyList.replay')}</span>
                            <input
                                type="range"
                                min="0"
                                max={Math.min(200, historyData.length - 2)}
                                step="1"
                                value={historyOffset}
                                onChange={(e) => setHistoryOffset(Number(e.target.value))}
                                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 dir-rtl"
                                style={{ direction: 'rtl' }} // Right is 0 (Latest)
                            />
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-mono font-bold text-amber-400 light:text-amber-600">
                                    {historyOffset === 0 ? t('historyList.latest') : `-${historyOffset}`}
                                </span>
                            </div>
                        </div>

                        {/* Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-900 light:bg-white px-3 py-1.5 rounded-full border border-slate-700 light:border-slate-300 hover:border-slate-500 light:hover:border-slate-400 transition-colors shadow-sm light:shadow-sm ml-2">
                            <input
                                type="checkbox"
                                checked={analyzeIncludeSpecial}
                                onChange={(e) => setAnalyzeIncludeSpecial(e.target.checked)}
                                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-600 bg-slate-700 border-gray-600 light:bg-slate-200 light:border-slate-400"
                            />
                            <span className="text-[10px] font-bold text-slate-400 light:text-slate-700 select-none uppercase">{t('historyList.includeSp')}</span>
                        </label>

                        {/* Reset Button */}
                        <button
                            onClick={() => {
                                setHighlightCount(10);
                                setAnalysisDepth(200); // Default 200
                                setHotColdRange(20);
                                setHistoryOffset(0); // Latest
                                setAnalyzeIncludeSpecial(true);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 light:bg-slate-200 light:hover:bg-slate-300 text-white light:text-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors shadow-sm ml-1"
                            title={t('historyList.resetDefaults')}
                        >
                            ↺
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex justify-end gap-3 text-xs -mt-2">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span className="text-red-300 light:text-red-700 font-bold">{t('historyList.hotTop', { n: highlightCount })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span className="text-blue-300 light:text-blue-700 font-bold">{t('historyList.coldBot', { n: highlightCount })}</span>
                    </div>
                </div>

                {/* Contextual AI Stats (Compact) */}
                {contextualStats && (
                    <div className="bg-slate-950/50 light:bg-slate-50 rounded-xl p-3 mb-4 border border-white/5 light:border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        {/* Header/Title */}
                        <div className="flex items-center gap-2 mr-2">
                            <span className="text-base">🧠</span>
                            <div className="flex flex-col leading-none">
                                <span className="font-black text-slate-300 light:text-slate-700 uppercase tracking-wide">{t('historyList.contextualAi')}</span>
                                <span className="text-[9px] text-slate-500 font-bold">{t('historyList.trendLast', { n: contextualStats.trendLimit })}</span>
                            </div>
                        </div>

                        {/* Trend Metrics */}
                        <div className="flex items-center gap-4 border-l border-white/10 light:border-slate-300 pl-4">
                            <div className="flex flex-col items-center">
                                <span className="font-black text-red-400 light:text-red-600">{contextualStats.avgHot}</span>
                                <span className="text-[9px] uppercase text-slate-500 font-bold">{t('historyList.hotAvg')}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-slate-400 light:text-slate-600">{contextualStats.avgNeutral}</span>
                                <span className="text-[9px] uppercase text-slate-500 font-bold">{t('historyList.neuAvg')}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-blue-400 light:text-blue-600">{contextualStats.avgCold}</span>
                                <span className="text-[9px] uppercase text-slate-500 font-bold">{t('historyList.coldAvg')}</span>
                            </div>
                        </div>

                        {/* Hot/Cold Lists (Compact) */}
                        <div className="flex flex-1 items-center justify-end gap-4 border-l border-white/10 light:border-slate-300 pl-4 overflow-hidden">

                            {/* Hot List */}
                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                <span className="text-[9px] font-bold text-red-500 light:text-red-700 uppercase whitespace-nowrap">{t('historyList.hotLabel')}</span>
                                <div className="flex gap-1">
                                    {contextualStats.currentHot.map(n => (
                                        <span key={n} className="w-5 h-5 flex items-center justify-center rounded bg-red-500/20 light:bg-red-100 text-red-300 light:text-red-800 text-[10px] font-bold border border-red-500/30">{n}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Cold List */}
                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                <span className="text-[9px] font-bold text-blue-500 light:text-blue-700 uppercase whitespace-nowrap">{t('historyList.coldLabel')}</span>
                                <div className="flex gap-1">
                                    {contextualStats.currentCold.map(n => (
                                        <span key={n} className="w-5 h-5 flex items-center justify-center rounded bg-blue-500/20 light:bg-blue-100 text-blue-300 light:text-blue-800 text-[10px] font-bold border border-blue-500/30">{n}</span>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder={t('historyList.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950/50 light:bg-white backdrop-blur rounded-xl border border-white/10 light:border-slate-400 text-white light:text-slate-900 font-bold placeholder-slate-500 light:placeholder-slate-400 pl-4 pr-10 py-2.5 focus:border-indigo-500 light:focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner light:shadow-sm"
                    />
                </div>

                {/* Year Filter Tabs */}
                <div className="flex gap-2 flex-wrap border-b border-slate-700 pb-1">
                    <button
                        onClick={() => setSelectedYear('All')}
                        className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-t-xl transition-all relative top-[1px] ${selectedYear === 'All'
                            ? 'bg-slate-800 light:bg-white text-white light:text-slate-900 border-t border-x border-white/10 light:border-slate-200 z-10 shadow-sm'
                            : 'bg-transparent text-slate-500 hover:text-slate-300 light:text-slate-500 light:hover:text-slate-800 hover:bg-white/5 light:hover:bg-slate-200/50'
                            }`}
                    >
                        {t('historyList.yearAll')}
                    </button>
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-t-xl transition-all relative top-[1px] ${selectedYear === year
                                ? 'bg-slate-800 light:bg-white text-white light:text-slate-900 border-t border-x border-white/10 light:border-slate-300 z-10 shadow-sm'
                                : 'bg-transparent text-slate-500 hover:text-slate-300 light:text-slate-500 light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100'
                                }`}
                        >
                            {t('historyList.year', { year })}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] custom-scrollbar rounded-xl border border-white/5 light:border-slate-300 bg-slate-950/30 light:bg-white">
                <table className="w-full text-left text-sm text-slate-400 light:text-slate-700">
                    <thead className="text-[10px] uppercase font-black bg-slate-950/80 light:bg-slate-100 text-slate-500 light:text-slate-900 sticky top-0 z-10 backdrop-blur-md shadow-sm border-b light:border-slate-200">
                        <tr>
                            <th className="px-6 py-4">{t('historyList.colPeriod')}</th>
                            <th className="px-6 py-4">{t('historyList.colDate')}</th>
                            <th className="px-6 py-4">{t('historyList.colNumbers')}</th>
                            {hasSpecial && <th className="px-6 py-4 text-center">{t('historyList.colSpecial')}</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 light:divide-slate-200">
                        {filteredHistory.map((draw, index) => {
                            const stats = getStatsForDraw(draw);
                            // Is this one of the recent N?
                            // We determine recentness based on index in filtered view + offset logic
                            // But simplify: if it has stats, it's analyzed.
                            const hasStats = !!stats;

                            return (
                                <tr key={index} className={`transition-colors ${hasStats ? 'bg-slate-700/20 light:bg-orange-50' : 'hover:bg-slate-700/30 light:hover:bg-slate-50'}`}>
                                    <td className="px-4 py-3 font-mono font-bold text-white light:text-slate-950">
                                        {draw.period}
                                        {hasStats && index < highlightCount && <span className="ml-2 text-[10px] bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{t('historyList.analyzedBadge')}</span>}
                                    </td>
                                    <td className="px-4 py-3">{draw.date || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {draw.numbers.slice(0, pickCount).map((num, i) => (
                                                <span
                                                    key={i}
                                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${getNumberColor(num, stats)}`}
                                                >
                                                    {num < 10 ? `0${num}` : num}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    {hasSpecial && (
                                        <td className="px-4 py-3 text-center border-l border-white/5 light:border-slate-200">
                                            {draw.numbers[pickCount] !== undefined && (
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${stats ? getNumberColor(draw.numbers[pickCount], stats) : 'bg-amber-600/90 text-white'}`}>
                                                    {draw.numbers[pickCount] < 10 ? `0${draw.numbers[pickCount]}` : draw.numbers[pickCount]}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- Hybrid Contextual Stats (Dynamic) Removed (Moved to top) --- */}

        </div >
    );
};

export default HistoryList;
