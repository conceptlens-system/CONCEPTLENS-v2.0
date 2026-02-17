"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { fetchGroupedMisconceptions, fetchExams, fetchAssessmentSummaries, fetchExamStudents, fetchSubjects, updateMisconceptionStatus } from "@/lib/api"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { ChevronRight, AlertTriangle, Users, BookOpen, Calendar, HelpCircle, BrainCircuit, Sparkles, TrendingUp, Filter, Search, ArrowRight, LayoutGrid, List as ListIcon, BarChart3, Eye, FileText, Loader2, X, CheckCircle, ClipboardCheck, Stethoscope, Microscope, Quote, GraduationCap, Lightbulb, XCircle } from "lucide-react"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    })

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
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 min-h-screen bg-slate-50/50">
            {/* Header Section */}
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="pl-0 text-slate-500 hover:text-indigo-600 hover:bg-transparent -ml-2"
                        onClick={() => setSelectedExamId(null)}
                    >
                        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                        Back to Exams
                    </Button>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            Insight Dashboard
                        </h1>
                        <p className="text-slate-500 mt-1 text-lg">
                            Deep dive analysis for <span className="font-semibold text-indigo-600">{exams.find(e => e._id === selectedExamId)?.title}</span>
                        </p>
                    </div>
                </div>
            </div>


            {
                error && (
                    <div className="p-8 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg m-6">
                        <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
                        <h3 className="font-bold">Error Loading Insights</h3>
                        <p>{error}</p>
                    </div>
                )
            }

            {/* Stats Overview */}
            {
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="h-32 animate-pulse bg-slate-200 border-none"></Card>
                        ))}
                    </div>
                ) : groupedData.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <BrainCircuit className="h-32 w-32" />
                                </div>
                                <CardContent className="p-6 relative z-10">
                                    <p className="text-indigo-100 font-medium mb-1">Total Issues Detected</p>
                                    <h3 className="text-4xl font-bold">{stats.totalIssues}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-sm text-indigo-100/80 bg-white/10 w-fit px-2 py-1 rounded-full">
                                        <TrendingUp className="h-4 w-4" />
                                        <span>In this Assessment</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="border-none shadow-lg bg-white relative overflow-hidden group hover:shadow-xl transition-shadow">
                                <div className="absolute top-0 right-0 w-1 bg-amber-500 h-full"></div>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 font-medium mb-1">Critical Alerts</p>
                                            <h3 className="text-4xl font-bold text-slate-900">{stats.criticalIssues}</h3>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-full">
                                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500">High confidence detections requiring immediate attention.</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="border-none shadow-lg bg-white relative overflow-hidden group hover:shadow-xl transition-shadow">
                                <div className="absolute top-0 right-0 w-1 bg-blue-500 h-full"></div>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 font-medium mb-1">Students Impacted</p>
                                            <h3 className="text-4xl font-bold text-slate-900">{stats.affectedStudents}</h3>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-full">
                                            <Users className="h-6 w-6 text-blue-500" />
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500">Total students showing signs of these misconceptions.</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )
            }

            {/* Charts Section */}
            {
                loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Skeleton className="lg:col-span-2 h-[300px] w-full rounded-xl" />
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                    </div>
                ) : groupedData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <motion.div className="lg:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                            <Card className="h-full border-slate-100 shadow-md">
                                <CardHeader>
                                    <CardTitle>Topic Distribution</CardTitle>
                                    <CardDescription>Where misconceptions are clustering</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.topicData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                cursor={{ fill: '#f8fafc' }}
                                            />
                                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                            <Card className="h-full border-slate-100 shadow-md">
                                <CardHeader>
                                    <CardTitle>Confidence Breakdown</CardTitle>
                                    <CardDescription>AI Model Certainty</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
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
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )
            }

            {/* Content Grid */}
            {
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="h-[200px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="h-10 w-10 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">All Clear!</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">No misconceptions found matching your filters. Keep up the great teaching!</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedData.length > 0 && groupedData[0].misconceptions.map((misconception: any, index: number) => {
                            const displayChain = misconception.concept_chain || ["Subject", "Unit", "Topic (AI Inferred)"];
                            const confidencePercent = ((misconception.confidence_score || 0) * 100).toFixed(0);

                            return (
                                <motion.div
                                    key={misconception.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="bg-slate-50/50 border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                <span className="flex items-center gap-1"><Microscope className="h-3 w-3" /> Diagnostic Mode</span>
                                                <span>•</span>
                                                <span>ID: {(misconception.id).substring(0, 8)}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                {misconception.status === 'valid' ? (
                                                    <Badge className="bg-green-600 text-white gap-1 pl-1.5"><CheckCircle className="h-3.5 w-3.5" /> Validated Pattern</Badge>
                                                ) : misconception.status === 'rejected' ? (
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 gap-1 pl-1.5"><XCircle className="h-3.5 w-3.5" /> Dismissed</Badge>
                                                ) : (
                                                    <Badge className="bg-amber-500 text-white gap-1 pl-1.5"><Eye className="h-3.5 w-3.5" /> Under Investigation</Badge>
                                                )}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right md:block mr-2 flex justify-between md:justify-end items-center w-full md:w-auto gap-4">
                                                <div className="text-xs text-slate-500 font-medium uppercase">Confidence</div>
                                                <div className={`text-lg font-bold ${Number(confidencePercent) > 70 ? 'text-green-600' : 'text-amber-500'}`}>
                                                    {confidencePercent}%
                                                </div>
                                            </div>
                                            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleStatusUpdate(misconception.id, "rejected")}
                                                disabled={misconception.status === "rejected"}
                                            >
                                                Dismiss
                                            </Button>
                                            <Button
                                                size="sm"
                                                className={`${misconception.status === "valid" ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"}`}
                                                onClick={() => handleStatusUpdate(misconception.id, "valid")}
                                                disabled={misconception.status === "valid"}
                                            >
                                                {misconception.status === "valid" ? (
                                                    <><CheckCircle className="h-4 w-4 mr-2" /> Validated</>
                                                ) : (
                                                    <><ClipboardCheck className="h-4 w-4 mr-2" /> Validate</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* LEFT PANEL: EVIDENCE (7 cols) */}
                                        <div className="lg:col-span-7 space-y-6">
                                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 p-2 px-4 rounded-full border w-fit">
                                                <GraduationCap className="h-4 w-4 text-indigo-500" />
                                                {displayChain.join("  ›  ")}
                                            </div>

                                            <Card className="border-slate-200 shadow-sm">
                                                <CardHeader className="bg-slate-50 py-3 border-b">
                                                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                                        <HelpCircle className="h-4 w-4" /> Exam Context
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-6">
                                                    <p className="text-lg text-slate-900 font-medium mb-6">
                                                        {misconception.question_text || "Question content unavailable..."}
                                                    </p>
                                                    <div className="space-y-3">
                                                        {misconception.options?.map((opt: any, i: number) => {
                                                            const isCorrect = opt.is_correct;
                                                            const isDistractor = misconception.cluster_label?.includes(opt.text) || (!isCorrect && i === 1);
                                                            return (
                                                                <div key={i} className={`p-3 border rounded-lg flex items-center gap-3 relative overflow-hidden ${isCorrect ? 'bg-green-50 border-green-200' : ''} ${isDistractor ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' : ''} ${!isCorrect && !isDistractor ? 'opacity-60' : ''}`}>
                                                                    {isDistractor && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>}
                                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-green-600 text-white border-green-600' : ''} ${isDistractor ? 'bg-white text-amber-600 border-amber-400' : ''}`}>
                                                                        {String.fromCharCode(65 + i)}
                                                                    </div>
                                                                    <span className={`flex-grow ${isCorrect ? 'text-green-800 font-medium' : 'text-slate-700'}`}>{opt.text}</span>
                                                                    {isCorrect && <Badge className="bg-green-200 text-green-800 hover:bg-green-200 border-none ml-2">Correct</Badge>}
                                                                    {isDistractor && <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200 border-none ml-2">Misconception</Badge>}
                                                                </div>
                                                            )
                                                        }) || <div className="text-slate-400 italic">No options loaded. Check backend API.</div>}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <div className="space-y-3">
                                                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-indigo-500" /> Student Voices
                                                </h4>
                                                <div className="grid gap-3">
                                                    {misconception.evidence && misconception.evidence.length > 0 ? (
                                                        misconception.evidence.map((txt: string, i: number) => (
                                                            <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 text-sm italic relative pl-8">
                                                                <Quote className="h-3 w-3 text-slate-300 absolute top-3 left-3" />
                                                                "{txt}"
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-slate-400 italic">No text evidence captured.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT PANEL: DIAGNOSIS (5 cols) */}
                                        <div className="lg:col-span-5 space-y-6">
                                            <Card className="border-indigo-100 shadow-md bg-white relative overflow-hidden ring-4 ring-indigo-50/30">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                                                        <Stethoscope className="h-5 w-5" /> AI Diagnosis
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="bg-indigo-50/50 p-4 rounded-lg text-base font-medium text-slate-800 leading-relaxed border border-indigo-100">
                                                        "{misconception.reasoning || `Observed pattern consistent with '${misconception.cluster_label}'.`}"
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline" className="bg-white">Recurrent Pattern</Badge>
                                                        <Badge variant="outline" className="bg-white text-amber-600 border-amber-200">Concept Gap</Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-slate-900 text-slate-100 border-none shadow-xl">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-white text-base">
                                                        <Lightbulb className="h-5 w-5 text-yellow-400" /> Remediation
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="flex gap-3 items-start">
                                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                                        <div>
                                                            <p className="font-semibold text-sm">Review Core Definition</p>
                                                            <p className="text-xs text-slate-400 mt-1">Revisit {displayChain[displayChain.length - 1]} fundamentals.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 items-start">
                                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                                                        <div>
                                                            <p className="font-semibold text-sm">Targeted Practice</p>
                                                            <p className="text-xs text-slate-400 mt-1">Assign differentiator problems.</p>
                                                        </div>
                                                    </div>
                                                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold mt-2">
                                                        Generate Quiz <ArrowRight className="h-4 w-4 ml-2" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )
            }
        </div >
    )
}
