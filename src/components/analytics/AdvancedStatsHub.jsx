import React, { useState, useMemo } from 'react';
import FreqChart from './FreqChart';
import HeatmapGrid from './HeatmapGrid';
import TrendLines from './TrendLines';
import ZoneRadar from './ZoneRadar';
import LastDigitStats from './LastDigitStats';
import { useLanguage } from '../../i18n/LanguageContext';

const AdvancedStatsHub = ({ historyData, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    // 0. Config Extraction
    const isSeparate = activeGameConfig?.settings?.specialNumber?.isSeparate || false;
    const PICK = activeGameConfig?.settings?.pickCount || 6;
    const MAX_NUM = activeGameConfig?.settings?.maxNumber || 49;

    // For Super Lotto: Special is 1-8. For 6/49: Special is 1-49.
    const SPECIAL_MAX = isSeparate ? (activeGameConfig?.settings?.specialNumber?.max || 8) : MAX_NUM;

    // 1. Controls State
    const [currentView, setCurrentView] = useState('frequency'); // frequency, heatmap, trends, distribution
    const [rangeOption, setRangeOption] = useState('50'); // Default to recent 50 for relevance
    const [useWeighted, setUseWeighted] = useState(true);
    const [includeSpecial, setIncludeSpecial] = useState(false); // Only for !isSeparate (Lotto 6/49)
    const [activeZone, setActiveZone] = useState('main'); // 'main' | 'special' (Only for isSeparate)

    // Reset activeZone if game changes
    useMemo(() => {
        setActiveZone('main');
    }, [activeGameConfig?.id]);

    // 2. Range Options Logic
    const rangeOptions = useMemo(() => {
        if (!historyData) return [];
        const options = [];
        const total = historyData.length;
        for (let i = 10; i <= total; i += 10) {
            options.push(i);
        }
        return options;
    }, [historyData]);

    // 3. Data Processing
    const { processedData, processedHistory, averageScore } = useMemo(() => {
        // Determine Target Max Number based on Mode
        // If Separate & Special Mode: 1-8. Else: 1-49 (or 1-38 for Main).
        const currentMax = (isSeparate && activeZone === 'special') ? SPECIAL_MAX : MAX_NUM;
        const scores = Array(currentMax).fill(0);

        if (!historyData || historyData.length === 0) return { processedData: [], processedHistory: [], averageScore: 0 };

        // A. Filter by Range
        let filteredHist = historyData;
        if (rangeOption !== 'ALL') {
            const limit = parseInt(rangeOption);
            filteredHist = historyData.slice(0, limit);
        }

        // B. Calculate Scores
        filteredHist.forEach((draw, index) => {
            // Determine Weight
            let weight = 1;
            if (useWeighted) {
                if (index < 10) weight = 10;
                else if (index < 20) weight = 7;
                else if (index < 30) weight = 4;
                else if (index < 50) weight = 3;
                else if (index < 80) weight = 2;
                else weight = 1;
            }

            if (isSeparate) {
                // SUPER LOTTO LOGIC (Separated)
                if (activeZone === 'main') {
                    // Zone 1: Main Numbers ONLY (indices 0 to PICK-1)
                    draw.numbers.slice(0, PICK).forEach(num => {
                        if (num >= 1 && num <= MAX_NUM) scores[num - 1] += weight;
                    });
                } else if (activeZone === 'special') {
                    // Zone 2: Special Number ONLY (index PICK)
                    // Note: Special Number in Super Lotto is 1-8.
                    const sp = draw.numbers[PICK];
                    if (sp >= 1 && sp <= SPECIAL_MAX) scores[sp - 1] += weight;
                }
            } else {
                // LOTTO 6/49 LOGIC (Integrated)

                // Standard Numbers
                draw.numbers.slice(0, PICK).forEach(num => {
                    if (num >= 1 && num <= MAX_NUM) scores[num - 1] += weight;
                });

                // Special Number (Mixed in if toggle enabled)
                if (includeSpecial && draw.numbers[PICK]) {
                    const num = draw.numbers[PICK];
                    if (num >= 1 && num <= MAX_NUM) {
                        const spWeight = useWeighted ? (weight * 0.5) : 1;
                        scores[num - 1] += spWeight;
                    }
                }
            }
        });

        const totalScore = scores.reduce((a, b) => a + b, 0);
        const avg = totalScore / currentMax;

        const data = scores.map((score, index) => ({
            number: index + 1,
            score: score
        }));

        return { processedData: data, processedHistory: filteredHist, averageScore: avg };

    }, [historyData, rangeOption, useWeighted, includeSpecial, activeGameConfig, activeZone, isSeparate, MAX_NUM, PICK, SPECIAL_MAX]);

    // --- Tab Navigation Component ---
    const TabButton = ({ id, icon, label }) => (
        <button
            onClick={() => setCurrentView(id)}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300
                ${currentView === id
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-105'
                    : 'bg-slate-800/50 light:bg-slate-200/50 text-slate-400 light:text-slate-600 hover:bg-slate-700 light:hover:bg-slate-300'
                }
            `}
        >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="bg-slate-800/80 light:bg-white rounded-3xl p-6 border border-white/10 light:border-slate-200 shadow-xl backdrop-blur-md">

            {/* 1. Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-6 mb-8">

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 justify-center">
                    <TabButton id="frequency" icon="📊" label={t('advancedStatsHub.tabFrequency')} />
                    <TabButton id="heatmap" icon="🔥" label={t('advancedStatsHub.tabHeatmap')} />
                    <TabButton id="trends" icon="📈" label={t('advancedStatsHub.tabTrends')} />
                    <TabButton id="distribution" icon="📐" label={t('advancedStatsHub.tabDistribution')} />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center justify-center bg-black/20 light:bg-slate-100 p-2 rounded-2xl">

                    {/* Zone Switcher (Only for Super Lotto) */}
                    {isSeparate && (
                        <div className="flex bg-slate-900 light:bg-white rounded-xl p-1 mr-2 border border-white/10 light:border-slate-300">
                            <button
                                onClick={() => setActiveZone('main')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${activeZone === 'main'
                                    ? 'bg-cyan-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {t('advancedStatsHub.zoneMainLabel')}
                            </button>
                            <button
                                onClick={() => setActiveZone('special')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${activeZone === 'special'
                                    ? 'bg-rose-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {t('advancedStatsHub.zoneSpecialLabel')}
                            </button>
                        </div>
                    )}

                    {/* Range */}
                    <div className="flex items-center gap-2 px-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('advancedStatsHub.rangeLabel')}</span>
                        <select
                            value={rangeOption}
                            onChange={(e) => setRangeOption(e.target.value)}
                            className="bg-transparent text-sm font-bold text-white light:text-slate-900 focus:outline-none cursor-pointer"
                        >
                            <option className="bg-slate-900 text-slate-200" value="ALL">{t('advancedStatsHub.rangeAll', { n: historyData?.length })}</option>
                            {rangeOptions.map(opt => (
                                <option className="bg-slate-900 text-slate-200" key={opt} value={opt}>{t('advancedStatsHub.rangeLast', { n: opt })}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-px h-6 bg-white/10 light:bg-slate-300"></div>

                    {/* Weighted Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer px-3 hover:opacity-80 transition-opacity">
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${useWeighted ? 'bg-purple-500' : 'bg-slate-600'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${useWeighted ? 'left-4.5' : 'left-0.5'}`}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 light:text-slate-600 uppercase">{t('advancedStatsHub.weightedLabel')}</span>
                        <input type="checkbox" className="hidden" checked={useWeighted} onChange={e => setUseWeighted(e.target.checked)} />
                    </label>

                    {/* Special Toggle (Only for Integrated games with Special enabled) */}
                    {!isSeparate && activeGameConfig?.settings?.specialNumber?.enabled && (
                        <>
                            <div className="w-px h-6 bg-white/10 light:bg-slate-300"></div>
                            <label className="flex items-center gap-2 cursor-pointer px-3 hover:opacity-80 transition-opacity">
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${includeSpecial ? 'bg-pink-500' : 'bg-slate-600'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${includeSpecial ? 'left-4.5' : 'left-0.5'}`}></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 light:text-slate-600 uppercase">{t('advancedStatsHub.specialLabel')}</span>
                                <input type="checkbox" className="hidden" checked={includeSpecial} onChange={e => setIncludeSpecial(e.target.checked)} />
                            </label>
                        </>
                    )}
                </div>
            </div>

            {/* 2. Content Area */}
            <div className="min-h-[350px] relative">

                {/* View: Frequency Bar Chart */}
                {currentView === 'frequency' && (
                    <FreqChart
                        data={processedData}
                        averageScore={averageScore}
                        isWeighted={useWeighted}
                        isLightMode={isLightMode}
                    />
                )}

                {/* View: Heatmap Grid */}
                {currentView === 'heatmap' && (
                    <HeatmapGrid
                        data={processedData}
                        isLightMode={isLightMode}
                    />
                )}

                {/* View: Time Trends (Uses raw history slice) */}
                {currentView === 'trends' && (
                    <TrendLines
                        rawHistory={processedHistory}
                        isLightMode={isLightMode}
                        // Need separate handling for trends if separate zone?
                        // TrendLines likely just plots numbers.
                        // If separate zone, we might need to filter rawHistory nums to only show zone nums?
                        // TrendLines usually expects full draw.
                        // Ideally we pass processed data, but TrendLines renders 'draw numbers'.
                        // For Zone 2, we should probably only visualize the special number trend.
                        activeZone={activeZone}
                        isSeparate={isSeparate}
                        PICK={PICK}
                        maxNumber={isSeparate && activeZone === 'special' ? SPECIAL_MAX : MAX_NUM}
                    />
                )}

                {/* View: Distribution (Zone + Last Digit) */}
                {currentView === 'distribution' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        <div className="bg-slate-900/30 light:bg-slate-50/50 rounded-2xl p-4 border border-white/5 light:border-slate-200">
                            <ZoneRadar data={processedData} isLightMode={isLightMode} maxNumber={(isSeparate && activeZone === 'special') ? SPECIAL_MAX : MAX_NUM} />
                        </div>
                        <div className="bg-slate-900/30 light:bg-slate-50/50 rounded-2xl p-4 border border-white/5 light:border-slate-200">
                            <LastDigitStats data={processedData} isLightMode={isLightMode} />
                        </div>
                    </div>
                )}

            </div>

            <div className="mt-4 text-center">
                <p className="text-[10px] text-slate-500 light:text-slate-400 font-mono">
                    {t('advancedStatsHub.analyzingFooter', {
                        n: processedHistory.length,
                        mode: useWeighted ? t('advancedStatsHub.recencyWeights') : t('advancedStatsHub.rawFrequency')
                    })}
                    {isSeparate && (
                        <span className="ml-2 text-cyan-400">
                            [{activeZone === 'main' ? t('advancedStatsHub.zoneRangeMain') : t('advancedStatsHub.zoneRangeSpecial')}]
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};

export default AdvancedStatsHub;
