import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const MultiBetCell = ({ predictions, targetSet, specialNum, maxHits, isSeparate }) => {
    const { t } = useLanguage();
    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);
    const isLongPress = useRef(false);

    // Safety check
    if (!predictions || predictions.length === 0) return <span>-</span>;

    const count = predictions.length;

    // Find winning bets (3+ hits), sorted by hits (DESC)
    const winningIndices = useMemo(() => {
        return predictions
            .map((pred, idx) => {
                const hits = pred.filter(n => targetSet.has(n)).length;
                return { idx, hits };
            })
            .filter(item => item.hits >= 3)
            .sort((a, b) => b.hits - a.hits) // Sort by hits Descending
            .map(item => item.idx);
    }, [predictions, targetSet]);

    // Ensure index is valid safely
    const safeIndex = index >= count ? 0 : index;
    const currentPred = predictions[safeIndex] || [];

    const nextBet = () => {
        setIndex((prev) => (prev + 1) % count);
    };

    const resetBet = () => {
        setIndex(0);
    };

    const nextWinner = () => {
        if (winningIndices.length === 0) return;
        const currentPos = winningIndices.indexOf(safeIndex);
        const nextPos = (currentPos + 1) % winningIndices.length;
        setIndex(winningIndices[nextPos]);
    };

    const resetWinner = () => {
        if (winningIndices.length > 0) setIndex(winningIndices[0]);
    };

    // Long Press Logic Helpers
    const startPress = (longAction) => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            longAction();
            // Optional: Vibrate
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const endPress = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleClick = (e, shortAction) => {
        e.stopPropagation();
        if (isLongPress.current) return;
        shortAction();
    };

    const renderNums = (nums) => (
        <div className="grid grid-cols-3 gap-1 w-max relative z-10">
            {nums.map(n => {
                // FIXED: If separates zones (Super Lotto), Main Zone predictions NEVER match Special Number
                const isSpecialHit = !isSeparate && n === specialNum;
                const isNormalHit = targetSet.has(n) && !isSpecialHit;

                let bgClass = 'bg-slate-800 light:bg-slate-100 text-slate-400 light:text-slate-400';
                if (isSpecialHit) bgClass = 'bg-orange-500 light:bg-orange-500 text-white ring-2 ring-orange-400 shadow-orange-500/50 shadow-sm';
                else if (isNormalHit) bgClass = 'bg-white light:bg-indigo-100 text-slate-900 light:text-indigo-900 ring-2 ring-indigo-500 light:ring-indigo-300 font-bold';

                return (
                    <span key={n} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${bgClass}`}>
                        {n}
                    </span>
                );
            })}
        </div>
    );

    return (
        <div className="flex items-center gap-1 group/cell">
            {renderNums(currentPred)}
            {count > 1 && (
                <div className="flex flex-col items-center gap-1 ml-0.5 opacity-50 group-hover/cell:opacity-100 transition-opacity">
                    <button
                        onMouseDown={() => startPress(resetBet)}
                        onMouseUp={endPress}
                        onMouseLeave={endPress}
                        onTouchStart={() => startPress(resetBet)}
                        onTouchEnd={endPress}
                        onClick={(e) => handleClick(e, nextBet)}
                        className="w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600 light:bg-slate-200 light:hover:bg-slate-300 flex items-center justify-center text-[9px] text-white light:text-slate-700 shadow-sm transition-colors select-none"
                        title={t('multiBetCell.nextBet')}
                    >
                        {safeIndex + 1}
                    </button>
                    {winningIndices.length > 0 && (
                        <button
                            onMouseDown={() => startPress(resetWinner)}
                            onMouseUp={endPress}
                            onMouseLeave={endPress}
                            onTouchStart={() => startPress(resetWinner)}
                            onTouchEnd={endPress}
                            onClick={(e) => handleClick(e, nextWinner)}
                            className="w-4 h-4 rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/50 flex items-center justify-center text-[8px] shadow-sm transition-colors select-none"
                            title={t('multiBetCell.nextWinner')}
                        >
                            🏆
                        </button>
                    )}
                    <span className="text-[8px] text-slate-500 font-mono leading-none">/{count}</span>
                </div>
            )}
        </div>
    );
};

export default MultiBetCell;
