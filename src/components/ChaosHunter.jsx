import React, { useState, useEffect, useRef } from 'react';
import { getSecureRandomSet } from '../utils/secureRandom';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

const ChaosHunter = ({ history, onSave, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    // 1. Controls
    const [range, setRange] = useState(50);
    const [lockedSet, setLockedSet] = useState(null);
    const [hoverCoords, setHoverCoords] = useState(null); // {x: sum, y: span}
    const [generatedPreview, setGeneratedPreview] = useState(null);

    // Dynamic Params
    const MAX = activeGameConfig?.settings?.maxNumber || 49;
    const PICK = activeGameConfig?.settings?.pickCount || 6;

    // 2. Data Processing
    // Calculate Sum and Span for history
    const processData = () => {
        const slice = history.slice(0, range);
        return slice.map(draw => {
            const numbers = draw.numbers.slice(0, PICK);
            // Filter out-of-range historical data if checking different game type compatibility
            const valid = numbers.every(n => n <= MAX);

            // Just calc stats on raw numbers
            const sum = numbers.reduce((a, b) => a + b, 0);
            const span = numbers.length > 0 ? (Math.max(...numbers) - Math.min(...numbers)) : 0;
            return { sum, span, numbers };
        });
    };

    const dataPoints = processData();

    // 3. Coordinate System Constants
    // Adjust ranges roughly based on MAX/PICK
    // Avg sum ~ (MAX/2) * PICK
    // Max sum ~ MAX * PICK - (PICK*(PICK-1)/2)
    // 49/6 -> Avg 150, Max 279
    // 38/6 -> Avg 117, Max 213

    // We can make this dynamic or just wide enough.
    // Wide enough: Min 15, Max 300 covers both easily.
    const MIN_SUM = 15;
    const MAX_SUM = 300;
    const MIN_SPAN = 5;
    const MAX_SPAN = MAX; // Scan up to MAX

    const mapX = (sum) => ((sum - MIN_SUM) / (MAX_SUM - MIN_SUM)) * 100;
    const mapY = (span) => 100 - ((span - MIN_SPAN) / (MAX_SPAN - MIN_SPAN)) * 100; // Invert Y

    // 4. Reverse Generator Logic
    // Tries to find a random set that matches the target Sum and Span (+/- tolerance)
    const findSet = (targetSum, targetSpan) => {
        let attempts = 0;
        const maxAttempts = 2000;

        while (attempts < maxAttempts) {
            attempts++;
            // Generate PICK random numbers within MAX (Dynamic)
            const set = getSecureRandomSet(PICK, 1, MAX);

            const arr = Array.from(set).sort((a, b) => a - b);

            const sum = arr.reduce((a, b) => a + b, 0);
            const span = arr[PICK - 1] - arr[0];

            // Tolerance check (Sum +/- 5, Span +/- 2)
            if (Math.abs(sum - targetSum) <= 3 && Math.abs(span - targetSpan) <= 2) {
                return { numbers: arr, sum, span };
            }
        }
        return null;
    };

    const handleMouseMove = (e) => {
        if (lockedSet) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width;
        const yPct = (e.clientY - rect.top) / rect.height;

        // Convert back to Sum/Span
        const targetSum = Math.round(MIN_SUM + xPct * (MAX_SUM - MIN_SUM));
        const targetSpan = Math.round(MAX_SPAN - yPct * (MAX_SPAN - MIN_SPAN));

        setHoverCoords({ sum: targetSum, span: targetSpan });
        // Removed real-time generation: findSet() is now called on click
    };

    const handleClick = () => {
        if (lockedSet) {
            setLockedSet(null); // Unlock/Reset
            setGeneratedPreview(null);
        } else if (hoverCoords) { // Only scan if we have coordinates
            const match = findSet(hoverCoords.sum, hoverCoords.span);
            if (match) {
                setGeneratedPreview(match);
                setLockedSet(match); // Immediately lock result
            } else {
                // Flash warning or just clear
                setGeneratedPreview(null);
            }
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-slate-900/50 light:bg-white rounded-2xl p-6 border border-slate-800 light:border-slate-200 select-none shadow-xl light:shadow-lg">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
                            🌌 {t('chaosHunter.title')}
                        </h2>
                        <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                            {t('chaosHunter.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-[9px] uppercase font-bold text-slate-500 hidden md:block">{t('chaosHunter.historyDepth')}</label>
                        <select
                            value={range}
                            onChange={(e) => setRange(Number(e.target.value))}
                            className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={history.length}>All ({history.length})</option>
                        </select>
                    </div>
                    {lockedSet && (
                        <button
                            onClick={() => { setLockedSet(null); setGeneratedPreview(null); }}
                            className="text-xs bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-700 light:hover:bg-slate-300 transition-all duration-200 border border-slate-700 light:border-slate-300 active:scale-95 hover:text-white light:hover:text-slate-900"
                        >
                            {t('chaosHunter.resetTarget')}
                        </button>
                    )}
                    <HelpIcon title={t('chaosHunter.help.title')} body={t('chaosHunter.help.body')} />
                </div>
            </div>

            {/* The Star Chart */}
            <div className="relative w-full aspect-[16/9] bg-slate-950 light:bg-slate-50 rounded-xl border border-slate-800 light:border-slate-200 overflow-hidden cursor-crosshair group shadow-inner shadow-purple-900/10"
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                onMouseLeave={() => { if (!lockedSet) { setHoverCoords(null); } }}
            >
                {/* Grid Lines */}
                <div className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: isLightMode
                            ? 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)'
                            : 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                ></div>

                {/* Axis Labels */}
                <div className="absolute bottom-2 right-4 text-[10px] text-slate-500 font-bold">{t('chaosHunter.sumAxis')}</div>
                <div className="absolute top-4 left-2 text-[10px] text-slate-500 font-bold rotate-90 origin-left">{t('chaosHunter.spanAxis')}</div>

                {/* Historical Stars */}
                {dataPoints.map((pt, idx) => {
                    const left = mapX(pt.sum);
                    const top = mapY(pt.span);
                    if (left < 0 || left > 100 || top < 0 || top > 100) return null;

                    return (
                        <div key={idx}
                            className="absolute w-1.5 h-1.5 rounded-full bg-slate-400/30 light:bg-slate-600/30 hover:bg-white light:hover:bg-slate-900 hover:scale-150 transition-all duration-300 pointer-events-none"
                            style={{ left: `${left}%`, top: `${top}%` }}
                        />
                    );
                })}

                {/* Reticle / Cursor */}
                {(hoverCoords || lockedSet) && (
                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
                        style={{
                            left: `${mapX((lockedSet || hoverCoords).sum)}%`,
                            top: `${mapY((lockedSet || hoverCoords).span)}%`
                        }}
                    >
                        {/* Crosshair */}
                        <div className={`w-20 h-20 border border-dashed rounded-full flex items-center justify-center ${lockedSet ? 'border-red-500 animate-pulse' : 'border-purple-400 opacity-50'}`}>
                            <div className={`w-1 h-1 rounded-full ${lockedSet ? 'bg-red-500' : 'bg-purple-400'}`}></div>
                        </div>

                        {/* Coordinates Label */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-slate-900/90 light:bg-white/95 text-[10px] px-2 py-1 rounded border border-slate-700 light:border-slate-300 whitespace-nowrap z-10 text-center shadow-lg light:shadow-xl backdrop-blur-sm">
                            <div className="text-slate-400 light:text-slate-600">{t('chaosHunter.sumLabel')} <span className="text-white light:text-slate-900 font-bold">{(lockedSet || hoverCoords).sum}</span></div>
                            <div className="text-slate-400 light:text-slate-600">{t('chaosHunter.spanLabel')} <span className="text-white light:text-slate-900 font-bold">{(lockedSet || hoverCoords).span}</span></div>
                            {!lockedSet && <div className="text-[9px] text-purple-400 light:text-purple-600 mt-1 uppercase font-bold">{t('chaosHunter.clickToHunt')}</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* HUD / Results Panel */}
            <div className="mt-4 min-h-[80px] flex items-center justify-between px-4 py-3 bg-slate-950 light:bg-white rounded-xl border border-slate-800 light:border-slate-200 shadow-xl light:shadow-lg">
                {!generatedPreview && !lockedSet ? (
                    <div className="text-slate-500 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> {t('chaosHunter.targetHint')}
                    </div>
                ) : (
                    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${lockedSet ? 'bg-red-900/30 text-red-400 light:bg-red-100 light:text-red-700 border border-red-800/50 light:border-red-200' : 'bg-purple-900/30 text-purple-400 light:bg-purple-100 light:text-purple-700 border border-purple-800/50 light:border-purple-200'}`}>
                                {lockedSet ? t('chaosHunter.targetCaptured') : t('chaosHunter.scanning')}
                            </div>
                            <div className="text-xs text-slate-400">
                                {t('chaosHunter.generatedCombo')}
                            </div>
                        </div>

                        {/* The Numbers */}
                        <div className="flex gap-2">
                            {(lockedSet || generatedPreview).numbers.map(n => (
                                <div key={n} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${lockedSet ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/50' : 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/50'}`}>
                                    {n}
                                </div>
                            ))}
                        </div>

                        {/* Click Hint */}
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] text-slate-500 hidden md:block">
                                {lockedSet ? t('chaosHunter.clickToReset') : ''}
                            </div>

                            {onSave && lockedSet && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent reset click
                                        onSave(lockedSet.numbers, 'Chaos Hunter');
                                    }}
                                    className="w-10 h-10 rounded-full bg-slate-800 light:bg-slate-100 text-slate-400 light:text-slate-500 border border-slate-700 light:border-slate-300 hover:bg-white hover:text-purple-600 hover:border-white transition-all shadow-lg flex items-center justify-center group/save"
                                    title={t('chaosHunter.saveToVault')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 transition-transform group-hover/save:scale-110">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChaosHunter;
