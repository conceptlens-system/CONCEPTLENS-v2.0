"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowRight, CheckCircle2, Clock as ClockIcon, AlertCircle, PlayCircle, History } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchExams } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function StudentExamsPage() {
    const { data: session, status } = useSession()
    const [exams, setExams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken

        if (!token) {
            setLoading(false)
            return
        }

        const load = async () => {
            try {
                const data = await fetchExams(token)
                setExams(data)
            } catch (e) {
                toast.error("Failed to load exams")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session, status])

    const now = new Date()

    const availableExams = exams.filter(e => {
        if (e.attempted) return false // Already taken

        // Available if scheduled time has passed (or is null? assuming null is not startable yet)
        // And if access_end_time has NOT passed
        if (!e.schedule_start) return false
        const start = new Date(e.schedule_start)
        const end = e.exam_access_end_time ? new Date(e.exam_access_end_time) : null

        return start <= now && (!end || end > now)
    })

    const upcomingExams = exams.filter(e => {
        if (e.attempted) return false
        if (!e.schedule_start) return true
        return new Date(e.schedule_start) > now
    })

    const pastExams = exams.filter(e => {
        if (e.attempted) return true // Completed exams go to history

        if (!e.exam_access_end_time) return false
        return new Date(e.exam_access_end_time) <= now
    })

    // Helper to render exam card
    const ExamCard = ({ exam, status }: { exam: any, status: 'available' | 'upcoming' | 'past' }) => (
        <Card className="hover:shadow-md transition-all">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                        <CardDescription>{exam.subject_name || "General"}</CardDescription>
                    </div>
                    {status === 'available' && <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>}
                    {status === 'upcoming' && <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">Upcoming</Badge>}
                    {status === 'past' && (
                        exam.attempted
                            ? <Badge className="bg-purple-500 hover:bg-purple-600">Completed</Badge>
                            : <Badge variant="secondary">Missed</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 text-sm text-slate-500 mb-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Available: {exam.schedule_start ? format(new Date(exam.schedule_start), 'PPP p') : 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>Duration: {exam.duration_minutes} mins</span>
                    </div>
                    {exam.exam_access_end_time && (
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <span>Closes: {format(new Date(exam.exam_access_end_time), 'PPP p')}</span>
                        </div>
                    )}
                </div>

                {status === 'available' ? (
                    <Button asChild className="w-full">
                        <Link href={`/student/exam/${exam._id}`}>
                            Start Exam <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                ) : status === 'upcoming' ? (
                    <Button disabled variant="outline" className="w-full">
                        Not Yet Started <ClockIcon className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    exam.attempted ? (
                        exam.results_published ? (
                            <Button asChild variant="outline" className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800">
                                <Link href={`/student/exam/${exam._id}/results`}>
                                    View Results <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        ) : (
                            <Button disabled variant="outline" className="w-full border-amber-200 text-amber-700 bg-amber-50">
                                Results Pending <ClockIcon className="ml-2 h-4 w-4" />
                            </Button>
                        )
                    ) : (
                        <Button disabled variant="ghost" className="w-full">
                            Exam Closed <AlertCircle className="ml-2 h-4 w-4" />
                        </Button>
                    )
                )}
            </CardContent>
        </Card>
    )



    return (
        <PageTransition className="space-y-12 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Exams</h1>
                <p className="text-slate-500 mt-2">View your assigned assessments and review past performances.</p>
            </div>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-[200px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : exams.length === 0 ? (
                <Card className="border-dashed bg-slate-50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <CheckCircle2 className="h-16 w-16 mb-4 text-slate-300" />
                        <h3 className="text-xl font-medium text-slate-700 mb-1">You're all caught up!</h3>
                        <p>You have no available, upcoming, or past exams.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-12">
                    {/* Action Required: Available Now (Highlighted) */}
                    {availableExams.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-green-100">
                                <PlayCircle className="w-6 h-6 text-green-500" />
                                <h2 className="text-2xl font-bold text-slate-900">Action Required <span className="text-slate-400 font-normal text-lg ml-2">Available Now</span></h2>
                            </div>
                            <PaginatedExamList exams={availableExams} status="available" ExamCard={ExamCard} />
                        </section>
                    )}

                    {/* Upcoming */}
                    {upcomingExams.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <ClockIcon className="w-6 h-6 text-blue-500" />
                                <h2 className="text-2xl font-bold text-slate-900">Upcoming <span className="text-slate-400 font-normal text-lg ml-2">Scheduled</span></h2>
                            </div>
                            <PaginatedExamList exams={upcomingExams} status="upcoming" ExamCard={ExamCard} />
                        </section>
                    )}

                    {/* History */}
                    {pastExams.length > 0 && (
                        <section className="space-y-6 opacity-90">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <History className="w-6 h-6 text-slate-400" />
                                <h2 className="text-2xl font-bold text-slate-900">History <span className="text-slate-400 font-normal text-lg ml-2">Completed & Missed</span></h2>
                            </div>
                            <PaginatedExamList exams={pastExams} status="past" ExamCard={ExamCard} />
                        </section>
                    )}
                </div>
            )}
        </PageTransition>
    )
}

function PaginatedExamList({ exams, status, ExamCard }: { exams: any[], status: 'available' | 'upcoming' | 'past', ExamCard: any }) {
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 9

    // Reset page if filtered list changes significantly
    useEffect(() => {
        setCurrentPage(1)
    }, [exams.length])

    if (exams.length === 0) {
        return null // Sections are completely hidden if empty by the parent now, but keeping this as a safety fallback.
    }

    const totalPages = Math.ceil(exams.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentExams = exams.slice(startIndex, startIndex + itemsPerPage)

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
            // Optional: scroll to top of list
            // window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {currentExams.map(e => <ExamCard key={e._id} exam={e} status={status} />)}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
