
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    title: string;
    total: number;
}

export function BarChart({ data, title, total }: BarChartProps) {
    const maxVal = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full">
            <h3 className="text-sm font-medium text-slate-500 mb-4">{title}</h3>
            <div className="space-y-3 flex-1 overflow-auto">
                {data.map((item, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700 truncate max-w-[120px]" title={item.label}>{item.label}</span>
                            <span className="text-slate-500">{item.value} issues</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${item.color || "bg-indigo-500"}`}
                                style={{ width: `${(item.value / maxVal) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
                {data.length === 0 && <div className="text-center text-xs text-slate-400 py-4">No data available</div>}
            </div>
        </div>
    );
}
