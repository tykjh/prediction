import React, { useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const HeatmapGrid = ({ data, isLightMode }) => {
    const { t } = useLanguage();
    // data is expected to be array of objects: { number: 1, score: 10 }

    // 1. Find Max Score for normalization
    const maxScore = useMemo(() => {
        if (!data || data.length === 0) return 1;
        return Math.max(...data.map(d => d.score));
    }, [data]);

    // 2. Generate Grid Cells (1-49)
    const gridCells = useMemo(() => {
        const cells = [];
        for (let i = 1; i <= 49; i++) {
            const match = data.find(d => d.number === i);
            cells.push({
                number: i,
                score: match ? match.score : 0,
                intensity: match ? (match.score / maxScore) : 0
            });
        }
        return cells;
    }, [data, maxScore]);

    // Helper for color interpolation
    const getColor = (intensity) => {
        // Light Mode: White -> Red
        // Dark Mode: Slate-900 -> Orange/Red Fire

        if (isLightMode) {
            // 0% -> Slate-100, 100% -> Red-500
            if (intensity < 0.1) return 'bg-slate-100 text-slate-400';
            if (intensity < 0.3) return 'bg-orange-100 text-orange-800';
            if (intensity < 0.6) return 'bg-orange-300 text-orange-900';
            if (intensity < 0.8) return 'bg-orange-400 text-white';
            return 'bg-red-500 text-white font-bold shadow-lg shadow-red-500/30';
        } else {
            // 0% -> Slate-800, 100% -> Red-500
            if (intensity < 0.1) return 'bg-slate-800/50 text-slate-600';
            if (intensity < 0.3) return 'bg-indigo-900/40 text-indigo-300';
            if (intensity < 0.6) return 'bg-purple-600/60 text-white';
            if (intensity < 0.8) return 'bg-orange-600/80 text-white';
            return 'bg-red-500 text-white font-bold shadow-lg shadow-red-500/50 scale-110 z-10';
        }
    };

    if (!data || data.length === 0) return (
        <div className="h-64 flex items-center justify-center text-slate-500">
            {t('heatmapGrid.noData')}
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
            <div className="grid grid-cols-7 gap-2 p-4 bg-slate-900/50 light:bg-slate-50/50 rounded-2xl border border-white/5 light:border-slate-200">
                {gridCells.map((cell) => (
                    <div
                        key={cell.number}
                        className={`
                            relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg text-xs sm:text-sm transition-all duration-500 cursor-help group
                            ${getColor(cell.intensity)}
                        `}
                    >
                        {cell.number}

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap z-20 pointer-events-none">
                            {t('heatmapGrid.countTooltip', { n: cell.score.toFixed(1) })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-6 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-800 light:bg-slate-200"></div> {t('heatmapGrid.cold')}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-purple-600/60 light:bg-orange-300"></div> {t('heatmapGrid.warm')}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div> {t('heatmapGrid.hot')}</div>
            </div>
        </div>
    );
};

export default HeatmapGrid;
