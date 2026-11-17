import React, { useState, useEffect, useMemo } from 'react';
import MagicHeader from './MagicHeader';
import LatestDrawCard from './LatestDrawCard';
import InputSection from './InputSection';
import PredictionRow from './PredictionRow';
import HistoryList from './HistoryList';
import AdvancedStatsHub from './analytics/AdvancedStatsHub';
import HelpIcon from './HelpIcon';
import { calculatePrediction, calculateHybridPrediction } from '../utils/prediction';
import { nextPeriodOf } from '../utils/drawSchedule';
import { useLanguage } from '../i18n/LanguageContext';

const RANGE_STEPS = [10, 20, 30, 50, 100, 200];
const MIN_HISTORY_FOR_AI = 10;

const EMPTY_PREDICTION = { standard: [], weighted: [], hybrid: {}, lstm: [], lstmUnweighted: [] };

// A titled block that can be folded away. Folded content stays mounted so
// its settings are not lost.
const CollapsibleSection = ({ title, hint, children, defaultOpen = true, playSound, helpTitle, helpBody }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggle = () => {
        if (playSound) playSound('click');
        setIsOpen((open) => !open);
    };

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] light:border-stone-200 light:bg-white">
            <div className="flex items-center gap-3 p-4 sm:px-6">
                <button onClick={toggle} aria-expanded={isOpen} className="flex min-w-0 grow items-center gap-2 text-left">
                    <span className={`text-stone-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">›</span>
                    <h2 className="text-base font-semibold text-stone-100 light:text-stone-900">{title}</h2>
                </button>
                {helpTitle && <HelpIcon title={helpTitle} body={helpBody} />}
            </div>

            <div className={isOpen ? 'px-4 pb-4 sm:px-6 sm:pb-6' : 'hidden'}>
                {hint && <p className="mb-4 text-xs leading-relaxed text-stone-400 light:text-stone-500">{hint}</p>}
                {children}
            </div>
        </section>
    );
};

const Workspace = ({ historyData, onAddEntry, bgTheme, onSavePrediction, playSound, isLightMode, reducedMotion, activeGameConfig }) => {
    const { t } = useLanguage();
    const gameID = activeGameConfig.id;
    const { pickCount, specialNumber } = activeGameConfig.settings;

    const [prediction, setPrediction] = useState(EMPTY_PREDICTION);
    const [loadingStates, setLoadingStates] = useState({
        standard: false,
        weighted: false,
        hybrid: false,
        lstm: false,
        lstmUnweighted: false,
    });

    const [predictIncludeSpecial, setPredictIncludeSpecial] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    // Hot / cold settings, shared with the history table below
    const [highlightCount, setHighlightCount] = useState(10);
    const [hotColdRange, setHotColdRange] = useState(20);
    const [analysisDepth, setAnalysisDepth] = useState(200);

    const [predictionRange, setPredictionRange] = useState('100');

    // Numbers picked for one game make no sense for another.
    useEffect(() => {
        setPrediction(EMPTY_PREDICTION);
        setError(null);
    }, [gameID]);

    const predictionHistory = useMemo(() => {
        if (!historyData) return [];
        if (predictionRange === 'ALL') return historyData;
        return historyData.slice(0, parseInt(predictionRange, 10));
    }, [historyData, predictionRange]);

    const rangeOptions = useMemo(
        () => RANGE_STEPS.filter((n) => n < (historyData?.length || 0)),
        [historyData],
    );

    const nextPeriod = historyData.length > 0 ? nextPeriodOf(historyData[0].period) : '';
    const copyLabel = `${t(`shell.game.${gameID}`)}${nextPeriod ? ` ${t('shell.latest.period', { period: nextPeriod })}` : ''}`;
    const tooLittleHistory = predictionHistory.length < MIN_HISTORY_FOR_AI;

    // --- One handler per method ---

    const generateStandard = () => {
        if (playSound) playSound('predict');
        setLoadingStates((prev) => ({ ...prev, standard: true }));
        setTimeout(() => {
            const result = calculatePrediction(predictionHistory, predictIncludeSpecial, activeGameConfig.settings);
            setPrediction((prev) => ({ ...prev, standard: result.standard }));
            setLoadingStates((prev) => ({ ...prev, standard: false }));
        }, 250);
    };

    const generateWeighted = () => {
        if (playSound) playSound('predict');
        setLoadingStates((prev) => ({ ...prev, weighted: true }));
        setTimeout(() => {
            const result = calculatePrediction(predictionHistory, predictIncludeSpecial, activeGameConfig.settings);
            setPrediction((prev) => ({ ...prev, weighted: result.weighted }));
            setLoadingStates((prev) => ({ ...prev, weighted: false }));
        }, 250);
    };

    const generateHybrid = () => {
        if (playSound) playSound('predict');
        setLoadingStates((prev) => ({ ...prev, hybrid: true }));
        setTimeout(() => {
            // Uses the "look back" setting from the history table so the pick
            // matches the hot / cold numbers shown there.
            const targetSlice = analysisDepth > 0 ? historyData.slice(0, analysisDepth) : historyData;
            const result = calculateHybridPrediction(
                targetSlice,
                historyData,
                {
                    includeSpecial: predictIncludeSpecial,
                    hotCount: highlightCount,
                    coldCount: highlightCount,
                    trendDepth: hotColdRange,
                },
                activeGameConfig.settings,
            );
            setPrediction((prev) => ({ ...prev, hybrid: result }));
            setLoadingStates((prev) => ({ ...prev, hybrid: false }));
        }, 250);
    };

    const runModel = async (key, useWeights) => {
        if (tooLittleHistory) return;
        if (playSound) playSound('predict');
        setLoadingStates((prev) => ({ ...prev, [key]: true }));
        setError(null);
        setProgress(0);

        try {
            // The learning library is large, so it is only downloaded on first use.
            const { trainAndPredict } = await import('../utils/lstmModel');
            const result = await trainAndPredict(
                predictionHistory,
                (status) => setProgress(status.progress || 0),
                useWeights,
                activeGameConfig.settings,
            );
            setPrediction((prev) => ({ ...prev, [key]: result }));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingStates((prev) => ({ ...prev, [key]: false }));
            setProgress(0);
        }
    };

    const modelBusy = loadingStates.lstm || loadingStates.lstmUnweighted;
    const existingPeriods = historyData.map((h) => h.period);
    const selectClass = 'rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 light:border-stone-200 light:text-stone-900';
    const optionClass = 'bg-stone-900 text-stone-100 light:bg-white light:text-stone-900';

    const rows = [
        { key: 'standard', method: 'Standard', onGenerate: generateStandard, numbers: prediction.standard },
        { key: 'weighted', method: 'Weighted', onGenerate: generateWeighted, numbers: prediction.weighted },
        {
            key: 'hybrid',
            method: 'Hybrid',
            onGenerate: generateHybrid,
            numbers: prediction.hybrid.numbers,
            stats: prediction.hybrid.stats,
            meta: prediction.hybrid.meta,
            type: 'hybrid',
        },
        {
            key: 'lstm',
            method: 'AI-Weighted',
            onGenerate: () => runModel('lstm', true),
            numbers: prediction.lstm,
            type: 'ai',
            disabled: tooLittleHistory || modelBusy,
        },
        {
            key: 'lstmUnweighted',
            method: 'AI-Pure',
            onGenerate: () => runModel('lstmUnweighted', false),
            numbers: prediction.lstmUnweighted,
            type: 'ai',
            disabled: tooLittleHistory || modelBusy,
        },
    ];

    return (
        <div className="mx-auto space-y-5">
            <MagicHeader
                title={t('shell.pick.headerTitle')}
                subtitle={t('shell.pick.headerSubtitle')}
                themeIndex={bgTheme}
                isLightMode={isLightMode}
                reducedMotion={reducedMotion}
            />

            <LatestDrawCard historyData={historyData} activeGameConfig={activeGameConfig} />

            {/* 1. Pick numbers */}
            <CollapsibleSection
                title={t('shell.pick.sectionPick')}
                playSound={playSound}
                helpTitle={t('workspace.help.predictionEngine.title')}
                helpBody={t('workspace.help.predictionEngine.body')}
            >
                <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-stone-300 light:text-stone-700">
                    <label className="flex items-center gap-2">
                        <span className="text-stone-400 light:text-stone-500">{t('shell.pick.rangeLabel')}</span>
                        <select value={predictionRange} onChange={(e) => setPredictionRange(e.target.value)} className={selectClass}>
                            {rangeOptions.map((n) => (
                                <option className={optionClass} key={n} value={n}>{t('shell.pick.rangeRecent', { n })}</option>
                            ))}
                            <option className={optionClass} value="ALL">{t('shell.pick.rangeAll', { n: historyData.length })}</option>
                        </select>
                    </label>

                    {specialNumber.enabled && !specialNumber.isSeparate && (
                        <label className="flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={predictIncludeSpecial}
                                onChange={(e) => setPredictIncludeSpecial(e.target.checked)}
                                className="h-4 w-4 accent-amber-500"
                            />
                            <span>{t('shell.pick.includeSpecial')}</span>
                        </label>
                    )}

                    {nextPeriod && (
                        <span className="text-xs text-stone-500 sm:ml-auto">{t('shell.pick.forPeriod', { period: nextPeriod })}</span>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {rows.map((row) => (
                        <PredictionRow
                            key={row.key}
                            title={t(`shell.method.${row.method}`)}
                            subtitle={t(`shell.pick.sub.${row.method}`)}
                            onGenerate={row.onGenerate}
                            isLoading={loadingStates[row.key]}
                            numbers={row.numbers}
                            stats={row.stats}
                            meta={row.meta}
                            type={row.type}
                            progress={progress}
                            disabled={row.disabled}
                            note={row.type === 'ai' && tooLittleHistory ? t('shell.pick.needMoreHistory') : undefined}
                            onSave={() => onSavePrediction(row.numbers, row.method)}
                            pickCount={pickCount}
                            copyLabel={copyLabel}
                        />
                    ))}

                    {error && (
                        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 light:text-rose-700" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            </CollapsibleSection>

            {/* 2. Charts */}
            <CollapsibleSection
                title={t('shell.pick.sectionStats')}
                playSound={playSound}
                helpTitle={t('workspace.help.statisticalAnalysis.title')}
                helpBody={t('workspace.help.statisticalAnalysis.body')}
            >
                <AdvancedStatsHub historyData={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />
            </CollapsibleSection>

            {/* 3. Past draws */}
            <CollapsibleSection
                title={t('shell.pick.sectionHistory')}
                playSound={playSound}
                helpTitle={t('workspace.help.historicalData.title')}
                helpBody={t('workspace.help.historicalData.body')}
            >
                <HistoryList
                    historyData={historyData}
                    activeGameConfig={activeGameConfig}
                    highlightCount={highlightCount}
                    setHighlightCount={setHighlightCount}
                    hotColdRange={hotColdRange}
                    setHotColdRange={setHotColdRange}
                    analysisDepth={analysisDepth}
                    setAnalysisDepth={setAnalysisDepth}
                />
            </CollapsibleSection>

            {/* 4. Manual entry: rarely needed now that data updates itself */}
            <CollapsibleSection
                title={t('shell.pick.sectionAdd')}
                hint={t('shell.pick.sectionAddHint')}
                defaultOpen={false}
                playSound={playSound}
                helpTitle={t('workspace.help.dataManagement.title')}
                helpBody={t('workspace.help.dataManagement.body')}
            >
                <InputSection
                    onAddEntry={onAddEntry}
                    existingPeriods={existingPeriods}
                    nextPeriod={nextPeriod}
                    activeGameConfig={activeGameConfig}
                />
            </CollapsibleSection>
        </div>
    );
};

export default Workspace;
