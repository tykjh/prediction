import React from 'react';

const PredictionRow = ({
    title,
    subtitle,
    onGenerate,
    isLoading,
    numbers = [],
    stats,
    meta,
    boxColors,
    buttonColor = "bg-slate-700 hover:bg-slate-600",
    icon = "🎲",
    type = "standard", // standard, hybrid, ai
    progress = 0,

    onSave,
    pickCount = 6
}) => {

    // Helper to generate style map for hybrid numbers
    const getHybridStyle = (num) => {
        if (!meta || type !== 'hybrid') return boxColors || 'bg-blue-600';

        const { hot, cold } = meta;
        // Check membership
        if (hot && hot.includes(num)) return "bg-red-900/60 border-2 border-red-500/50 text-red-200 shadow-red-500/20";
        if (cold && cold.includes(num)) return "bg-blue-900/60 border-2 border-blue-500/50 text-blue-200 shadow-blue-500/20";

        return "bg-slate-700 border border-slate-600 text-slate-300"; // Neutral
    };

    return (
        <div className="bg-slate-900/40 light:bg-white/80 backdrop-blur rounded-2xl p-5 border border-white/5 light:border-slate-200 shadow-lg light:shadow-xl transition-all hover:border-white/10 light:hover:border-slate-300 hover:bg-slate-900/60 light:hover:bg-white group">
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Left: Button Area */}
                <div className="shrink-0">
                    <button
                        onClick={onGenerate}
                        disabled={isLoading}
                        className={`w-16 h-16 rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 flex flex-col items-center justify-center gap-1 border border-white/10 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed hover:scale-105 active:scale-95 group/btn relative overflow-hidden ${buttonColor}`}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                        ) : (
                            <>
                                <span className="text-2xl leading-none filter drop-shadow-md group-hover/btn:scale-125 transition-transform duration-300">{icon}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-80 group-hover/btn:opacity-100">Run</span>
                            </>
                        )}
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                    </button>
                </div>

                {/* Right: Content Area (Horizontal Layout) */}
                <div className="grow flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Header - Left Aligned */}
                    <div className="w-full md:w-56 shrink-0 text-center md:text-left md:border-r border-white/5 light:border-slate-200 md:pr-6">
                        <h3 className="text-sm font-black text-white light:text-slate-800 uppercase tracking-wider leading-tight mb-1">{title}</h3>
                        <p className="text-[10px] font-medium text-slate-400 light:text-slate-500 leading-snug">{subtitle}</p>
                    </div>

                    {/* Numbers Container - Centered */}
                    <div className="grow flex flex-col items-center justify-center">
                        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                            {numbers && numbers.length > 0 ? (
                                numbers.map((num, idx) => (
                                    <div
                                        key={`${idx}-${num}`}
                                        className={`w-11 h-11 flex items-center justify-center rounded-full text-lg font-black text-white shadow-lg animate-in fade-in zoom-in duration-300 border border-white/10 ${getHybridStyle(num)} ${type !== 'hybrid' && !meta ? (boxColors || 'bg-blue-600') : ''}`}
                                    >
                                        {num}
                                    </div>
                                ))
                            ) : (
                                Array.from({ length: pickCount }).map((_, idx) => (
                                    <div
                                        key={`placeholder-${idx}`}
                                        className="w-11 h-11 rounded-full border-2 border-slate-800 light:border-slate-300 border-dashed bg-slate-950/30 light:bg-slate-100"
                                    ></div>
                                ))
                            )}
                        </div>

                        {/* Progress Bar (Compact) */}
                        {type === 'ai' && isLoading && (
                            <div className="w-24 bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                                <div
                                    className="bg-teal-500 h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        )}

                        {/* Hybrid Stats (Compact) */}
                        {type === 'hybrid' && stats && (
                            <div className="flex gap-3 text-[10px] text-amber-500/60 font-mono mt-1">
                                <span>🔥{stats.avgHot}</span>
                                <span>❄️{stats.avgCold}</span>
                                <span>⚖️{stats.avgNeutral}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Button (Conditional) */}
                {numbers && numbers.length > 0 && onSave && (
                    <button
                        onClick={onSave}
                        className="ml-auto w-10 h-10 rounded-full bg-white/5 light:bg-slate-200 border border-white/10 light:border-slate-300 text-white/40 light:text-slate-500 hover:text-white hover:bg-emerald-500 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 flex items-center justify-center group/save"
                        title="Save to Vault"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 transition-transform group-hover/save:scale-110">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Hybrid Reference Pools - Full Width Bottom (if exists) */}
            {
                type === 'hybrid' && meta && (
                    <div className="mt-3 pt-3 border-t border-slate-800/50 light:border-slate-200 text-[10px]">
                        <div className="flex flex-wrap gap-4 justify-center bg-slate-950/30 light:bg-slate-50 p-2 rounded border border-slate-800/30 light:border-slate-200">
                            <div className="flex gap-2 items-center">
                                <span className="text-red-400 font-bold">🔥 Hot:</span>
                                <span className="text-slate-500">{meta.hot && meta.hot.sort((a, b) => a - b).map(n => (n < 10 ? `0${n}` : n)).join(' ')}</span>
                            </div>
                            <div className="flex gap-2 items-center border-l border-slate-800 light:border-slate-300 pl-4">
                                <span className="text-blue-400 font-bold">❄️ Cold:</span>
                                <span className="text-slate-500">{meta.cold && meta.cold.sort((a, b) => a - b).map(n => (n < 10 ? `0${n}` : n)).join(' ')}</span>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PredictionRow;
