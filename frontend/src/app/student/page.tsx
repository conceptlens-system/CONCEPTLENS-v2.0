"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, AlertCircle, ChevronRight, CheckCircle2, PlayCircle, BookOpen, Settings, Bell } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"
import { BrainCircuit, Trophy, Target } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchExams, fetchClasses } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StudentAnalytics } from "./StudentAnalytics"

export default function StudentHomePage() {
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
                const [examsData] = await Promise.all([
                    fetchExams(token),
                ])
                setExams(examsData)
            } catch (e) {
                toast.error("Failed to load dashboard data")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session, status])

    const now = new Date()

    // Categorize exams
    const actionRequired = exams.filter(e => {
        if (e.attempted) return false
        if (!e.schedule_start) return false
        const start = new Date(e.schedule_start)
        const end = e.exam_access_end_time ? new Date(e.exam_access_end_time) : null
        return start <= now && (!end || end > now)
    }).sort((a, b) => new Date(a.schedule_start).getTime() - new Date(b.schedule_start).getTime())

    const upcoming = exams.filter(e => {
        if (e.attempted) return false
        if (!e.schedule_start) return false
        return new Date(e.schedule_start) > now
    }).sort((a, b) => new Date(a.schedule_start).getTime() - new Date(b.schedule_start).getTime())

    return (
        <PageTransition className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Student Command Center</h1>
                    <p className="text-slate-500 mt-2">Welcome back, {session?.user?.name}! Here's your learning overview.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mt-4">
                {/* Left (1/3): Quick Links */}
                <div className="md:col-span-1">
                    <Card className="border-indigo-100 shadow-sm bg-gradient-to-b from-white to-indigo-50/30 h-full">
                        <CardHeader className="pb-3 border-b border-indigo-50">
                            <CardTitle className="text-md font-bold text-slate-800 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-500" /> Quick Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex flex-col">
                                <Link href="/student/exams" className="px-4 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-md group-hover:bg-indigo-500 transition-colors">
                                            <BookOpen className="w-4 h-4 text-indigo-600 group-hover:text-white" />
                                        </div>
                                        <span className="font-medium text-slate-700">All Assessments</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                                </Link>
                                <Link href="/student/classes" className="px-4 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-100 p-2 rounded-md group-hover:bg-emerald-500 transition-colors">
                                            <BookOpen className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                                        </div>
                                        <span className="font-medium text-slate-700">My Classes</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                                </Link>
                                <Link href="/student/practice" className="px-4 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-fuchsia-100 p-2 rounded-md group-hover:bg-fuchsia-500 transition-colors">
                                            <BrainCircuit className="w-4 h-4 text-fuchsia-600 group-hover:text-white" />
                                        </div>
                                        <span className="font-medium text-slate-700">Challenge Area</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-fuchsia-500" />
                                </Link>
                                <Link href="/student/leaderboard" className="px-4 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-amber-100 p-2 rounded-md group-hover:bg-amber-500 transition-colors">
                                            <Trophy className="w-4 h-4 text-amber-600 group-hover:text-white" />
                                        </div>
                                        <span className="font-medium text-slate-700">Leaderboard</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                                </Link>
                                <Link href="/student/career" className="px-4 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-sky-100 p-2 rounded-md group-hover:bg-sky-500 transition-colors">
                                            <Target className="w-4 h-4 text-sky-600 group-hover:text-white" />
                                        </div>
                                        <span className="font-medium text-slate-700">Career Map</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500" />
                                </Link>
                                <Link href="/student/inbox" className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-rose-100 p-2 rounded-md group-hover:bg-rose-500 transition-colors">
                                            <Bell className="w-4 h-4 text-rose-600 group-hover:text-white" />
                                        </div>
                                        <span className="font-medium text-slate-700">Inbox & Notifications</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right (2/3): Action Required & Upcoming Schedule */}
                <div className="md:col-span-2 space-y-6">
                    {/* Action Required Feed */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-rose-500" /> Action Required
                            </h2>
                            <Link href="/student/exams" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                                View all <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {loading ? (
                            <Skeleton className="h-[120px] w-full rounded-xl" />
                        ) : actionRequired.length === 0 ? (
                            <Card className="border-dashed bg-slate-50/50">
                                <CardContent className="flex flex-col items-center justify-center py-8 text-slate-500">
                                    <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-400" />
                                    <p className="font-medium">You're all caught up!</p>
                                    <p className="text-sm text-slate-400">No exams pending right now.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {actionRequired.slice(0, 3).map((exam) => (
                                    <Card key={exam._id} className="border-rose-100 hover:border-rose-300 transition-colors shadow-sm relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-5">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                    {exam.title}
                                                    <Badge className="bg-rose-500 hover:bg-rose-600 border-0 flex items-center gap-1 shadow-sm">
                                                        <span className="relative flex h-2 w-2 mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                        </span>
                                                        Available Now
                                                    </Badge>
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mt-2">
                                                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{exam.duration_minutes} mins</span>
                                                    </div>
                                                    {exam.exam_access_end_time && (
                                                        <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                                                            <AlertCircle className="h-3.5 w-3.5" />
                                                            <span>Closes {format(new Date(exam.exam_access_end_time), 'MMM d, p')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button asChild className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all group-hover:shadow group-hover:-translate-y-0.5">
                                                <Link href={`/student/exams`}>Take Exam <PlayCircle className="ml-2 h-4 w-4" /></Link>
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Schedule */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Schedule
                        </h2>

                        {loading ? (
                            <Skeleton className="h-[120px] w-full rounded-xl" />
                        ) : upcoming.length === 0 ? (
                            <Card className="border-dashed bg-slate-50/50">
                                <CardContent className="flex text-center flex-col items-center justify-center py-8 text-slate-500">
                                    <Calendar className="h-10 w-10 mb-3 text-slate-300" />
                                    <p className="text-sm">No upcoming exams scheduled.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {upcoming.slice(0, 4).map((exam) => (
                                    <Card key={exam._id} className="hover:border-slate-300 transition-colors bg-white">
                                        <CardHeader className="pb-2 pt-4">
                                            <CardTitle className="text-md line-clamp-1">{exam.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <div className="flex flex-col gap-2 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                                                    <span className="truncate">{format(new Date(exam.schedule_start), 'MMM d, yyyy - p')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                                                    <span>{exam.duration_minutes} Minutes</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Insights & Analytics */}
            <div className="mt-8">
                <StudentAnalytics />
            </div>
        </PageTransition>
    )
}
