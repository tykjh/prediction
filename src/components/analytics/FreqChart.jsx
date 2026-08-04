import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';

const FreqChart = ({ data, averageScore, isWeighted, isLightMode }) => {
    const { t } = useLanguage();
    const ticks = Array.from({ length: 49 }, (_, i) => i + 1);

    if (!data || data.length === 0) return (
        <div className="h-64 flex items-center justify-center text-slate-500">
            {t('freqChart.noData')}
        </div>
    );

    return (
        <div className="h-64 w-full animate-in fade-in zoom-in duration-500">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLightMode ? "#cbd5e1" : "#334155"} />
                    <XAxis
                        dataKey="number"
                        ticks={ticks}
                        interval={0}
                        tick={{ fontSize: 9, fill: isLightMode ? '#475569' : '#94a3b8', fontWeight: isLightMode ? 700 : 400 }}
                        tickLine={false}
                        axisLine={{ stroke: isLightMode ? '#94a3b8' : '#475569' }}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: isLightMode ? '#475569' : '#94a3b8', fontWeight: isLightMode ? 700 : 400 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={isWeighted}
                    />
                    <Tooltip
                        cursor={{ fill: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{
                            backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                            borderColor: isLightMode ? '#e2e8f0' : '#334155',
                            borderRadius: '4px',
                            color: isLightMode ? '#0f172a' : '#fff'
                        }}
                        itemStyle={{ color: isLightMode ? '#0f172a' : '#fff' }}
                        formatter={(value) => [value, isWeighted ? t('freqChart.score') : t('freqChart.count')]}
                    />
                    <Bar
                        dataKey="score"
                        fill={isWeighted ? '#a855f7' : '#6366f1'}
                        radius={[2, 2, 0, 0]}
                        animationDuration={1000}
                    />
                    <ReferenceLine
                        y={averageScore}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        label={{
                            value: t('freqChart.avg'),
                            fill: '#ef4444',
                            fontSize: 10,
                            position: 'right'
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-slate-500 light:text-slate-600 font-medium mt-2">
                {isWeighted
                    ? t('freqChart.footerWeighted')
                    : t('freqChart.footerRaw')}
            </p>
        </div>
    );
};

export default FreqChart;
