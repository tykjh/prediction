import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const LastDigitStats = ({ data, isLightMode }) => {

    const digitData = useMemo(() => {
        // Init 0-9
        const digits = Array.from({ length: 10 }, (_, i) => ({ digit: i.toString(), count: 0 }));

        if (data) {
            data.forEach(d => {
                const numStr = d.number.toString();
                const lastDigit = parseInt(numStr.slice(-1));
                digits[lastDigit].count += d.score;
            });
        }

        // Mark top 3 for special comparison
        const sorted = [...digits].sort((a, b) => b.count - a.count);
        const top3Threshold = sorted[2]?.count || 0;

        return digits.map(d => ({
            ...d,
            isHot: d.count >= top3Threshold && d.count > 0
        }));
    }, [data]);

    return (
        <div className="h-full w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <h4 className="text-xs font-bold text-slate-400 light:text-slate-600 mb-2 uppercase tracking-wider">Trailing Digit Analysis (0-9)</h4>
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={digitData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="digit"
                            type="category"
                            tick={{ fill: isLightMode ? '#64748b' : '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                            width={30}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                                borderColor: isLightMode ? '#e2e8f0' : '#334155',
                                borderRadius: '4px',
                                color: isLightMode ? '#0f172a' : '#fff'
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                            {digitData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isHot ? '#f43f5e' : (isLightMode ? '#cbd5e1' : '#334155')}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LastDigitStats;
