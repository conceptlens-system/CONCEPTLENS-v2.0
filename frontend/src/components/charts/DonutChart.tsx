
import React from 'react';

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    title: string;
}

export function DonutChart({ data, title }: DonutChartProps) {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full">
            <h3 className="text-sm font-medium text-slate-500 mb-4">{title}</h3>
            <div className="flex items-center gap-4">
                {/* SVG Donut */}
                <div className="relative h-24 w-24 shrink-0">
                    <svg viewBox="-1 -1 2 2" className="transform -rotate-90">
                        {total === 0 ? (
                            <circle cx="0" cy="0" r="0.8" fill="transparent" stroke="#f1f5f9" strokeWidth="0.3" />
                        ) : data.map((slice, i) => {
                            const startPercent = cumulativePercent;
                            const slicePercent = slice.value / total;
                            cumulativePercent += slicePercent;

                            // SVG Path Logic for Arcs
                            const [startX, startY] = getCoordinatesForPercent(startPercent);
                            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                            const pathData = slicePercent === 1
                                ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0` // Full circle
                                : `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`;

                            return (
                                <path
                                    key={i}
                                    d={pathData}
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth="0.35"
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-lg font-bold text-slate-800">{total}</span>
                        <span className="text-[8px] uppercase text-slate-400">Total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-slate-600">{item.label}</span>
                            </div>
                            <span className="font-medium text-slate-800">{Math.round((item.value / (total || 1)) * 100)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
