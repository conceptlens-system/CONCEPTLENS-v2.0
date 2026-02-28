"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState, useMemo, Suspense } from "react"
import { fetchGroupedMisconceptions, fetchAssessmentSummaries, fetchSubjects, updateMisconceptionStatus, validateMisconception, fetchExamParticipation, downloadExamPdf } from "@/lib/api"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { ChevronRight, AlertTriangle, Users, Calendar, BrainCircuit, Sparkles, Filter, Search, Share2, Download, HeartPulse, ListFilter, ArrowUpDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/dashboard/StatCard"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MisconceptionCard } from "@/components/misconception/MisconceptionCard"
import { MisconceptionModal } from "@/components/misconception/MisconceptionModal"
import { ParticipationModal } from "@/components/dashboard/ParticipationModal"
import { BarChart } from "@/components/charts/BarChart"
import { DonutChart } from "@/components/charts/DonutChart"
import { ConceptGraph } from "@/components/misconception/ConceptGraph"
import { Network, LayoutList } from "lucide-react"


import { PageTransition } from "@/components/PageTransition"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

function MisconceptionsPageContent() {
    const { data: session } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

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
    const [detailViewMode, setDetailViewMode] = useState<"list" | "graph">("list")
    const [subjectFilter, setSubjectFilter] = useState("all")
    const [examSearch, setExamSearch] = useState("")

    // Misconception View State
    const [selectedMisconception, setSelectedMisconception] = useState<any | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [sortBy, setSortBy] = useState<"impact" | "confidence" | "pending">("pending")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [exportingPdf, setExportingPdf] = useState(false)

    // Exam Pagination
    const [examPage, setExamPage] = useState(1)
    const examsPerPage = 9

    // Participation State
    const [participationOpen, setParticipationOpen] = useState(false)
    const [participationData, setParticipationData] = useState<any>(null)
    const [loadingParticipation, setLoadingParticipation] = useState(false)

    const handleOpenParticipation = async () => {
        if (!selectedExamId || selectedExamId === 'all') return;

        setLoadingParticipation(true);
        const token = (session?.user as any)?.accessToken;
        const data = await fetchExamParticipation(token, selectedExamId);
        setParticipationData(data);
        setLoadingParticipation(false);
        setParticipationOpen(true);
    };

    const handleExportPdf = async () => {
        if (!session?.user || !selectedExamId) return;
        setExportingPdf(true);
        toast.info("Generating Report PDF...");
        try {
            const token = (session.user as any).accessToken;
            await downloadExamPdf(selectedExamId, token);
            toast.success("Ready! Downloading PDF...");
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to generate PDF");
        } finally {
            setExportingPdf(false);
        }
    };

    // 0. Initialize from URL
    useEffect(() => {
        const examId = searchParams.get('examId')
        if (examId && examId !== selectedExamId) {
            setSelectedExamId(examId)
        }
    }, [searchParams])

    // Update URL when exam selected
    const handleExamSelect = (id: string) => {
        setSelectedExamId(id)
        const params = new URLSearchParams(searchParams)
        if (id) {
            params.set('examId', id)
        } else {
            params.delete('examId')
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    // 1. Fetch Exams on Mount
    useEffect(() => {
        if (!session?.user) return
        const loadExams = async () => {
            if (exams.length === 0) setLoadingExams(true)
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                // Deduplicate frontend-side if backend fails to do so for safety
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
    }, [selectedExamId, (session?.user as any)?.accessToken]) // Added accessToken dependency to fix refresh bug

    // --- Action Handlers ---
    const handleAction = async (id: string, action: "approve" | "reject" | "prioritize" | "deprioritize") => {
        if (!session?.user) return
        try {
            const token = (session.user as any).accessToken
            await validateMisconception(id, action);

            // Optimistic Update
            const updatedGroups = groupedData.map(group => ({
                ...group,
                misconceptions: group.misconceptions.map((m: any) => {
                    if (m.id === id || m._id === id) {
                        const updates: any = {}
                        if (action === "approve") updates.status = "valid";
                        if (action === "reject") updates.status = "rejected";
                        if (action === "prioritize") updates.is_priority = true;
                        if (action === "deprioritize") updates.is_priority = false;
                        return { ...m, ...updates }
                    }
                    return m
                })
            }))
            setGroupedData(updatedGroups)

            // Also update selected misconception if open
            if (selectedMisconception && (selectedMisconception.id === id || selectedMisconception._id === id)) {
                const updates: any = {}
                if (action === "approve") updates.status = "valid";
                if (action === "reject") updates.status = "rejected";
                if (action === "prioritize") updates.is_priority = true;
                if (action === "deprioritize") updates.is_priority = false;
                setSelectedMisconception({ ...selectedMisconception, ...updates })
            }

            toast.success(`Action '${action}' successful`)
            if (action === "reject" || action === "approve") setDrawerOpen(false);

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
        const statusCounts = { valid: 0, pending: 0, rejected: 0 }
        const topicCounts: Record<string, number> = {} // New

        groupedData.forEach(group => {
            totalIssues += group.misconception_count
            affectedStudents += group.student_count

            // Criticality and Status from misconceptions list
            group.misconceptions.forEach((m: any) => {
                if ((m.confidence_score || 0) > 0.8) criticalIssues++

                if (m.status === 'valid') statusCounts.valid++
                else if (m.status === 'rejected') statusCounts.rejected++
                else statusCounts.pending++

                // Topic Counting (New)
                const chain = m.concept_chain || []
                // chain is [Subject, Unit, Topic]
                const topic = chain.length > 2 ? chain[2] : "General"
                topicCounts[topic] = (topicCounts[topic] || 0) + 1
            })
        })

        // Format for Charts
        const donutData = [
            { label: "Valid", value: statusCounts.valid, color: "#10b981" },
            { label: "Pending", value: statusCounts.pending, color: "#f59e0b" },
            { label: "Rejected", value: statusCounts.rejected, color: "#ef4444" }
        ].filter(d => d.value > 0)

        const barData = Object.entries(topicCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5) // Top 5 topics

        return { totalIssues, criticalIssues, affectedStudents, statusCounts, donutData, barData }
    }, [groupedData])

    // --- V2 Grouping Logic (By Question) ---
    const questionGroups = useMemo(() => {
        if (!groupedData.length) return [];

        const examData = groupedData[0]; // Since we filter by selectedExamId, usually only 1 group returned
        if (!examData) return [];

        const allMisconceptions = examData.misconceptions || [];
        const groups: Record<string, any> = {};

        allMisconceptions.forEach((m: any) => {
            // Filter by search/status first
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                (m.cluster_label || "").toLowerCase().includes(searchLower) ||
                (m.question_text || "").toLowerCase().includes(searchLower);

            if (!matchesSearch) return;
            if (statusFilter !== "all" && m.status !== statusFilter) return;

            const qId = m.question_id || "unknown";
            if (!groups[qId]) {
                groups[qId] = {
                    question_id: qId,
                    question_text: m.question_text || "Unknown Question", // Fallback if API hasn't enriched yet
                    misconceptions: []
                };
            }
            groups[qId].misconceptions.push(m);
        });

        // Sort Misconceptions within groups
        Object.values(groups).forEach((group: any) => {
            group.misconceptions.sort((a: any, b: any) => {
                // 0. Priority
                if (a.is_priority && !b.is_priority) return -1;
                if (!a.is_priority && b.is_priority) return 1;

                // 1. Status (Pending first)
                if (sortBy === "pending") {
                    if (a.status === "pending" && b.status !== "pending") return -1;
                    if (a.status !== "pending" && b.status === "pending") return 1;
                }

                // 2. Impact
                const impactA = (a.student_count / (examData.student_count || 1));
                const impactB = (b.student_count / (examData.student_count || 1));
                if (sortBy === "impact" || sortBy === "pending") {
                    if (impactA !== impactB) return impactB - impactA;
                }

                // 3. Confidence
                return (b.confidence_score || 0) - (a.confidence_score || 0);
            });
        });

        return Object.values(groups);
    }, [groupedData, searchQuery, statusFilter, sortBy]);


    // --- High Impact list ---
    const highImpactRisks = useMemo(() => {
        if (!groupedData.length) return [];
        const examData = groupedData[0];
        const all = examData.misconceptions || [];

        return all
            .filter((m: any) => {
                const impact = (m.student_count / (examData.student_count || 1));
                return impact > 0.2; // > 20% impact
            })
            .sort((a: any, b: any) => b.student_count - a.student_count)
            .slice(0, 4); // Top 4
    }, [groupedData]);


    if (loadingExams) return <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
    </div>

    // --- VIEW: Exam Selection ---
    if (!selectedExamId) {
        return (
            <PageTransition className="space-y-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BrainCircuit className="h-8 w-8 text-indigo-600" />
                        Misconception Analysis
                    </h1>
                    <p className="text-slate-500 mt-2">Select an assessment to view AI-generated insights and student learning gaps.</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white p-2 md:p-1 rounded-md border shadow-sm w-full md:w-auto">
                            <div className="flex items-center gap-2 mb-2 md:mb-0">
                                <Filter className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                                    <SelectTrigger className="w-full md:w-[220px] border-0 focus:ring-0 h-8 text-xs bg-transparent">
                                        <SelectValue placeholder="Filter by Subject" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {Object.entries(subjects).map(([id, name]) => (
                                            <SelectItem key={id} value={id} className="truncate max-w-[300px]">
                                                {name}
                                            </SelectItem>
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
                                        <ChevronRight className="h-3 w-3 text-slate-500 rotate-45" /> {/* X icon alternative */}
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
                                <LayoutGridIcon className="h-4 w-4 mr-2" /> Grid
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
                                                <HeartPulse className="h-4 w-4 text-emerald-500" />
                                                <span className="text-xl font-bold text-slate-900">{exam.avg_score}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-4">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(exam.created_at).toLocaleDateString()}
                                        </div>
                                        <Button
                                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2"
                                            onClick={() => handleExamSelect(exam.id)}
                                        >
                                            <BrainCircuit className="h-4 w-4" /> Analyze Insights
                                        </Button>
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
                                                {exam.total_students}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${exam.avg_score >= 70 ? "text-emerald-600" : exam.avg_score >= 40 ? "text-amber-600" : "text-red-500"}`}>
                                                    {exam.avg_score}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleExamSelect(exam.id)}
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


            </PageTransition>
        )
    }

    const selectedExam = exams.find(e => e._id === selectedExamId || e.id === selectedExamId);

    // --- Helper for Title Cleaning ---
    const getMisconceptionTitle = (m: any) => {
        if (!m) return "Unknown Issue";

        let label = m.cluster_label || "";
        // Aggressively clean "Misconception similar to:" and quotes
        label = label.replace(/Misconception similar to:?/gi, "").replace(/["']/g, "").trim();

        // If label is good, use it
        if (label && label.length > 5) return label;

        // Fallback 1: Reasoning (often contains the core misconceptions)
        if (m.reasoning && m.reasoning.length > 5) {
            // Clean reasoning of markdown bold and specific headers
            let cleanReasoning = m.reasoning.replace(/\*\*/g, "").replace(/^Analysis:?\s*/i, "");
            return cleanReasoning.split('.')[0].substring(0, 80) + (cleanReasoning.length > 80 ? "..." : "");
        }

        // Fallback 2: Question text (context)
        if (m.question_text) return `Issue in: "${m.question_text.substring(0, 40)}..."`;

        return "Detected Misconception";
    }

    // --- VIEW: Dashboard (Selected Exam) ---
    return (
        <PageTransition className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="pl-0 text-slate-500 hover:text-indigo-600 hover:bg-transparent -ml-2 mb-2"
                        onClick={() => handleExamSelect("")}
                    >
                        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                        Back to Exams
                    </Button>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Insight Analysis: {selectedExam?.title}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {selectedExam?.total_students} Students</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {stats.totalIssues} Misconceptions</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleOpenParticipation}
                        disabled={loadingParticipation}
                    >
                        {loadingParticipation ? (
                            <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Users className="h-4 w-4" />
                        )}
                        Participation
                    </Button>
                    <Button
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                    >
                        {exportingPdf ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Export Report
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                    <p>{error}</p>
                </div>
            )}

            {/* 2. STATS & CHARTS ROW */}
            {/* 2. STATS & CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {/* Col 1: Compact Stats */}
                <div className="flex flex-col gap-4">
                    <StatCard
                        title="Concept Health"
                        value={`${Math.max(0, 100 - (stats.totalIssues * 2))}%`}
                        icon={HeartPulse}
                        color={stats.criticalIssues > 5 ? "rose" : "emerald"}
                        compact={true}
                        className="flex-1"
                    />
                    <StatCard
                        title="Critical Gaps"
                        value={stats.criticalIssues}
                        icon={AlertTriangle}
                        color="amber"
                        compact={true}
                        className="flex-1"
                    />
                </div>

                {/* Col 2: Topic Risks (Moved from Col 3) */}
                <div className="h-full min-h-[180px]">
                    <BarChart
                        data={stats.barData}
                        title="Top Concept Risks"
                        total={stats.totalIssues}
                    />
                </div>

                {/* Col 3 & 4: Leaderboard (Expanded) */}
                <Card className="md:col-span-2 border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-slate-500">Top Misconceptions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {loading ? <Skeleton className="h-full w-full m-4" /> : highImpactRisks.length === 0 ? (
                            <div className="h-24 flex items-center justify-center text-xs text-slate-400">No significant issues found</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {highImpactRisks.map((m: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => { setSelectedMisconception(m); setDrawerOpen(true); }}>
                                        <div className="flex-1 min-w-0 pr-3">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 border-0 font-medium shrink-0",
                                                    m.status === 'valid' ? "bg-emerald-50 text-emerald-700" :
                                                        m.status === 'rejected' ? "bg-red-50 text-red-700" :
                                                            "bg-amber-50 text-amber-700"
                                                )}>
                                                    #{i + 1}
                                                </Badge>
                                                <span className="text-sm font-medium text-slate-700 truncate block group-hover:text-indigo-600">
                                                    {getMisconceptionTitle(m)}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate pl-1 flex gap-2">
                                                <span>{m.student_count} students</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="truncate max-w-[250px]">{m.question_text || "Question"}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {m.future_score_impact && (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                                    +{m.future_score_impact}% Impact
                                                </Badge>
                                            )}
                                            <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. MAIN ANALYSIS (Accordion) */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-indigo-500" />
                        Detailed Analysis
                    </h2>

                    <div className="flex flex-wrap gap-2">
                        {/* Sort */}
                        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="w-[260px] bg-white border-0 shadow-sm">
                                <ArrowUpDown className="h-3 w-3 mr-2 shrink-0" />
                                <SelectValue placeholder="Sort By" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Needs Review First</SelectItem>
                                <SelectItem value="impact">Highest Impact First</SelectItem>
                                <SelectItem value="confidence">AI Confidence First</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-white border-0 shadow-sm">
                                <ListFilter className="h-3 w-3 mr-2 shrink-0" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending Review</SelectItem>
                                <SelectItem value="valid">Validated</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Search */}
                        <div className="relative">
                            <Search className="h-3 w-3 absolute left-3 top-2.5 text-slate-400" />
                            <Input
                                placeholder="Search questions..."
                                className="pl-9 w-[220px] bg-white border-0 shadow-sm focus-visible:ring-indigo-500"
                                onChange={(e) => setSearchQuery(e.target.value)}
                                value={searchQuery}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                ) : questionGroups.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-500">No misconceptions found matching your filters.</p>
                    </div>
                ) : (
                    <>
                        {/* Detail View Toggle */}
                        <div className="flex justify-end mb-4">
                            <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center gap-1">
                                <Button
                                    variant={detailViewMode === "list" ? "outline" : "ghost"}
                                    size="sm"
                                    onClick={() => setDetailViewMode("list")}
                                    className={cn("h-8 px-3 text-xs", detailViewMode === "list" ? "bg-white shadow-sm text-indigo-600 font-semibold border-0" : "text-slate-500 hover:text-slate-700")}
                                >
                                    <LayoutList className="h-3.5 w-3.5 mr-1.5" /> List View
                                </Button>
                                <Button
                                    variant={detailViewMode === "graph" ? "outline" : "ghost"}
                                    size="sm"
                                    onClick={() => setDetailViewMode("graph")}
                                    className={cn("h-8 px-3 text-xs", detailViewMode === "graph" ? "bg-white shadow-sm text-indigo-600 font-semibold border-0" : "text-slate-500 hover:text-slate-700")}
                                >
                                    <Network className="h-3.5 w-3.5 mr-1.5" /> Concept Map
                                </Button>
                            </div>
                        </div>

                        {detailViewMode === "graph" ? (
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                <ConceptGraph
                                    misconceptions={groupedData.length > 0 ? groupedData[0].misconceptions : []}
                                    onNodeClick={(m) => { setSelectedMisconception(m); setDrawerOpen(true); }}
                                />
                            </div>
                        ) : (
                            <Accordion type="multiple" className="space-y-4">
                                {questionGroups.map((group: any) => (
                                    <AccordionItem key={group.question_id} value={group.question_id} className="border rounded-xl bg-white shadow-sm px-4">
                                        <AccordionTrigger className="hover:no-underline py-4">
                                            <div className="flex items-center gap-4 text-left">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                                    {group.misconceptions.length} Issues
                                                </Badge>
                                                <span className="font-semibold text-slate-800 text-base">
                                                    {group.question_text}
                                                </span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4 pt-2">
                                            <div className="flex flex-col space-y-2 pl-2 md:pl-4 border-l-2 border-indigo-50 ml-2">
                                                {group.misconceptions.map((m: any) => (
                                                    <div key={m.id || m._id} className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all text-left">
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className={cn(
                                                                    "text-xs font-medium border-0 px-2 py-0.5",
                                                                    m.status === 'valid' ? "bg-green-100 text-green-700" :
                                                                        m.status === 'rejected' ? "bg-red-100 text-red-700" :
                                                                            "bg-amber-100 text-amber-700"
                                                                )}>
                                                                    {m.status === 'valid' ? 'Validated' : m.status === 'rejected' ? 'Rejected' : 'Pending'}
                                                                </Badge>
                                                                <span className="font-semibold text-slate-700 truncate block group-hover:text-indigo-600 cursor-pointer" onClick={() => { setSelectedMisconception(m); setDrawerOpen(true); }}>
                                                                    {getMisconceptionTitle(m)}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-400 pl-1">
                                                                {m.student_count} students affected
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {m.future_score_impact && (
                                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                                                                    +{m.future_score_impact}% Score Impact
                                                                </Badge>
                                                            )}
                                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setSelectedMisconception(m); setDrawerOpen(true); }}>
                                                                View Details <ChevronRight className="h-3 w-3 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </>
                )}
            </div>

            <MisconceptionModal
                misconception={selectedMisconception}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onAction={handleAction}
            />

            {/* Participation Modal */}
            {
                participationData && (
                    <ParticipationModal
                        open={participationOpen}
                        onClose={() => setParticipationOpen(false)}
                        data={participationData}
                        examTitle={selectedExam?.title || 'Assessment'}
                    />
                )
            }
        </PageTransition >
    )
}

function LayoutGridIcon(props: any) {
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
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
    )
}

function ListIcon(props: any) {
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
            <line x1="8" x2="21" y1="6" y2="6" />
            <line x1="8" x2="21" y1="12" y2="12" />
            <line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" />
            <line x1="3" x2="3.01" y1="12" y2="12" />
            <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
<<<<<<< HEAD
=======
    )
}

export default function MisconceptionsPage() {
    return (
        <Suspense fallback={
            <div className="p-8 space-y-4 max-w-7xl mx-auto">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        }>
            <MisconceptionsPageContent />
        </Suspense>
>>>>>>> 5f13c1e (feat(student): Enhancements to student portal, analytics, onboarding, and curriculum visibility)
    )
}
