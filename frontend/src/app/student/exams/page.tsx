"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowRight, CheckCircle2, Clock as ClockIcon, AlertCircle } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchExams } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
                    <Button disabled variant="ghost" className="w-full">
                        {exam.attempted ? "Exam Completed" : "Exam Closed"}
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </CardContent>
        </Card>
    )



    return (
        <PageTransition className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Exams</h1>
                <p className="text-slate-500 mt-2">View and take your assigned assessments.</p>
            </div>

            <Tabs defaultValue="available" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="available">Available ({availableExams.length})</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming ({upcomingExams.length})</TabsTrigger>
                    <TabsTrigger value="past">History ({pastExams.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-4">
                    <PaginatedExamList exams={availableExams} status="available" ExamCard={ExamCard} loading={loading} />
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4">
                    <PaginatedExamList exams={upcomingExams} status="upcoming" ExamCard={ExamCard} loading={loading} />
                </TabsContent>

                <TabsContent value="past" className="space-y-4">
                    <PaginatedExamList exams={pastExams} status="past" ExamCard={ExamCard} loading={loading} />
                </TabsContent>
            </Tabs>
        </PageTransition>
    )
}

function PaginatedExamList({ exams, status, ExamCard, loading }: { exams: any[], status: 'available' | 'upcoming' | 'past', ExamCard: any, loading: boolean }) {
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 9

    // Reset page if filtered list changes significantly (optional, but good practice if tabs switch)
    useEffect(() => {
        setCurrentPage(1)
    }, [status]) // Reset when switching tabs usually happens by unmounting/mounting content, but just in case.

    if (!loading && exams.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed text-sm">
                {status === 'available' && "No exams are currently available to take."}
                {status === 'upcoming' && "No upcoming exams scheduled."}
                {status === 'past' && "No past exams found."}
            </div>
        )
    }

    const totalPages = Math.ceil(exams.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentExams = exams.slice(startIndex, startIndex + itemsPerPage)

    const isLoadingState = loading

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
                {isLoadingState ? (
                    Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-[200px] w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                    ))
                ) : (
                    currentExams.map(e => <ExamCard key={e._id} exam={e} status={status} />)
                )}
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
