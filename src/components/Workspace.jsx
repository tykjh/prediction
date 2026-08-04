import React, { useState, useEffect, useMemo } from 'react';
import MagicHeader from './MagicHeader';
import InputSection from './InputSection';
import PredictionRow from './PredictionRow';
import HistoryList from './HistoryList';
import AdvancedStatsHub from './analytics/AdvancedStatsHub';
import { calculatePrediction, calculateHybridPrediction } from '../utils/prediction';
import { trainAndPredict } from '../utils/lstmModel';
import initialHistory from '../data/history.json';
import { useLanguage } from '../i18n/LanguageContext';

// Reusable Section Component (Moved from App.jsx)
const CollapsibleSection = ({ title, children, defaultOpen = true, icon = "📊", playSound }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggle = () => {
        if (playSound) playSound('click');
        setIsOpen(!isOpen);
    };

    return (
        <section className={`rounded-3xl border border-white/10 light:border-slate-200/60 overflow-hidden transition-all duration-500 shadow-2xl light:shadow-xl backdrop-blur-xl ${isOpen ? 'bg-slate-900/40 light:bg-gradient-to-br light:from-white light:to-slate-100 ring-1 ring-white/10 light:ring-black/5 shadow-indigo-500/10 light:shadow-indigo-500/5' : 'bg-slate-900/20 hover:bg-slate-900/30 light:bg-white/40 light:hover:bg-white/60'}`}>
            <div
                onClick={toggle}
                className="flex items-center justify-between p-6 cursor-pointer bg-gradient-to-r from-white/5 via-white/[0.02] to-transparent light:from-slate-50/50 light:to-transparent hover:from-white/10 light:hover:from-slate-100/50 transition-all select-none group border-b border-white/5 light:border-slate-100"
            >
                <div className="flex items-center gap-5">
                    <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">{icon}</span>
                    <div>
                        <h2 className="text-lg font-black text-white light:text-slate-800 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 light:from-slate-800 light:to-slate-600 group-hover:to-white light:group-hover:to-slate-900 transition-all">{title}</h2>
                        {isOpen && <div className="h-0.5 w-12 bg-indigo-500/50 light:bg-indigo-500/50 rounded-full mt-1 group-hover:w-full transition-all duration-700"></div>}
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 light:bg-slate-100 border border-white/10 light:border-slate-200 text-slate-400 light:text-slate-400 group-hover:bg-white/10 light:group-hover:bg-slate-200 group-hover:text-white light:group-hover:text-slate-600 transition-all duration-300 ${isOpen ? 'rotate-180 bg-indigo-500/20 light:bg-indigo-50 text-indigo-200 light:text-indigo-500 border-indigo-500/30' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </div>

            <div className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-6 md:p-8 bg-black/20 light:bg-slate-100/50">
                    {children}
                </div>
            </div>
        </section>
    );
};

const Workspace = ({ historyData, onAddEntry, bgTheme, onSavePrediction, playSound, isLightMode, reducedMotion, activeGameConfig }) => {
    const { t } = useLanguage();
    // Local state for Prediction Engine
    const [prediction, setPrediction] = useState({
        standard: [],
        weighted: [],
        hybrid: {},
        lstm: [],
        lstmUnweighted: [] // Raw array
    });

    const [loadingStates, setLoadingStates] = useState({
        standard: false,
        weighted: false,
        hybrid: false,
        lstm: false,
        lstmUnweighted: false
    });

    const [predictIncludeSpecial, setPredictIncludeSpecial] = useState(true);
    const [trainingStatus, setTrainingStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    // Contextual AI Params (Lifted from HistoryList)
    const [highlightCount, setHighlightCount] = useState(10); // HL Qty
    const [hotColdRange, setHotColdRange] = useState(20); // Viz Rows (Trend Depth)
    const [analysisDepth, setAnalysisDepth] = useState(200); // Lookback N: Default 200

    // New State for Prediction Range
    const [predictionRange, setPredictionRange] = useState('100');

    // Filter history for prediction
    // NOTE: Using historyData prop instead of local state
    const predictionHistory = useMemo(() => {
        if (!historyData) return [];
        // If Analysis Depth (Lookback N) is set from Contextual AI, it takes precedence for Consistency?
        // Or should we respect the dropdown?
        // User asked to "Apply Contextual AI parameters", so let's use analysisDepth if set, otherwise predictionRange.
        // Actually, let's keep predictionRange independent for other engines, but for Hybrid, we specificy it below.

        if (predictionRange === 'ALL') return historyData;
        return historyData.slice(0, parseInt(predictionRange));
    }, [historyData, predictionRange]);

    // Generate range options
    const rangeOptions = useMemo(() => {
        if (!historyData) return [];
        const options = [];
        const total = historyData.length;
        for (let i = 10; i <= total; i += 10) {
            options.push(i);
        }
        return options;
    }, [historyData]);

    // Local handleAddEntry removed, using props.onAddEntry directly

    // --- Handlers for Individual Generation ---

    const generateStandard = () => {
        if (playSound) playSound('predict');
        setLoadingStates(prev => ({ ...prev, standard: true }));
        setTimeout(() => {
            const statsResult = calculatePrediction(predictionHistory, predictIncludeSpecial, activeGameConfig.settings);
            setPrediction(prev => ({ ...prev, standard: statsResult.standard }));
            setLoadingStates(prev => ({ ...prev, standard: false }));
        }, 400); // Artificial delay for UX
    };

    const generateWeighted = () => {
        if (playSound) playSound('predict');
        setLoadingStates(prev => ({ ...prev, weighted: true }));
        setTimeout(() => {
            const statsResult = calculatePrediction(predictionHistory, predictIncludeSpecial, activeGameConfig.settings);
            setPrediction(prev => ({ ...prev, weighted: statsResult.weighted }));
            setLoadingStates(prev => ({ ...prev, weighted: false }));
        }, 400);
    };

    const generateHybrid = () => {
        if (playSound) playSound('predict');
        setLoadingStates(prev => ({ ...prev, hybrid: true }));
        setTimeout(() => {
            // Determine Target History based on Contextual AI "Lookback N"
            // If analysisDepth > 0, we slice the history. Else we use full history (or predictionHistory?)
            // Let's use analysisDepth to be 1:1 with the visual analysis.
            const targetSlice = analysisDepth > 0 ? historyData.slice(0, analysisDepth) : historyData;

            // Fix: Pass object as 3rd arg, and gameConfig as 4th
            const hybridResult = calculateHybridPrediction(
                targetSlice,
                historyData,
                {
                    includeSpecial: predictIncludeSpecial,
                    hotCount: highlightCount,
                    coldCount: highlightCount,
                    trendDepth: hotColdRange
                },
                activeGameConfig.settings
            );
            setPrediction(prev => ({ ...prev, hybrid: hybridResult }));
            setLoadingStates(prev => ({ ...prev, hybrid: false }));
        }, 600);
    };

    const generateAIWeighted = async () => {
        if (predictionHistory.length < 10) return;
        if (playSound) playSound('predict');
        setLoadingStates(prev => ({ ...prev, lstm: true }));
        setError(null);
        setProgress(0);

        try {
            await trainAndPredict(predictionHistory, (statusObj) => {
                setProgress(statusObj.progress || 0);
            }, true, activeGameConfig.settings);

            // Re-run for result capture (refactor potential: trainAndPredict logic separation)
            // Since trainAndPredict returns result, we use it directly
            const result = await trainAndPredict(predictionHistory, (statusObj) => {
                setProgress(statusObj.progress || 0);
            }, true, activeGameConfig.settings);

            setPrediction(prev => ({ ...prev, lstm: result }));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingStates(prev => ({ ...prev, lstm: false }));
            setProgress(0);
        }
    };

    const generateAIUnweighted = async () => {
        if (predictionHistory.length < 10) return;
        setLoadingStates(prev => ({ ...prev, lstmUnweighted: true }));
        setError(null);
        setProgress(0);

        try {
            // Redundant call removed, just call once
            const result = await trainAndPredict(predictionHistory, (statusObj) => {
                setProgress(statusObj.progress || 0);
            }, false, activeGameConfig.settings);

            setPrediction(prev => ({ ...prev, lstmUnweighted: result }));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingStates(prev => ({ ...prev, lstmUnweighted: false }));
            setProgress(0);
        }
    };


    const existingPeriods = historyData.map(h => h.period);

    return (
        <div className="mx-auto space-y-6">

            {/* Workspace Header */}
            {/* Workspace Header */}
            {/* Workspace Header */}
            <MagicHeader
                title={t('workspace.headerTitle')}
                subtitle={<>{t('workspace.headerSubtitleLine1')} <br />{t('workspace.headerSubtitleLine2')}</>}
                icon="💠"
                themeIndex={bgTheme}
                isLightMode={isLightMode}
                reducedMotion={reducedMotion}
            />

            {/* --- 1. Prediction Engine (Collapsible) --- */}
            <CollapsibleSection title={t('workspace.sectionPredictionEngine')} icon="✨" defaultOpen={true}>
                <div className="relative">
                    {/* Global Settings for Engine */}
                    <div className="flex flex-wrap justify-end items-center gap-4 mb-6 border-b border-slate-800/50 light:border-slate-200 pb-4">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-800 light:bg-slate-100 px-4 py-2 rounded-full border border-slate-700 light:border-slate-200 hover:border-slate-500 transition-colors">
                            <input
                                type="checkbox"
                                checked={predictIncludeSpecial}
                                onChange={(e) => setPredictIncludeSpecial(e.target.checked)}
                                className="w-4 h-4 text-purple-500 rounded focus:ring-purple-600 bg-slate-700 light:bg-white border-gray-600 light:border-slate-300"
                            />
                            <span className="text-xs font-bold text-slate-300 light:text-slate-700">{t('workspace.includeSpecialNo')}</span>
                        </label>


                        <div className="flex items-center gap-2 bg-slate-800 light:bg-slate-100 px-4 py-2 rounded-full border border-slate-700 light:border-slate-200 hover:border-slate-500 transition-colors">
                            <span className="text-xs font-bold text-slate-400 light:text-slate-600">{t('workspace.analysisRange')}</span>
                            <select
                                value={predictionRange}
                                onChange={(e) => setPredictionRange(e.target.value)}
                                className="bg-transparent text-sm font-black text-white light:text-slate-800 focus:outline-none cursor-pointer"
                            >
                                <option className="bg-slate-900 light:bg-white text-slate-300 light:text-slate-900 font-bold" value="ALL">{t('workspace.allHistory', { n: historyData.length })}</option>
                                {rangeOptions.map(opt => (
                                    <option className="bg-slate-900 light:bg-white text-slate-300 light:text-slate-900 font-bold" key={opt} value={opt}>{t('workspace.recentDraws', { n: opt })}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Rows Container */}
                    <div className="flex flex-col gap-6 relative z-10">

                        {/* 1. Standard */}
                        <PredictionRow
                            title={t('workspace.standardTitle')}
                            subtitle={t('workspace.standardSubtitle')}
                            onGenerate={generateStandard}
                            isLoading={loadingStates.standard}
                            numbers={prediction.standard}
                            buttonColor="bg-blue-600 hover:bg-blue-500"
                            boxColors="bg-blue-600"
                            onSave={() => onSavePrediction(prediction.standard, 'Standard')}
                            pickCount={activeGameConfig.settings.pickCount}
                        />

                        {/* 2. Weighted */}
                        <PredictionRow
                            title={t('workspace.weightedTitle')}
                            subtitle={t('workspace.weightedSubtitle')}
                            onGenerate={generateWeighted}
                            isLoading={loadingStates.weighted}
                            numbers={prediction.weighted}
                            buttonColor="bg-purple-600 hover:bg-purple-500"
                            boxColors="bg-purple-600"
                            onSave={() => onSavePrediction(prediction.weighted, 'Weighted')}
                            pickCount={activeGameConfig.settings.pickCount}
                        />

                        {/* 3. Hybrid */}
                        <PredictionRow
                            title={t('workspace.hybridTitle')}
                            subtitle={t('workspace.hybridSubtitle')}
                            onGenerate={generateHybrid}
                            isLoading={loadingStates.hybrid}
                            numbers={prediction.hybrid.numbers}
                            stats={prediction.hybrid.stats}
                            meta={prediction.hybrid.meta}
                            type="hybrid"
                            buttonColor="bg-amber-600 hover:bg-amber-500"
                            boxColors="bg-amber-900/40 border-amber-500/30 text-amber-300"
                            onSave={() => onSavePrediction(prediction.hybrid.numbers, 'Hybrid')}
                            pickCount={activeGameConfig.settings.pickCount}
                        />

                        {/* 4. AI Weighted */}
                        <PredictionRow
                            title={t('workspace.aiWeightedTitle')}
                            subtitle={t('workspace.aiWeightedSubtitle')}
                            onGenerate={generateAIWeighted}
                            isLoading={loadingStates.lstm}
                            numbers={prediction.lstm}
                            type="ai"
                            progress={progress}
                            buttonColor="bg-teal-600 hover:bg-teal-500"
                            boxColors="bg-teal-600"
                            onSave={() => onSavePrediction(prediction.lstm, 'AI-Weighted')}
                            pickCount={activeGameConfig.settings.pickCount}
                        />

                        {/* 5. AI Unweighted */}
                        <PredictionRow
                            title={t('workspace.aiUnweightedTitle')}
                            subtitle={t('workspace.aiUnweightedSubtitle')}
                            onGenerate={generateAIUnweighted}
                            isLoading={loadingStates.lstmUnweighted}
                            numbers={prediction.lstmUnweighted} // Raw array
                            type="ai"
                            progress={progress}
                            buttonColor="bg-emerald-600 hover:bg-emerald-500"
                            boxColors="bg-emerald-600"
                            onSave={() => onSavePrediction(prediction.lstmUnweighted, 'AI-Pure')}
                            pickCount={activeGameConfig.settings.pickCount}
                        />

                        {/* Error Message */}
                        {error && (
                            <div className="text-red-400 text-sm font-bold bg-red-950/50 px-4 py-3 rounded-lg border border-red-500/20 flex items-center gap-2 mt-4">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                    </div>
                </div>
            </CollapsibleSection>

            {/* --- 2. Charts (Collapsible) --- */}
            <CollapsibleSection title={t('workspace.sectionStatisticalAnalysis')} icon="📈" defaultOpen={true}>
                <AdvancedStatsHub historyData={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />
            </CollapsibleSection>

            {/* --- 3. History (Collapsible) --- */}
            <CollapsibleSection title={t('workspace.sectionHistoricalData')} icon="📜" defaultOpen={true}>
                <HistoryList
                    historyData={historyData}
                    activeGameConfig={activeGameConfig}
                    // Lifted State Params
                    highlightCount={highlightCount}
                    setHighlightCount={setHighlightCount}
                    hotColdRange={hotColdRange}
                    setHotColdRange={setHotColdRange}
                    analysisDepth={analysisDepth}
                    setAnalysisDepth={setAnalysisDepth}
                />
            </CollapsibleSection>

            {/* --- 4. Input (Collapsible) --- */}
            <CollapsibleSection title={t('workspace.sectionDataManagement')} icon="📝" defaultOpen={true}>
                <InputSection
                    onAddEntry={onAddEntry}
                    existingPeriods={existingPeriods}
                    nextPeriod={historyData.length > 0 ? (BigInt(historyData[0].period) + 1n).toString() : ''}
                    activeGameConfig={activeGameConfig}
                />
            </CollapsibleSection>

            <footer className="text-center text-slate-600 text-xs py-8">
                <p>{t('workspace.footer', { year: new Date().getFullYear() })}</p>
            </footer>

        </div>
    );
};

export default Workspace;
