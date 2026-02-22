import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, AlertTriangle, CheckCircle, XCircle, Star } from "lucide-react";

interface MisconceptionCardProps {
    misconception: any;
    totalAttempts: number;
    onAnalyze: (m: any) => void;
}

export function MisconceptionCard({ misconception, totalAttempts, onAnalyze }: MisconceptionCardProps) {
    const confidencePercent = ((misconception.confidence_score || 0) * 100).toFixed(0);
    const impactPercent = totalAttempts > 0
        ? ((misconception.student_count / totalAttempts) * 100).toFixed(1)
        : "0";

    // Impact Logic
    let impactColor = "text-slate-500 bg-slate-100";
    let impactLabel = "Low Impact";
    if (Number(impactPercent) > 30) {
        impactColor = "text-rose-700 bg-rose-50 border-rose-200";
        impactLabel = "High Impact";
    } else if (Number(impactPercent) > 10) {
        impactColor = "text-amber-700 bg-amber-50 border-amber-200";
        impactLabel = "Medium Impact";
    }

    // Status Logic
    const isPriority = misconception.is_priority;
    const isRejected = misconception.status === "rejected";
    const isValid = misconception.status === "valid";

    return (
        <Card className={`overflow-hidden border-l-4 transition-all hover:shadow-md ${isPriority ? "border-l-rose-500" :
                isValid ? "border-l-emerald-500" :
                    isRejected ? "border-l-slate-300 opacity-60" : "border-l-amber-400"
            }`}>
            <CardContent className="p-4 flex gap-4 items-start">
                {/* Stats Column */}
                <div className="flex flex-col items-center gap-1 min-w-[60px] pt-1">
                    <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2 w-full border">
                        <Users className="h-4 w-4 text-slate-400 mb-1" />
                        <span className="font-bold text-lg leading-none text-slate-700">{misconception.student_count}</span>
                        <span className="text-[10px] text-slate-400 uppercase">Students</span>
                    </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2 items-center">
                        <Badge variant="outline" className={`${impactColor} border`}>
                            {impactLabel} ({impactPercent}%)
                        </Badge>
                        {isPriority && (
                            <Badge variant="default" className="bg-rose-600 hover:bg-rose-700 gap-1 pl-1">
                                <Star className="h-3 w-3 fill-white" /> Priority
                            </Badge>
                        )}
                        {isValid && (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 gap-1">
                                <CheckCircle className="h-3 w-3" /> Valid
                            </Badge>
                        )}
                        <span className="text-xs text-slate-400 font-medium ml-auto">
                            {confidencePercent}% Confidence
                        </span>
                    </div>

                    <h4 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                        {misconception.cluster_label || "Unlabeled Misconception"}
                    </h4>

                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                        {misconception.reasoning}
                    </p>
                </div>

                {/* Action Column */}
                <div className="flex flex-col justify-center self-stretch border-l pl-4">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => onAnalyze(misconception)}
                    >
                        Analyze <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
