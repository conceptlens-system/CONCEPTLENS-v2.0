import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, XCircle, Star, Quote, BrainCircuit, BookOpen, Wand2, Users, MessageSquare, Send, Lightbulb, PenTool, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { generateRemediationPlan, askMisconceptionAI } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MisconceptionModalProps {
    misconception: any | null;
    open: boolean;
    onClose: () => void;
    onAction: (id: string, action: "approve" | "reject" | "prioritize" | "deprioritize") => void;
}

export function MisconceptionModal({ misconception, open, onClose, onAction }: MisconceptionModalProps) {
    const { data: session } = useSession();

    // Remediation State
    const [viewMode, setViewMode] = useState<"details" | "remediation">("details");
    const [lessonPlan, setLessonPlan] = useState<any | null>(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing error patterns...");

    const loadingMessages = [
        "Analyzing error patterns...",
        "Consulting pedagogical models...",
        "Designing teaching strategy...",
        "Drafting relatable analogies...",
        "Generating practice questions...",
        "Finalizing remediation plan..."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (generatingPlan) {
            let i = 0;
            interval = setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setLoadingText(loadingMessages[i]);
            }, 2500); // Change text every 2.5s
        }
        return () => clearInterval(interval);
    }, [generatingPlan]);

    // Chat State
    const [chatMessage, setChatMessage] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Reset state when modal opens or misconception changes
    useEffect(() => {
        if (open) {
            setViewMode("details");
            setLessonPlan(null);
            setChatHistory([]);
            setChatMessage("");
        }
    }, [open, misconception]);

    const handleGeneratePlan = async () => {
        if (!session?.user || !misconception) return;
        setGeneratingPlan(true);
        try {
            const token = (session.user as any).accessToken;
            const plan = await generateRemediationPlan(misconception.id || misconception._id, token);
            setLessonPlan(plan);
            setViewMode("remediation");
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to generate plan");
        } finally {
            setGeneratingPlan(false);
        }
    };

    const handleChat = async () => {
        if (!chatMessage.trim() || !session?.user || !misconception) return;
        const msg = chatMessage;
        setChatMessage("");
        setChatHistory(prev => [...prev, { role: "user", content: msg }]);
        setChatLoading(true);

        try {
            const token = (session.user as any).accessToken;
            const res = await askMisconceptionAI(misconception.id || misconception._id, msg, token);
            setChatHistory(prev => [...prev, { role: "ai", content: res.response }]);
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to fetch response");
            setChatHistory(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const formatText = (text: string) => {
        if (!text) return null;
        // Basic markdown bold parsing
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
            } else if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={index} className="font-semibold text-slate-800 not-italic">{part.slice(1, -1)}</em>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    if (!misconception) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="w-full sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-5 bg-white border-b shrink-0 text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                                Confidence: {((misconception.confidence_score || 0) * 100).toFixed(0)}%
                            </Badge>
                            {misconception.is_priority && (
                                <Badge variant="default" className="bg-rose-600 hover:bg-rose-700">
                                    <Star className="h-3 w-3 mr-1 fill-white" /> Priority Goal
                                </Badge>
                            )}
                        </div>
                        <DialogTitle className="text-xl leading-snug text-slate-900">
                            {viewMode === "remediation" ? "AI Remediation Plan" : misconception.cluster_label}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 mt-1">
                            {viewMode === "remediation"
                                ? <span>Tailored strategy for: <strong className="text-slate-700">{misconception.cluster_label}</strong></span>
                                : <span>Identified in <strong>{misconception.question_text || "Unknown Question"}</strong></span>
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-slate-50/50 min-h-0">
                        <div className="p-6 space-y-6">

                            {viewMode === "remediation" && lessonPlan ? (
                                <div className="space-y-6">
                                    {/* Strategy */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                                            <BookOpen className="h-4 w-4 text-emerald-500" />
                                            Lesson Strategy
                                        </h3>
                                        <div className="bg-white border border-slate-200 p-4 rounded-xl text-slate-700 leading-relaxed text-sm shadow-sm whitespace-pre-wrap">
                                            {formatText(lessonPlan.lesson_strategy)}
                                        </div>
                                    </div>

                                    {/* Analogy */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                                            <Lightbulb className="h-4 w-4 text-amber-500" />
                                            Relatable Analogy
                                        </h3>
                                        <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-amber-900 leading-relaxed text-sm shadow-sm whitespace-pre-wrap">
                                            {formatText(lessonPlan.analogy)}
                                        </div>
                                    </div>

                                    {/* Practice Questions */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                                            <PenTool className="h-4 w-4 text-indigo-500" />
                                            Practice Questions
                                        </h3>
                                        <div className="space-y-3">
                                            {lessonPlan.practice_questions.map((q: string, i: number) => (
                                                <div key={i} className="flex gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                                    <div className="bg-indigo-100 text-indigo-700 font-bold rounded-full h-6 w-6 flex items-center justify-center shrink-0 text-xs mt-0.5">
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-sm text-slate-700 pt-0.5 whitespace-pre-wrap leading-relaxed">{formatText(q)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Collapsible Sections */}
                                    <Accordion type="multiple" defaultValue={["reasoning", "matrix"]} className="space-y-4">

                                        {/* Performance Matrix Section */}
                                        {misconception.performance_matrix && (
                                            <AccordionItem value="matrix" className="bg-white border rounded-xl shadow-sm px-4">
                                                <AccordionTrigger className="hover:no-underline py-4 text-slate-800">
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <Users className="h-4 w-4 text-sky-500" />
                                                        Affected Student Profile
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-4 pt-0">
                                                    <Separator className="mb-3" />
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="text-center flex-1">
                                                            <div className="text-2xl font-bold text-emerald-600">{misconception.performance_matrix.top || 0}%</div>
                                                            <div className="text-xs text-slate-500 uppercase font-medium mt-1">Top 25%</div>
                                                        </div>
                                                        <div className="w-px h-8 bg-slate-200 mx-2" />
                                                        <div className="text-center flex-1">
                                                            <div className="text-2xl font-bold text-amber-500">{misconception.performance_matrix.average || 0}%</div>
                                                            <div className="text-xs text-slate-500 uppercase font-medium mt-1">Average</div>
                                                        </div>
                                                        <div className="w-px h-8 bg-slate-200 mx-2" />
                                                        <div className="text-center flex-1">
                                                            <div className="text-2xl font-bold text-rose-500">{misconception.performance_matrix.struggling || 0}%</div>
                                                            <div className="text-xs text-slate-500 uppercase font-medium mt-1">Struggling</div>
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )}

                                        {/* Reasoning Section */}
                                        <AccordionItem value="reasoning" className="bg-white border rounded-xl shadow-sm px-4">
                                            <AccordionTrigger className="hover:no-underline py-4 text-slate-800">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <BrainCircuit className="h-4 w-4 text-indigo-500" />
                                                    AI Reasoning
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 pt-0 text-slate-600 leading-relaxed text-sm">
                                                <Separator className="mb-3" />
                                                {misconception.reasoning && (
                                                    <div className="space-y-3">
                                                        {misconception.reasoning.includes("**Analysis:**") ? (
                                                            <>
                                                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                                    <span className="font-semibold text-blue-800 block mb-1 text-xs uppercase tracking-wide">Analysis</span>
                                                                    {misconception.reasoning.split("**Recommendation:**")[0].replace("**Analysis:**", "").trim()}
                                                                </div>
                                                                {misconception.reasoning.includes("**Recommendation:**") && (
                                                                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                                                        <span className="font-semibold text-emerald-800 block mb-1 text-xs uppercase tracking-wide">Recommendation</span>
                                                                        {misconception.reasoning.split("**Recommendation:**")[1].trim()}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            misconception.reasoning
                                                        )}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* Correct Answer Section */}
                                        {misconception.correct_answer && (
                                            <AccordionItem value="correct_answer" className="bg-white border rounded-xl shadow-sm px-4">
                                                <AccordionTrigger className="hover:no-underline py-4 text-slate-800">
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        Correct Answer
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-4 pt-0 text-slate-900 font-medium">
                                                    <Separator className="mb-3" />
                                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-900">
                                                        {misconception.correct_answer}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )}

                                        {/* Evidence Section */}
                                        <AccordionItem value="evidence" className="bg-white border rounded-xl shadow-sm px-4">
                                            <AccordionTrigger className="hover:no-underline py-4 text-slate-800">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <Quote className="h-4 w-4 text-emerald-500" />
                                                    Student Evidence
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 pt-0">
                                                <Separator className="mb-3" />
                                                <div className="space-y-3">
                                                    {misconception.evidence?.map((quote: string, i: number) => (
                                                        <div key={i} className={cn(
                                                            "p-3 rounded-lg border text-sm relative",
                                                            quote.includes("Skipped")
                                                                ? "bg-slate-100 border-slate-200 text-slate-500 italic flex items-center justify-center py-4"
                                                                : "bg-slate-50/80 border-slate-100 text-slate-600 italic"
                                                        )}>
                                                            {quote.includes("Skipped") ? (
                                                                <span className="flex items-center gap-2 not-italic text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                                                                    Did Not Attempt
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <span className="absolute top-2 left-2 text-slate-300 text-2xl font-serif leading-none">&quot;</span>
                                                                    <span className="relative z-10 pl-4 block">{quote}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {!misconception.evidence?.length && <p className="text-sm text-slate-400 italic">No direct evidence quotes available.</p>}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* Concept Chain Section */}
                                        <AccordionItem value="concepts" className="bg-white border rounded-xl shadow-sm px-4">
                                            <AccordionTrigger className="hover:no-underline py-4 text-slate-800">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <BookOpen className="h-4 w-4 text-amber-500" />
                                                    Concept Chain
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 pt-0">
                                                <Separator className="mb-3" />
                                                <div className="flex flex-wrap gap-2">
                                                    {misconception.concept_chain?.map((concept: string, i: number) => (
                                                        <Badge key={i} variant="secondary" className="bg-slate-100 border-slate-200 text-slate-700 font-normal hover:bg-slate-200">
                                                            {concept}
                                                        </Badge>
                                                    ))}
                                                    {!misconception.concept_chain?.length && <p className="text-sm text-slate-400 italic">No concept chain data available.</p>}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                    </Accordion>

                                    {/* Ask AI Chat Widget */}
                                    <div className="bg-white border text-left border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                                            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                                                <SparklesIcon className="h-4 w-4 text-indigo-600" />
                                                AI Data Assistant
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Ask context-aware questions about this specific misconception.</p>
                                        </div>
                                        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto bg-slate-50/50">
                                            {chatHistory.length === 0 && (
                                                <div className="text-center text-sm text-slate-400 italic py-4">
                                                    Try asking &quot;Why did students choose the most common wrong answer?&quot;
                                                </div>
                                            )}
                                            {chatHistory.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={cn(
                                                        "max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
                                                        msg.role === 'user'
                                                            ? 'bg-slate-800 text-white rounded-br-sm'
                                                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                                                    )}>
                                                        {msg.role === 'ai' && <div className="font-semibold text-xs text-indigo-600 mb-1 flex items-center gap-1"><BrainCircuit className="h-3 w-3" /> CONCEPTLENS AI</div>}
                                                        {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
                                                    </div>
                                                </div>
                                            ))}
                                            {chatLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-sm p-4 shadow-sm flex items-center gap-2 text-sm italic">
                                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> AI is thinking...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                                            <Input
                                                placeholder="Ask a question..."
                                                className="h-10 text-sm focus-visible:ring-indigo-500 bg-slate-50"
                                                value={chatMessage}
                                                onChange={e => setChatMessage(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleChat()}
                                                disabled={chatLoading}
                                            />
                                            <Button className="h-10 w-10 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-700 rounded-xl" onClick={handleChat} disabled={chatLoading}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>
                    </div>

                    <DialogFooter className="p-4 border-t bg-white shrink-0 flex-col sm:flex-row items-center sm:justify-between gap-4">
                        {viewMode === "remediation" ? (
                            <Button variant="ghost" onClick={() => setViewMode("details")} className="text-slate-600 w-full sm:w-auto">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => onAction(misconception.id || misconception._id, "reject")}>
                                    <XCircle className="h-4 w-4 mr-2" /> Reject
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {viewMode === "details" && (
                                <>
                                    <Button
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                                        onClick={handleGeneratePlan}
                                        disabled={generatingPlan}
                                    >
                                        {generatingPlan ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                <span className="animate-pulse">{loadingText}</span>
                                            </>
                                        ) : (
                                            <><Wand2 className="h-4 w-4 mr-2" /> AI Lesson Generation</>
                                        )}
                                    </Button>
                                </>
                            )}

                            {viewMode === "details" && !generatingPlan && (
                                <>
                                    {misconception.is_priority ? (
                                        <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => onAction(misconception.id || misconception._id, "deprioritize")}>
                                            <Star className="h-4 w-4 mr-2 fill-rose-700" /> Unmark
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="hover:bg-slate-50" onClick={() => onAction(misconception.id || misconception._id, "prioritize")}>
                                            <Star className="h-4 w-4 mr-2 text-slate-500" /> Priority
                                        </Button>
                                    )}

                                    <Button variant="default" className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm" onClick={() => onAction(misconception.id || misconception._id, "approve")}>
                                        <CheckCircle className="h-4 w-4 mr-2" /> Validate
                                    </Button>
                                </>
                            )}
                            {viewMode === "remediation" && (
                                <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => setViewMode("details")}>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Done Reviewing
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    );
}

function SparklesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
    )
}
