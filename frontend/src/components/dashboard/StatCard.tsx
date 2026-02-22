
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
    title: string;
    value: string | number;
    icon: any;
    color?: "indigo" | "emerald" | "amber" | "rose" | "blue" | "slate";
    description?: string;
    className?: string; // Allow custom classes
    compact?: boolean; // New prop for compact mode
}

export function StatCard({ title, value, icon: Icon, color = "indigo", description, className, compact }: StatCardProps) {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
        blue: "bg-blue-50 text-blue-600",
        slate: "bg-slate-50 text-slate-600",
    };

    return (
        <Card className={cn("border-slate-100 shadow-sm", className)}>
            <CardContent className={cn("flex items-center justify-between", compact ? "p-4" : "p-6")}>
                <div>
                    <p className={cn("font-medium text-slate-500", compact ? "text-xs" : "text-sm")}>{title}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className={cn("font-bold tracking-tight text-slate-900", compact ? "text-2xl" : "text-3xl")}>{value}</h3>
                    </div>
                    {description && !compact && <p className="text-xs text-slate-400 mt-1">{description}</p>}
                </div>
                <div className={cn("rounded-full", colors[color], compact ? "p-2" : "p-3")}>
                    <Icon className={cn(compact ? "h-5 w-5" : "h-6 w-6")} />
                </div>
            </CardContent>
        </Card>
    );
}
