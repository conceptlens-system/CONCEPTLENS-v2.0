"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { fetchGroupedMisconceptions, fetchExams, fetchAssessmentSummaries, fetchExamStudents, fetchSubjects, updateMisconceptionStatus } from "@/lib/api"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { ChevronRight, AlertTriangle, Users, BookOpen, Calendar, HelpCircle, BrainCircuit, Sparkles, TrendingUp, Filter, Search, ArrowRight, LayoutGrid, List as ListIcon, BarChart3, Eye, FileText, Loader2, X, CheckCircle, ClipboardCheck, Stethoscope, Microscope, Quote, GraduationCap, Lightbulb, XCircle, Share2, Download, HeartPulse } from "lucide-react"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/dashboard/StatCard"

export default function MisconceptionsPage() {
    const { data: session } = useSession()
    const [groupedData, setGroupedData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    // --- Exam Selection State ---
    const [exams, setExams] = useState<any[]>([])
    const [loadingExams, setLoadingExams] = useState(true)
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
    const [subjects, setSubjects] = useState<Record<string, string>>({})

    // Exam Filters & View
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [subjectFilter, setSubjectFilter] = useState("all")
    const [examSearch, setExamSearch] = useState("")



    // Exam Pagination
    const [examPage, setExamPage] = useState(1)
    const examsPerPage = 9

    // 1. Fetch Exams on Mount
    // 1. Fetch Exams (Assessments) on Mount
    useEffect(() => {
        if (!session?.user) return
        const loadExams = async () => {
            setLoadingExams(true)
            try {
                const token = (session.user as any).accessToken
                const [assessmentsData, subjectsData] = await Promise.all([
                    fetchAssessmentSummaries(token),
                    fetchSubjects(token)
                ])
                setExams(assessmentsData)

                // Map subjects
                const sMap: Record<string, string> = {}
                subjectsData.forEach((s: any) => { sMap[s._id] = s.name })
                setSubjects(sMap)
            } catch (e) {
                console.error("Failed to load exams", e)
                toast.error("Failed to load assessments")
            } finally {
                setLoadingExams(false)
            }
        }
        loadExams()
    }, [session])



    // Filtered Exams Logic
    const filteredExams = exams.filter(exam => {
        const matchesSubject = subjectFilter === "all" || exam.subject_id === subjectFilter
        const matchesSearch = !examSearch || exam.title.toLowerCase().includes(examSearch.toLowerCase())
        return matchesSubject && matchesSearch
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

    // Reset page when filters change
    useEffect(() => {
        setExamPage(1)
    }, [subjectFilter, examSearch])

    // 2. Fetch Misconceptions when Exam Selected
    useEffect(() => {
        if (!selectedExamId || !session?.user) return

        const loadInsights = async () => {
            setLoading(true)
            setError(null)
            try {
                const token = (session.user as any).accessToken
                // Pass selectedExamId to API with "all" status to get everything
                const data = await fetchGroupedMisconceptions("all", token, selectedExamId)
                setGroupedData(data)
            } catch (e: any) {
                console.error(e)
                setError(e.message || "Failed to load insights")
            } finally {
                setLoading(false)
            }
        }
        loadInsights()
    }, [session, selectedExamId])

    const handleStatusUpdate = async (misconceptionId: string, status: string) => {
        if (!session?.user) return
        try {
            const token = (session.user as any).accessToken
            await updateMisconceptionStatus(misconceptionId, status, token)

            // Update local state
            const updatedGroups = groupedData.map(group => ({
                ...group,
                misconceptions: group.misconceptions.map((m: any) =>
                    m.id === misconceptionId || m._id === misconceptionId
                        ? { ...m, status }
                        : m
                )
            }))
            setGroupedData(updatedGroups)
            toast.success(`Marked as ${status}`)
        } catch (e) {
            console.error(e)
            toast.error("Failed to update status")
        }
    }


    // --- Analytics Derived Data ---
    const stats = useMemo(() => {
        let totalIssues = 0
        let criticalIssues = 0 // Confidence > 80%
        let affectedStudents = 0
        const topicCounts: Record<string, number> = {}

        groupedData.forEach(group => {
            totalIssues += group.misconception_count
            affectedStudents += group.student_count // Approximate

            // Topic Distribution
            const subject = group.subject_id || "Uncategorized"
            topicCounts[subject] = (topicCounts[subject] || 0) + group.misconception_count

            // Criticality from misconceptions list
            group.misconceptions.forEach((m: any) => {
                if ((m.confidence_score || 0) > 0.8) criticalIssues++
            })
        })

        const topicData = Object.entries(topicCounts).map(([name, value]) => ({ name, value }))

        return { totalIssues, criticalIssues, affectedStudents, topicData }
    }, [groupedData])

    // Severity Data for Pie Chart
    const severityData = useMemo(() => {
        let high = 0, medium = 0, low = 0
        groupedData.forEach(group => {
            group.misconceptions.forEach((m: any) => {
                const s = m.confidence_score || 0
                if (s > 0.7) high++
                else if (s > 0.4) medium++
                else low++
            })
        })
        return [
            { name: 'High Confidence', value: high, color: '#4f46e5' }, // Indigo 600
            { name: 'Medium Confidence', value: medium, color: '#f59e0b' }, // Amber 500
            { name: 'Low Confidence', value: low, color: '#94a3b8' }, // Slate 400
        ].filter(d => d.value > 0)
    }, [groupedData])


    // Filter Logic
    const filteredGroups = groupedData.filter(g =>
        g.exam_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.subject_id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentGroups = filteredGroups.slice(startIndex, startIndex + itemsPerPage)

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    if (loadingExams) return <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
    </div>

    // --- VIEW: Exam Selection ---
    if (!selectedExamId) {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-screen">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BrainCircuit className="h-8 w-8 text-indigo-600" />
                        Misconception Analysis
                    </h1>
                    <p className="text-slate-500 mt-2">Select an assessment to view AI-generated insights and student learning gaps.</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        {/* Title already displayed above */}
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white p-2 md:p-1 rounded-md border shadow-sm w-full md:w-auto">
                            <div className="flex items-center gap-2 mb-2 md:mb-0">
                                <Filter className="h-4 w-4 text-slate-400 ml-2" />
                                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                                    <SelectTrigger className="w-full md:w-[140px] border-0 focus:ring-0 h-8 text-xs">
                                        <SelectValue placeholder="Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {Object.entries(subjects).map(([id, name]) => (
                                            <SelectItem key={id} value={id}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="h-px w-full md:h-4 md:w-[1px] bg-slate-200 my-1 md:my-0" />

                            <div className="flex items-center px-2 w-full md:w-auto">
                                <Search className="h-3 w-3 text-slate-400 mr-2 shrink-0" />
                                <Input
                                    placeholder="Search exams..."
                                    className="border-0 focus-visible:ring-0 h-8 w-full md:w-[180px] text-xs p-0"
                                    value={examSearch}
                                    onChange={(e) => setExamSearch(e.target.value)}
                                />
                                {(subjectFilter !== "all" || examSearch) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 ml-2 rounded-full hover:bg-slate-100 shrink-0"
                                        onClick={() => { setSubjectFilter("all"); setExamSearch("") }}
                                    >
                                        <X className="h-3 w-3 text-slate-500" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className={cn("flex-1 md:flex-none", viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-slate-200")}
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" /> Grid
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className={cn("flex-1 md:flex-none", viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-slate-200")}
                            >
                                <ListIcon className="h-4 w-4 mr-2" /> List
                            </Button>
                        </div>
                    </div>
                </div>

                {filteredExams.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-slate-500">No exams found matching your filters.</p>
                        <Button className="mt-4" variant="outline" onClick={() => { setSubjectFilter("all"); setExamSearch("") }}>
                            Clear Filters
                        </Button>
                    </div>
                ) : viewMode === "grid" ? (
                    // GRID VIEW
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredExams.slice((examPage - 1) * examsPerPage, examPage * examsPerPage).map((exam) => (
                            <Card key={exam.id} className="hover:shadow-lg transition-all border-slate-200 hover:border-indigo-300 group flex flex-col">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg font-bold line-clamp-1" title={exam.title}>{exam.title}</CardTitle>
                                            <CardDescription className="flex items-center gap-1">
                                                {subjects[exam.subject_id] || "Unknown Subject"}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={exam.status === "Active" ? "default" : "secondary"} className={exam.status === "Active" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                            {exam.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500 uppercase font-semibold">Students</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Users className="h-4 w-4 text-indigo-500" />
                                                <span className="text-xl font-bold text-slate-900">{exam.total_students}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500 uppercase font-semibold">Avg Score</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <BarChart3 className="h-4 w-4 text-emerald-500" />
                                                <span className="text-xl font-bold text-slate-900">{exam.avg_score}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto space-y-3">
                                        <div className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {exam.created_at ? new Date(exam.created_at).toLocaleDateString() : "No Date"}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-slate-600"
                                                asChild
                                            >
                                                <Link href={`/professor/exams/${exam.id}/results`}>
                                                    <Users className="h-3 w-3 mr-2" /> View Attended Students
                                                </Link>
                                            </Button>

                                            <Button
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                                size="sm"
                                                onClick={() => setSelectedExamId(exam.id)}
                                            >
                                                <BrainCircuit className="h-3 w-3 mr-2" /> Analyze Insights
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    // LIST VIEW
                    <Card>
                        <div className="rounded-md border-0 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead className="w-[300px]">Exam Title</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Students</TableHead>
                                        <TableHead className="text-right">Avg Score</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExams.slice((examPage - 1) * examsPerPage, examPage * examsPerPage).map((exam) => (
                                        <TableRow key={exam.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="font-semibold text-slate-900">{exam.title}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-slate-500 font-normal">
                                                    {subjects[exam.subject_id] || "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm">
                                                {exam.created_at ? new Date(exam.created_at).toLocaleDateString() : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    exam.status === "Active"
                                                        ? "border-green-200 text-green-700 bg-green-50"
                                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                                }>
                                                    {exam.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-slate-600 font-medium">
                                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                                    {exam.total_students}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${exam.avg_score >= 70 ? "text-emerald-600" : exam.avg_score >= 40 ? "text-amber-600" : "text-red-500"}`}>
                                                    {exam.avg_score}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="View Students"
                                                        asChild
                                                    >
                                                        <Link href={`/professor/exams/${exam.id}/results`}>
                                                            <Eye className="h-4 w-4 text-slate-500" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setSelectedExamId(exam.id)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3"
                                                    >
                                                        <BrainCircuit className="h-3.5 w-3.5 mr-2" /> Analyze
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {/* Exam Pagination Controls */}
                {Math.ceil(filteredExams.length / examsPerPage) > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setExamPage(p => Math.max(1, p - 1))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            disabled={examPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                            Page {examPage} of {Math.ceil(filteredExams.length / examsPerPage)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setExamPage(p => Math.min(Math.ceil(filteredExams.length / examsPerPage), p + 1))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            disabled={examPage === Math.ceil(filteredExams.length / examsPerPage)}
                        >
                            Next
                        </Button>
                    </div>
                )}


            </div>
        )
    }

    // --- VIEW: Dashboard (Selected Exam) ---
    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 min-h-screen bg-slate-50/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="pl-0 text-slate-500 hover:text-indigo-600 hover:bg-transparent -ml-2 mb-2"
                        onClick={() => setSelectedExamId(null)}
                    >
                        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                        Back to Exams
                    </Button>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Insight Analysis
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Deep dive into <span className="font-semibold text-indigo-600">{exams.find(e => e._id === selectedExamId)?.title}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Share2 className="h-4 w-4" /> Share Report
                    </Button>
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Download className="h-4 w-4" /> Export Data
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                    <p>{error}</p>
                </div>
            )}

            {/* 1. KEY METRICS ROW */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Concept Health Score"
                        value={`${Math.max(0, 100 - (stats.totalIssues * 2))}%`}
                        icon={HeartPulse}
                        color={stats.criticalIssues > 5 ? "rose" : "emerald"}
                        trend={{ value: 12, label: "vs last exam", positive: true }}
                    />
                    <StatCard
                        title="Critical Gaps"
                        value={stats.criticalIssues}
                        icon={AlertTriangle}
                        color="amber"
                        description="High confidence misconceptions"
                    />
                    <StatCard
                        title="Students at Risk"
                        value={stats.affectedStudents}
                        icon={Users}
                        color="indigo"
                        description="Showing consistent error patterns"
                    />
                </div>
            )}

            {/* 2. CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-slate-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">Topic Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {loading ? <Skeleton className="h-full w-full" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topicData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">Severity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        {loading ? <Skeleton className="h-[200px] w-[200px] rounded-full" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. INSIGHTS GRID (Masonry-style) */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Identified Misconceptions
                    </h2>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search concepts..."
                            className="bg-white border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-500">No insights found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                        {groupedData.flatMap(g => g.misconceptions).map((misconception: any, index: number) => {
                            const confidencePercent = ((misconception.confidence_score || 0) * 100).toFixed(0);
                            const isExpanded = false; // TODO: Implement individual card expansion state?

                            return (
                                <motion.div
                                    key={misconception.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden flex flex-col"
                                >
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 uppercase text-[10px] tracking-wider">
                                                {misconception.concept_chain?.[misconception.concept_chain?.length - 1] || "Concept"}
                                            </Badge>
                                            <div className={`text-sm font-bold ${Number(confidencePercent) > 70 ? 'text-rose-600' : 'text-amber-500'}`}>
                                                {confidencePercent}% Confidence
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-slate-900 leading-tight mb-2">
                                            {misconception.reasoning ? misconception.reasoning.split('.')[0] : "Pattern Detected"}
                                        </h3>

                                        <p className="text-sm text-slate-500 line-clamp-3 mb-4">
                                            {misconception.reasoning}
                                        </p>

                                        <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                                            <div className="flex items-start gap-2">
                                                <Quote className="h-3 w-3 text-slate-400 mt-1 shrink-0" />
                                                <p className="text-xs text-slate-600 italic">
                                                    "{misconception.evidence?.[0] || "No text evidence"}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 border-t bg-slate-50/50 flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-medium">{misconception.status}</span>
                                        <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8">
                                            Analyze <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
