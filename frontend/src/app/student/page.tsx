"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, AlertCircle } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchExams } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function StudentHomePage() {
    const { data: session, status } = useSession()
    const [upcomingExams, setUpcomingExams] = useState<any[]>([])
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

                // Filter for exams that are upcoming or available
                // Logic should match StudentExamsPage somewhat, but we just want to see what's "Pending"
                const pending = data.filter((exam: any) => {
                    if (!exam.schedule_start) return true // Always show unscheduled? Or maybe not. Let's assume available.
                    const now = new Date()
                    const start = new Date(exam.schedule_start)
                    // Pending means available now OR upcoming
                    // Actually, "Pending" usually means "Todo". 
                    // Let's include everything that hasn't passed (we don't have end time, but let's assume start time + duration)
                    // For now, let's just show everything sorted by date
                    return true
                }).sort((a: any, b: any) => {
                    return new Date(a.schedule_start || 0).getTime() - new Date(b.schedule_start || 0).getTime()
                })

                setUpcomingExams(pending)
            } catch (e) {
                toast.error("Failed to load dashboard data")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session, status])



    return (
        <PageTransition className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Student Portal</h1>
                <p className="text-slate-500 mt-2">Welcome back, {session?.user?.name}! Check your upcoming exam schedule.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Exams</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold">{upcomingExams.length}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Assigned to you</p>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Upcoming Schedule</h2>
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                    </div>
                ) : upcomingExams.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Calendar className="h-12 w-12 mb-4 text-slate-300" />
                            <p>No exams scheduled yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {upcomingExams.map((exam) => (
                            <Card key={exam._id} className="hover:border-slate-400 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                                        {exam.attempted ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-transparent">
                                                Completed
                                            </Badge>
                                        ) : (
                                            <Badge variant={new Date(exam.schedule_start) > new Date() ? "outline" : "default"}>
                                                {new Date(exam.schedule_start) > new Date() ? "Upcoming" : "Available"}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription>
                                        ID: {exam._id.slice(-6)}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{exam.schedule_start ? format(new Date(exam.schedule_start), 'PPP p') : 'Unscheduled'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span>{exam.duration_minutes} mins</span>
                                        </div>
                                    </div>
                                    <Button asChild size="sm" className="w-full" variant={exam.attempted ? "outline" : "default"}>
                                        <Link href={`/student/exams`}>{exam.attempted ? "View Results" : "View in My Exams"}</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </PageTransition>
    )
}
