import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        label: string
        positive?: boolean
    }
    color?: "indigo" | "rose" | "amber" | "emerald" | "slate"
}

export function StatCard({ title, value, icon: Icon, description, trend, color = "slate" }: StatCardProps) {
    const colorStyles = {
        indigo: "bg-indigo-50 text-indigo-600",
        rose: "bg-rose-50 text-rose-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600",
        slate: "bg-slate-100 text-slate-600",
    }

    return (
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${colorStyles[color]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                {(description || trend) && (
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        {trend && (
                            <span className={`font-medium ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}>
                                {trend.positive ? "+" : ""}{trend.value}%
                            </span>
                        )}
                        <span className="text-slate-400">{trend?.label || description}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
