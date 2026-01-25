import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const ZoneRadar = ({ data, isLightMode, maxNumber = 49 }) => {

    // Process data to group into zones
    const zoneData = useMemo(() => {
        let zones = [];

        if (maxNumber <= 12) {
            // Small range (e.g. Special Number 1-8): Treat each number as a zone
            for (let i = 1; i <= maxNumber; i++) {
                zones.push({ name: `Num ${i}`, min: i, max: i, count: 0 });
            }
        } else if (maxNumber === 38) {
            // Super Lotto Main Zone: 1-38. Request: 5 units per zone -> 8 Zones.
            // 1-5, 6-10 ... 36-38.
            const step = 5;
            for (let i = 0; i < 8; i++) {
                const min = (i * step) + 1;
                let max = (i + 1) * step;
                if (max > maxNumber) max = maxNumber; // Cap last zone (36-38)

                zones.push({
                    name: `${min}-${max}`,
                    min,
                    max,
                    count: 0
                });
            }
        } else {
            // Larger range: Create ~7 zones
            const zoneCount = 7;
            const step = Math.ceil(maxNumber / zoneCount);

            for (let i = 0; i < zoneCount; i++) {
                const min = (i * step) + 1;
                let max = (i + 1) * step;
                if (max > maxNumber) max = maxNumber; // Cap at max
                if (min > maxNumber) break; // Stop if we exceeded max

                zones.push({
                    name: `Zone ${i + 1} (${min}-${max})`,
                    min,
                    max,
                    count: 0
                });
            }
        }

        if (data) {
            data.forEach(d => {
                // Find which zone this number belongs to
                // Data comes with d.number and d.score
                const targetZone = zones.find(z => d.number >= z.min && d.number <= z.max);
                if (targetZone) {
                    targetZone.count += d.score;
                }
            });
        }
        return zones;
    }, [data, maxNumber]);

    if (!zoneData) return null;

    return (
        <div className="h-full w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <h4 className="text-xs font-bold text-slate-400 light:text-slate-600 mb-2 uppercase tracking-wider">Spatial Zone Distribution</h4>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={zoneData}>
                        <PolarGrid stroke={isLightMode ? "#e2e8f0" : "#334155"} />
                        <PolarAngleAxis
                            dataKey="name"
                            tick={{ fill: isLightMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Radar
                            name="Hit Count"
                            dataKey="count"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="#10b981"
                            fillOpacity={0.4}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isLightMode ? '#ffffff' : '#1e293b',
                                borderColor: isLightMode ? '#e2e8f0' : '#334155',
                                borderRadius: '4px',
                                color: isLightMode ? '#0f172a' : '#fff',
                                fontSize: '11px'
                            }}
                            itemStyle={{ color: isLightMode ? '#0f172a' : '#fff' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-center text-[10px] text-slate-500 light:text-slate-500 mt-2 max-w-xs mx-auto">
                Shows which "sector" of the board is getting the most hits. Balanced zones suggest a random distribution.
            </p>
        </div>
    );
};

export default ZoneRadar;
