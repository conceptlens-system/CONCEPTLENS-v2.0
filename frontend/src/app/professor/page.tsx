"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Clock, Plus, AlertCircle, BarChart3, Mail, Bell, CheckCircle2, ChevronRight, TrendingUp, Calendar, Zap } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchExams, fetchClasses, fetchMisconceptions, fetchNotifications, fetchAssessmentSummaries } from "@/lib/api"
import { format } from "date-fns"
import { PageTransition } from "@/components/PageTransition"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfessorDashboard() {
    const { data: session, status } = useSession()
    const [stats, setStats] = useState({
        activeClasses: 0,
        upcomingExams: 0,
        nextExam: null as any,
        pendingMisconceptions: 0
    })
    const [notifications, setNotifications] = useState<any[]>([])
    const [performanceData, setPerformanceData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === "loading") return;

        const loadStats = async () => {
            try {
                const token = (session?.user as any)?.accessToken;
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Fetch core data
                const [exams, classes, pending, notifs, assessments] = await Promise.all([
                    fetchExams(token),
                    fetchClasses(token),
                    fetchMisconceptions("pending"),
                    fetchNotifications(token),
                    fetchAssessmentSummaries(token)
                ])

                const upcoming = exams.filter((e: any) => new Date(e.schedule_start) > new Date())

                // Process chart data (Average score per assessment)
                const chartData = assessments
                    .slice(0, 7)
                    .map((a: any) => ({
                        name: a.title.length > 15 ? a.title.substring(0, 15) + '...' : a.title,
                        score: a.avg_score || 0
                    }))

                setStats({
                    activeClasses: classes.length,
                    upcomingExams: upcoming.length,
                    nextExam: upcoming.sort((a: any, b: any) => new Date(a.schedule_start).getTime() - new Date(b.schedule_start).getTime())[0],
                    pendingMisconceptions: pending.length
                })

                // Filter out notifications older than 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const validNotifications = notifs.filter((n: any) => {
                    const createdAt = new Date(n.created_at);
                    return createdAt >= sevenDaysAgo;
                });

                setNotifications(validNotifications.slice(0, 3))
                setPerformanceData(chartData)

            } catch (e) {
                console.error("Failed to load dashboard stats", e)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [session, status])

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    return (
        <PageTransition className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        Welcome back, {session?.user?.name}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                        Here's what's happening in your classrooms today.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white/50 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </p>
                </div>
            </header>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
                <motion.div variants={item}>
                    {loading ? (
                        <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-[60px]" />
                                <Skeleton className="h-3 w-[140px]" />
                            </div>
                        </div>
                    ) : (
                        <Link href="/professor/classes" className="block h-full">
                            <StatCard
                                title="Active Classes"
                                icon={Users}
                                value={stats.activeClasses}
                                subtext="Currently teaching"
                                color="text-blue-500"
                                gradient="from-blue-500/10 to-blue-500/5"
                            />
                        </Link>
                    )}
                </motion.div>
                <motion.div variants={item}>
                    {loading ? (
                        <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm h-full flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-[60px]" />
                                <Skeleton className="h-3 w-[180px]" />
                            </div>
                        </div>
                    ) : (
                        <Link href="/professor/exams" className="block h-full">
                            <Card className="hover:shadow-lg transition-all duration-300 border-white/20 bg-white/60 dark:bg-black/40 backdrop-blur-xl group overflow-hidden relative h-full">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Upcoming Exams</CardTitle>
                                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                        <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    {stats.upcomingExams > 0 ? (
                                        <>
                                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.upcomingExams}</div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                                                <span className="font-semibold text-purple-600 dark:text-purple-400">Next:</span>
                                                {stats.nextExam ? format(new Date(stats.nextExam.schedule_start), 'MMM d, h:mm a') : '-'}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">No exams scheduled</div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </motion.div>
                <motion.div variants={item}>
                    {loading ? (
                        <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-[140px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-[60px]" />
                                <Skeleton className="h-3 w-[160px]" />
                            </div>
                        </div>
                    ) : (
                        <Link href="/professor/misconceptions?status=pending" className="block h-full">
                            <StatCard
                                title="Pending Validations"
                                icon={AlertCircle}
                                value={stats.pendingMisconceptions}
                                subtext="Misconceptions to review"
                                color="text-amber-500"
                                gradient="from-amber-500/10 to-amber-500/5"
                            />
                        </Link>
                    )}
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Quick Actions & Chart */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Quick Actions */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-indigo-500" /> Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DashboardActionCard
                                href="/professor/exams/create"
                                title="Create Exam"
                                description="Set up a new assessment"
                                icon={Plus}
                                color="text-white"
                                bgClassName="bg-gradient-to-br from-indigo-500 to-purple-600"
                            />
                            <DashboardActionCard
                                href="/professor/reports"
                                title="View Reports"
                                description="Analyze student performance"
                                icon={BarChart3}
                                color="text-indigo-600"
                                bgClassName="bg-white hover:bg-slate-50 border border-slate-200"
                            />
                            <DashboardActionCard
                                href="/professor/classes"
                                title="Manage Classes"
                                description="View students and rosters"
                                icon={Users}
                                color="text-blue-600"
                                bgClassName="bg-white hover:bg-slate-50 border border-slate-200"
                            />
                            <DashboardActionCard
                                href="/professor/inbox"
                                title="Check Inbox"
                                description="Review notifications"
                                icon={Mail}
                                color="text-amber-600"
                                bgClassName="bg-white hover:bg-slate-50 border border-slate-200"
                            />
                        </div>
                    </section>

                    {/* Performance Chart */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" /> Performance Trends
                        </h2>
                        <Card className="border-none shadow-xl bg-white/70 dark:bg-black/40 backdrop-blur-xl">
                            <CardContent className="pt-6 h-[350px]">
                                {loading ? (
                                    <Skeleton className="w-full h-full rounded-lg" />
                                ) : performanceData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData}>
                                            <defs>
                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                    backdropFilter: 'blur(8px)'
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#4f46e5"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorScore)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                                        <BarChart3 className="h-10 w-10 opacity-20" />
                                        <p>No assessment data available yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {/* Right Column: Recent Activity */}
                <div className="lg:col-span-1">
                    <section className="h-full">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-amber-500" /> Notifications
                        </h2>
                        <Card className="border-none shadow-xl bg-white/70 dark:bg-black/40 backdrop-blur-xl flex flex-col">
                            <CardContent className="p-0 flex-1 flex flex-col">
                                {loading ? (
                                    <div className="p-4 space-y-4 flex-1">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex gap-4 items-center">
                                                <Skeleton className="h-2 w-2 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-3 w-1/4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : notifications.length > 0 ? (
                                    <div className="flex flex-col">
                                        <div className="divide-y divide-slate-100 dark:divide-white/10 flex-1">
                                            {notifications.slice(0, 3).map((n, i) => (
                                                <div key={i} className="p-4 hover:bg-white/50 dark:hover:bg-white/5 transition-colors flex gap-4 items-start group cursor-pointer" onClick={() => window.location.href = '/professor/inbox'}>
                                                    <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0 ring-4 ring-indigo-100 dark:ring-indigo-900/30" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                            {n.message}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            {n.created_at ? format(new Date(n.created_at), 'MMM d, h:mm a') : 'Just now'}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-4 border-t border-slate-100 dark:border-white/10 mt-auto">
                                            <Link href="/professor/inbox" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center w-full group py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg transition-colors">
                                                <span>View all notifications</span>
                                                <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 flex flex-col justify-center items-center py-12">
                                        <div className="h-16 w-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Bell className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="font-medium text-slate-600 dark:text-slate-300">No new notifications</p>
                                        <p className="text-xs mt-1 text-slate-400">You're all caught up!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </PageTransition>
    )
}

function StatCard({ title, icon: Icon, value, subtext, color, gradient }: any) {
    return (
        <Card className="hover:shadow-lg transition-all duration-300 border-white/20 bg-white/60 dark:bg-black/40 backdrop-blur-xl group overflow-hidden relative h-full">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 opacity-50`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</CardTitle>
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-sm`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtext}</p>
            </CardContent>
        </Card>
    )
}

function DashboardActionCard({ href, title, description, icon: Icon, color, bgClassName }: any) {
    return (
        <Link href={href} className="group h-full">
            <Card className={`h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden ${bgClassName}`}>
                <CardContent className="p-6 flex items-start gap-4 h-full">
                    <div className={`p-3 rounded-xl ${color === 'text-white' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'} backdrop-blur-sm group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    <div className="flex-1">
                        <h3 className={`font-semibold text-lg ${color === 'text-white' ? 'text-white' : 'text-slate-900 dark:text-white'} mb-1`}>{title}</h3>
                        <p className={`text-sm ${color === 'text-white' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>{description}</p>
                    </div>
                    {color !== 'text-white' && (
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors self-center" />
                    )}
                </CardContent>
            </Card>
        </Link>
    )
}
