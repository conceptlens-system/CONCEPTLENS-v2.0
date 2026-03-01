"use client"

import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchAdminMetrics, fetchAiUsageMetrics } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Activity, Users, TrendingUp, Cpu, Award } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function AdminAnalyticsPage() {
    const { data: session } = useSession()
    const [metrics, setMetrics] = useState<any>(null)
    const [aiMetrics, setAiMetrics] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function loadMetrics() {
            if (!session?.user) return
            try {
                const token = (session.user as any).accessToken
                // Fetch both general metrics and AI usage metrics in parallel
                const [generalData, aiData] = await Promise.all([
                    fetchAdminMetrics(token),
                    fetchAiUsageMetrics(token, 30) // fetch last 30 days
                ])
                setMetrics(generalData)
                setAiMetrics(aiData)
            } catch (err: any) {
                console.error(err)
                setError(err.message || "Failed to load metrics")
            } finally {
                setLoading(false)
            }
        }
        loadMetrics()
    }, [session])

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageTransition>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="h-8 w-8 text-indigo-600" />
                        Platform Analytics
                    </h1>
                    <p className="mt-2 text-slate-500">Historical performance, adoption tracking, and AI token usage.</p>
                </div>

                {loading ? (
                    <div className="h-[400px] flex items-center justify-center text-slate-400 animate-pulse">
                        Loading analytics engine...
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                ) : (
                    <div className="space-y-6 mt-8">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-medium text-indigo-900">Total AI Generations (30d)</CardTitle>
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <Cpu className="h-4 w-4 text-indigo-600" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-indigo-700">{aiMetrics?.total_questions || 0}</div>
                                    <p className="text-xs text-indigo-500 mt-1">Questions synthesized by Gemini</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-slate-200 shadow-sm">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-medium text-slate-600">Active AI Users</CardTitle>
                                    <Activity className="h-4 w-4 text-slate-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-slate-900">{aiMetrics?.top_users?.length || 0}</div>
                                    <p className="text-xs text-slate-500 mt-1">Professors using AI tools</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-slate-200 shadow-sm">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-medium text-slate-600">Total System Users</CardTitle>
                                    <Users className="h-4 w-4 text-slate-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {(metrics?.adoption_rates?.[metrics.adoption_rates.length - 1]?.Users || 0)}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Total registered accounts</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Adoption Trends (Area Chart) */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-500" />
                                        Platform Adoption
                                    </CardTitle>
                                    <CardDescription>User & Institution growth over the last 6 months.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={metrics?.adoption_rates}>
                                                <defs>
                                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorInst" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                <Area type="monotone" dataKey="Users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                                <Area type="monotone" dataKey="Institutions" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorInst)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Usage Trends (Bar Chart) */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                                        System Utilization
                                    </CardTitle>
                                    <CardDescription>Exams generated and active classes over time.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={metrics?.platform_usage}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    cursor={{ fill: '#f1f5f9' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar dataKey="Exams Created" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                                                <Bar dataKey="Active Classes" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* AI Usage (Area Chart) */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Cpu className="h-5 w-5 text-purple-500" />
                                        AI Token Utilization
                                    </CardTitle>
                                    <CardDescription>Questions generated via Gemini API (Last 30 Days).</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={aiMetrics?.daily_usage || []}>
                                                <defs>
                                                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10}
                                                    tickFormatter={(val) => {
                                                        const d = new Date(val);
                                                        return `${d.getMonth() + 1}/${d.getDate()}`;
                                                    }}
                                                />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                />
                                                <Area type="monotone" dataKey="questions" name="Questions Gen." stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAI)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Users Leaderboard */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Award className="h-5 w-5 text-amber-500" />
                                        Top AI Power Users
                                    </CardTitle>
                                    <CardDescription>Professors consuming the most API resources.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border border-slate-100 overflow-hidden mt-4">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Last Active</TableHead>
                                                    <TableHead className="text-right">Generations (Requests)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {aiMetrics?.top_users?.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">No AI usage recorded yet.</TableCell>
                                                    </TableRow>
                                                ) : aiMetrics?.top_users?.map((user: any, i: number) => (
                                                    <TableRow key={user._id}>
                                                        <TableCell>
                                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                                {i < 3 && <Award className={`h-4 w-4 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`} />}
                                                                {user.user_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">{user.user_email}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm text-slate-700">
                                                                {user.last_active ? new Date(user.last_active).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {user.last_active ? new Date(user.last_active).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="font-bold text-slate-700">{user.total_questions} <span className="text-xs font-normal text-slate-400">Qs</span></div>
                                                            <div className="text-xs text-slate-400">{user.total_requests} runs</div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                )}
            </PageTransition>
        </div>
    )
}
