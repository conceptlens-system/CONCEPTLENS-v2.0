import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Lightbulb, PenTool, CheckCircle, BookOpen } from "lucide-react";

interface RemediationPlan {
    lesson_strategy: string;
    analogy: string;
    practice_questions: string[];
}

interface RemediationModalProps {
    plan: RemediationPlan | null;
    open: boolean;
    onClose: () => void;
    misconceptionLabel: string;
}

export function RemediationModal({ plan, open, onClose, misconceptionLabel }: RemediationModalProps) {
    if (!plan) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-5 bg-gradient-to-r from-indigo-50 to-white border-b shrink-0 text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-indigo-100 p-2 rounded-full">
                            <Wand2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-xl leading-snug text-slate-900">
                            AI Remediation Plan
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-600 mt-1 pl-11">
                        Tailored strategy for: <strong className="text-slate-900">{misconceptionLabel}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto bg-white p-6 space-y-6">

                    {/* Strategy */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                            Lesson Strategy
                        </h3>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-slate-700 leading-relaxed text-sm shadow-sm whitespace-pre-wrap">
                            {plan.lesson_strategy}
                        </div>
                    </div>

                    {/* Analogy */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Relatable Analogy
                        </h3>
                        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-amber-900 leading-relaxed text-sm shadow-sm whitespace-pre-wrap">
                            {plan.analogy}
                        </div>
                    </div>

                    {/* Practice Questions */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                            <PenTool className="h-4 w-4 text-indigo-500" />
                            Practice Questions
                        </h3>
                        <div className="space-y-3">
                            {plan.practice_questions.map((q, i) => (
                                <div key={i} className="flex gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="bg-indigo-100 text-indigo-700 font-bold rounded-full h-6 w-6 flex items-center justify-center shrink-0 text-xs">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-slate-700 pt-0.5 whitespace-pre-wrap">{q}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t bg-slate-50 shrink-0 flex justify-end">
                    <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">
                        <CheckCircle className="h-4 w-4 mr-2" /> Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 
