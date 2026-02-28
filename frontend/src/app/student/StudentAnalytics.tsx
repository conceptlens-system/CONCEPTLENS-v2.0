"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Loader2, TrendingUp, AlertTriangle, BookOpen, ChevronRight, CheckCircle2 } from "lucide-react"
import { fetchStudentMastery, fetchStudentFocusAreas, generateStudentStudyPlan } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

export function StudentAnalytics() {
    const { data: session, status } = useSession()

    const [masteryData, setMasteryData] = useState<any[]>([])
    const [focusAreas, setFocusAreas] = useState<any[]>([])

    const [loading, setLoading] = useState(true)
    const [generatingPlanFor, setGeneratingPlanFor] = useState<string | null>(null)

    const [studyPlanDialog, setStudyPlanDialog] = useState<{ open: boolean, plan: string, topic: string }>({
        open: false, plan: "", topic: ""
    })

    useEffect(() => {
        if (status !== "authenticated") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadData = async () => {
            try {
                const [masteryRes, focusRes] = await Promise.all([
                    fetchStudentMastery(token),
                    fetchStudentFocusAreas(token)
                ])
                setMasteryData(masteryRes.data || [])
                setFocusAreas(focusRes.data || [])
            } catch (e) {
                console.error("Failed to load analytics", e)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [session, status])

    const handleGeneratePlan = async (area: any) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return

        setGeneratingPlanFor(area.topic)
        try {
            const res = await generateStudentStudyPlan({
                topic: area.topic,
                struggle: area.struggle
            }, token)

            setStudyPlanDialog({
                open: true,
                plan: res.plan,
                topic: area.topic
            })
            toast.success(`Study plan generated for ${area.topic}`)
        } catch (e: any) {
            toast.error(e.message || "Failed to generate study plan")
        } finally {
            setGeneratingPlanFor(null)
        }
    }

    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </Card>
                <Card className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </Card>
            </div>
        )
    }

    if (masteryData.length === 0 && focusAreas.length === 0) {
        return (
            <Card className="bg-slate-50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <TrendingUp className="h-12 w-12 mb-4 text-slate-300" />
                    <p>Complete some exams to unlock your AI Concept Mastery insights!</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Concept Mastery Radar */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                        AI Concept Mastery
                    </CardTitle>
                    <CardDescription>Your current proficiency across tested concepts.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-[300px]">
                    {masteryData.length >= 3 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={masteryData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${value}%`, 'Mastery']}
                                />
                                <Radar
                                    name="Mastery"
                                    dataKey="A"
                                    stroke="#6366f1"
                                    fill="#818cf8"
                                    fillOpacity={0.5}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Not enough data to generate radar chart. Complete more topics!</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Targeted Focus Areas */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                        Targeted Focus Areas
                    </CardTitle>
                    <CardDescription>Concepts you recently struggled with.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {focusAreas.length > 0 ? (
                        <div className="space-y-4">
                            {focusAreas.map((area, idx) => (
                                <div key={idx} className="flex flex-col space-y-3 p-4 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 className="font-medium text-slate-900 line-clamp-1" title={area.topic}>
                                                {area.topic}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {area.struggle}
                                            </p>
                                        </div>
                                        <Badge variant={area.urgency === 'High' ? 'destructive' : 'secondary'} className="shrink-0">
                                            {area.urgency}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                        onClick={() => handleGeneratePlan(area)}
                                        disabled={generatingPlanFor === area.topic}
                                    >
                                        {generatingPlanFor === area.topic ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                                        ) : (
                                            <><BookOpen className="mr-2 h-4 w-4" /> Generate Study Plan</>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                            <CheckCircle2 className="h-10 w-10 mb-2 opacity-50 text-emerald-500" />
                            <p className="text-sm text-slate-600 font-medium">No pressing focus areas right now!</p>
                            <p className="text-xs mt-1">Keep up the great work.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Study Plan Modal */}
            <Dialog open={studyPlanDialog.open} onOpenChange={(open) => setStudyPlanDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50">
                    <DialogHeader className="p-6 pb-4 bg-white border-b shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">AI Study Guide</Badge>
                        </div>
                        <DialogTitle className="text-xl">Mastering: {studyPlanDialog.topic}</DialogTitle>
                        <DialogDescription>
                            Your personalized 3-step action plan to fix your specific misconceptions.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 p-6">
                        <div className="prose prose-slate prose-sm sm:prose-base max-w-none">
                            <ReactMarkdown>{studyPlanDialog.plan}</ReactMarkdown>
                        </div>
                    </ScrollArea>
                    <div className="p-4 bg-white border-t flex justify-end shrink-0">
                        <Button onClick={() => setStudyPlanDialog(prev => ({ ...prev, open: false }))}>
                            Got it, thanks!
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
