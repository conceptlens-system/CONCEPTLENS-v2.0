"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { fetchTrends } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, BrainCircuit, LineChart, Minus, ArrowRight, Search, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export default function ProfessorReportsPage() {
    const { data: session } = useSession()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (!session?.user) return
        const load = async () => {
            try {
                const token = (session.user as any).accessToken
                const res = await fetchTrends(token)
                setData(res)
            } catch (e: any) {
                console.error(e)
                setError(e.message || "Failed to fetch report data")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session])

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-slate-500 animate-pulse">Analyzing student performance trends...</p>
        </div>
    )

    if (error) return (
        <div className="p-12 text-center max-w-2xl mx-auto mt-10 border-2 border-dashed rounded-lg border-red-200 bg-red-50">
            <div className="bg-white p-4 rounded-full inline-block mb-4 shadow-sm">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-900">Failed to Load Report</h2>
            <p className="text-red-700/80 mt-2">{error}</p>
        </div>
    )

    if (!data || !data.matrix || data.matrix.length === 0) return (
        <div className="p-12 text-center max-w-2xl mx-auto mt-10 border-2 border-dashed rounded-lg border-slate-200">
            <div className="bg-slate-50 p-4 rounded-full inline-block mb-4">
                <LineChart className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Insufficient Data for Trends</h2>
            <p className="text-slate-500 mt-2">
                Reports require multiple exams and validated misconceptions to detect patterns over time.
                Check back after conducting more assessments.
            </p>
        </div>
    )

    // Filter topics based on search
    const filteredMatrix = data.matrix.filter((row: any) =>
        row.topic.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Identify critical topics for the top section (Worsening OR Critical status in last exam)
    const criticalTopics = data.matrix.filter((row: any) =>
        row.trend === 'worsening' || row.history[row.history.length - 1].status === 'critical'
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                        <LineChart className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Learning Trends Report</h1>
                        <p className="text-slate-500 dark:text-slate-400">Longitudinal analysis of misconception patterns.</p>
                    </div>
                </div>
            </div>

            {/* AI Insight Banner */}
            <Card className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-purple-950/40 border-indigo-100 dark:border-indigo-900 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <BrainCircuit className="h-32 w-32 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="p-6 md:p-8 flex gap-6 relative z-10">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm h-fit border border-indigo-100 dark:border-indigo-900 hidden md:block">
                        <BrainCircuit className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg">AI Trend Analysis</h3>
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                Powered by ConceptLens AI
                            </Badge>
                        </div>
                        <p className="text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed text-base max-w-4xl">
                            {data.summary}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Critical Attention Section */}
            {criticalTopics.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                        Critical Attention Required
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {criticalTopics.map((topic: any) => (
                            <Card key={topic.topic} className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow group">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-rose-600 transition-colors" title={topic.topic}>
                                            {topic.topic}
                                        </h3>
                                        {topic.trend === 'worsening' && (
                                            <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200">
                                                <TrendingDown className="h-3 w-3 mr-1" /> Worsening
                                            </Badge>
                                        )}
                                        {topic.trend !== 'worsening' && topic.history[topic.history.length - 1].status === 'critical' && (
                                            <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200">
                                                Critical
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        Showing signs of persistent misconceptions in recent exams.
                                    </div>
                                    <Button variant="ghost" size="sm" className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 mt-2 h-8" asChild>
                                        <a href={`/professor/misconceptions?topic=${encodeURIComponent(topic.topic)}`}>
                                            View Details <ArrowRight className="h-3 w-3 ml-1" />
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* All Topics Grid */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Topic Performance Cards</h2>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMatrix.map((row: any) => (
                        <TopicCard key={row.topic} row={row} exams={data.exams} />
                    ))}
                </div>

                {filteredMatrix.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        No topics found matching "{searchQuery}"
                    </div>
                )}
            </div>
        </div>
    )
}

function TopicCard({ row, exams }: { row: any, exams: any[] }) {
    // Determine card styling based on health
    const isClean = row.history[row.history.length - 1].status === 'clean' && row.trend !== 'worsening';
    const isCritical = row.history[row.history.length - 1].status === 'critical' || row.trend === 'worsening';

    return (
        <Card className={cn(
            "flex flex-col h-full hover:shadow-lg transition-all duration-200 border-l-4",
            isClean ? "border-l-emerald-500" :
                isCritical ? "border-l-rose-500" :
                    "border-l-amber-500"
        )}>
            <CardHeader className="p-4 pb-2 space-y-1">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-medium line-clamp-2 min-h-[3rem]" title={row.topic}>
                        {row.topic}
                    </CardTitle>
                    {row.trend === 'improving' && <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />}
                    {row.trend === 'worsening' && <TrendingDown className="h-5 w-5 text-rose-500 shrink-0" />}
                    {row.trend === 'stable' && <Minus className="h-5 w-5 text-slate-300 shrink-0" />}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex-1 flex flex-col gap-4">
                <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Exam History</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <TooltipProvider delayDuration={0}>
                            {row.history.map((cell: any, index: number) => {
                                const exam = exams.find(e => e.id === cell.exam_id);
                                return (
                                    <Tooltip key={cell.exam_id}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "h-3 w-3 rounded-full transition-all cursor-help",
                                                    cell.status === 'clean' && "bg-emerald-400 hover:bg-emerald-500 hover:scale-125",
                                                    cell.status === 'issue' && "bg-amber-400 hover:bg-amber-500 hover:scale-125",
                                                    cell.status === 'critical' && "bg-rose-500 hover:bg-rose-600 hover:scale-125"
                                                )}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">
                                            <p className="font-bold">{exam?.title}</p>
                                            <p>{new Date(exam?.date).toLocaleDateString()}</p>
                                            <p className="mt-1 capitalize text-slate-300">
                                                {cell.status === 'clean' ? 'No Issues' : `${cell.count} Issues`}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </TooltipProvider>
                    </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center text-xs text-slate-500">
                    <div>
                        Current Status: <span className={cn(
                            "font-medium",
                            isClean ? "text-emerald-600" : isCritical ? "text-rose-600" : "text-amber-600"
                        )}>
                            {isClean ? "Strong" : isCritical ? "Critical" : "Needs Focus"}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
