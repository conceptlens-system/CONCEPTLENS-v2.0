import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, XCircle, Star, AlertTriangle, Quote, BrainCircuit, BookOpen, Wand2, Users, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { generateRemediationPlan, askMisconceptionAI } from "@/lib/api";
import { RemediationModal } from "./RemediationModal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MisconceptionDrawerProps {
    misconception: any | null;
    open: boolean;
    onClose: () => void;
    onAction: (id: string, action: "approve" | "reject" | "prioritize" | "deprioritize") => void;
}

export function MisconceptionDrawer({ misconception, open, onClose, onAction }: MisconceptionDrawerProps) {
    const { data: session } = useSession();

    // Remediation State
    const [planMode, setPlanMode] = useState(false);
    const [lessonPlan, setLessonPlan] = useState<any | null>(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);

    // Chat State
    const [chatMessage, setChatMessage] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    const handleGeneratePlan = async () => {
        if (!session?.user || !misconception) return;
        setGeneratingPlan(true);
        try {
            const token = (session.user as any).accessToken;
            const plan = await generateRemediationPlan(misconception.id || misconception._id, token);
            setLessonPlan(plan);
            setPlanMode(true);
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

    if (!misconception) return null;

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-[540px] flex flex-col h-full bg-slate-50/50 p-0 sm:max-w-[540px]">
                <SheetHeader className="px-6 py-6 bg-white border-b">
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
                    <SheetTitle className="text-xl leading-snug text-slate-900">
                        {misconception.cluster_label}
                    </SheetTitle>
                    <SheetDescription className="text-slate-500">
                        Identified in <strong>{misconception.question_text || "Unknown Question"}</strong>
                    </SheetDescription>

                    <div className="mt-4">
                        <Button
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 w-full"
                            variant="outline"
                            onClick={handleGeneratePlan}
                            disabled={generatingPlan}
                        >
                            {generatingPlan ? (
                                <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Wand2 className="h-4 w-4 mr-2" />
                            )}
                            Generate Remediation Plan
                        </Button>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 bg-slate-50/50">
                    <div className="py-6 space-y-6">
                        {/* Collapsible Sections */}
                        <Accordion type="multiple" defaultValue={["matrix", "reasoning"]} className="space-y-4">

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
                                                <div className="text-2xl font-bold text-emerald-600">{misconception.performance_matrix.top || 0}</div>
                                                <div className="text-xs text-slate-500 uppercase font-medium mt-1">Top 25%</div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200 mx-2" />
                                            <div className="text-center flex-1">
                                                <div className="text-2xl font-bold text-amber-500">{misconception.performance_matrix.average || 0}</div>
                                                <div className="text-xs text-slate-500 uppercase font-medium mt-1">Average</div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200 mx-2" />
                                            <div className="text-center flex-1">
                                                <div className="text-2xl font-bold text-rose-500">{misconception.performance_matrix.struggling || 0}</div>
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
                                    {misconception.reasoning}
                                </AccordionContent>
                            </AccordionItem>

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
                                            <div key={i} className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 italic relative">
                                                <span className="absolute top-2 left-2 text-slate-300 text-2xl font-serif leading-none">"</span>
                                                <span className="relative z-10 pl-4 block">{quote}</span>
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
                        <div className="bg-white border rounded-xl shadow-sm p-4 mt-6">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-slate-800">
                                <MessageSquare className="h-4 w-4 text-indigo-500" />
                                Ask AI about this data
                            </h3>
                            <div className="space-y-3">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-700 ml-6' : 'bg-indigo-50 border border-indigo-100 text-indigo-900 mr-6'}`}>
                                        {msg.content}
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        placeholder="e.g. Why did they pick this option?"
                                        className="h-9 text-sm focus-visible:ring-indigo-500"
                                        value={chatMessage}
                                        onChange={e => setChatMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleChat()}
                                        disabled={chatLoading}
                                    />
                                    <Button size="sm" className="h-9 w-9 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={handleChat} disabled={chatLoading}>
                                        {chatLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-white">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        {misconception.is_priority ? (
                            <Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => onAction(misconception.id || misconception._id, "deprioritize")}>
                                <Star className="h-4 w-4 mr-2 fill-rose-700" /> Unmark Priority
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full hover:bg-slate-50" onClick={() => onAction(misconception.id || misconception._id, "prioritize")}>
                                <Star className="h-4 w-4 mr-2 text-slate-500" /> Top Priority
                            </Button>
                        )}

                        <Button variant="default" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => onAction(misconception.id || misconception._id, "approve")}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Validate Risk
                        </Button>
                    </div>
                    <Button variant="ghost" className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => onAction(misconception.id || misconception._id, "reject")}>
                        <XCircle className="h-4 w-4 mr-2" /> Reject Detection
                    </Button>
                </div>
            </SheetContent>

            <RemediationModal
                open={planMode}
                onClose={() => setPlanMode(false)}
                plan={lessonPlan}
                misconceptionLabel={misconception.cluster_label}
            />
        </Sheet>
    );
}
