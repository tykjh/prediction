import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';

const TrendLines = ({ rawHistory, isLightMode, activeZone, isSeparate, PICK = 6, maxNumber = 49 }) => {

    // Process history into trend data (Chronological: Old -> New)
    const trendData = useMemo(() => {
        if (!rawHistory) return [];

        // Reverse standard history (Newest First) -> Chronological (Oldest First)
        const chrono = [...rawHistory].reverse();

        return chrono.map(draw => {
            let nums = [];

            if (isSeparate) {
                if (activeZone === 'special') {
                    // Zone 2: ONLY Special Number
                    // If special number is index 6 (PICK), take it.
                    // If it's missing (e.g. old data), use 0 or skip.
                    if (typeof draw.numbers[PICK] !== 'undefined') {
                        nums = [draw.numbers[PICK]];
                    }
                } else {
                    // Zone 1: Main Numbers ONLY
                    nums = draw.numbers.slice(0, PICK);
                }
            } else {
                // Lotto 6/49 (Standard): Use Main Numbers for trends
                // (Usually trends track main numbers. Special number trends are less common combined)
                nums = draw.numbers.slice(0, PICK);
            }

            if (nums.length === 0) return null;

            // 1. Sum
            const sum = nums.reduce((a, b) => a + b, 0);

            // 2. Odd/Even
            const oddCount = nums.filter(n => n % 2 !== 0).length;
            const evenCount = nums.length - oddCount;

            // 3. High/Low
            // Dynamic threshold based on maxNumber
            // Logic: Midpoint is roughly half of Max.
            // 49 -> 25 (1-24 Low, 25-49 High)
            // 39 -> 20 (1-19 Low, 20-39 High)
            // 38 -> 20 (1-19 Low, 20-38 High)
            // 8 -> 5 (1-4 Low, 5-8 High)
            const midPoint = Math.ceil((maxNumber + 1) / 2);

            const highCount = nums.filter(n => n >= midPoint).length;
            const lowCount = nums.length - highCount;

            return {
                period: draw.period.toString().slice(-3), // Last 3 digits of period
                fullPeriod: draw.period,
                sum,
                odd: oddCount,
                even: evenCount,
                high: highCount,
                low: lowCount,
                balance: oddCount - evenCount // Metric for zero-line
            };
        }).filter(Boolean); // Remove nulls
    }, [rawHistory, activeZone, isSeparate, PICK]);

    if (!trendData || trendData.length === 0) return null;

    const commonAxis = {
        tick: { fontSize: 10, fill: isLightMode ? '#64748b' : '#94a3b8' },
        axisLine: { stroke: isLightMode ? '#cbd5e1' : '#475569' },
        tickLine: false
    };

    const commonGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLightMode ? "#e2e8f0" : "#334155"} />;
    const commonTooltip = (
        <Tooltip
            contentStyle={{
                backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                borderColor: isLightMode ? '#e2e8f0' : '#334155',
                borderRadius: '8px',
                color: isLightMode ? '#0f172a' : '#fff',
                fontSize: '12px'
            }}
            itemStyle={{ padding: 0 }}
        />
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Chart 1: Sum Trend */}
            <div className="bg-slate-900/30 light:bg-slate-50/50 rounded-xl p-4 border border-white/5 light:border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 light:text-slate-600 mb-4 uppercase tracking-wider">Total Sum Volatility</h4>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            {commonGrid}
                            <XAxis dataKey="period" {...commonAxis} />
                            <YAxis domain={['dataMin - 10', 'dataMax + 10']} {...commonAxis} hide />
                            {commonTooltip}
                            <Area type="monotone" dataKey="sum" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSum)" strokeWidth={2} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Odd / Even Balance */}
            <div className="bg-slate-900/30 light:bg-slate-50/50 rounded-xl p-4 border border-white/5 light:border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 light:text-slate-600 mb-4 uppercase tracking-wider">Odd vs Even Count</h4>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            {commonGrid}
                            <XAxis dataKey="period" {...commonAxis} />
                            <YAxis domain={[0, 'auto']} {...commonAxis} hide />
                            {commonTooltip}
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="odd" stroke="#ec4899" strokeWidth={2} dot={false} name="Odd Nums" isAnimationActive={false} />
                            <Line type="monotone" dataKey="even" stroke="#3b82f6" strokeWidth={2} dot={false} name="Even Nums" isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 3: High / Low Balance */}
            <div className="bg-slate-900/30 light:bg-slate-50/50 rounded-xl p-4 border border-white/5 light:border-slate-200 lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider">High / Low Distribution</h4>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800 light:bg-slate-200 px-2 py-0.5 rounded">
                        {(() => {
                            const mid = Math.ceil((maxNumber + 1) / 2);
                            return `Low (1-${mid - 1}) vs High (${mid}-${maxNumber})`;
                        })()}
                    </span>
                </div>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            {commonGrid}
                            <XAxis dataKey="period" {...commonAxis} />
                            <YAxis domain={[0, 'auto']} {...commonAxis} hide />
                            {commonTooltip}
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="High Nums" isAnimationActive={false} />
                            <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Low Nums" isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TrendLines;
