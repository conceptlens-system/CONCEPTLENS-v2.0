"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MisconceptionChart } from "@/components/MisconceptionChart"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Activity, AlertCircle, BookOpen, CheckCircle2, Search } from "lucide-react"
import { UploadAssessmentDialog } from "@/components/UploadAssessmentDialog"
import { useEffect, useState } from "react"
import { fetchStats, fetchMisconceptions, fetchProfessorRequests, approveProfessorRequest, fetchInstitutes } from "@/lib/api"
import { toast } from "sonner"

export default function AdminDashboard() {
    const [stats, setStats] = useState({ pending: 0, valid: 0, analyzed: 0 })
    const [pendingMisconceptions, setPendingMisconceptions] = useState<any[]>([])
    const [profRequests, setProfRequests] = useState<any[]>([])
    const [institutes, setInstitutes] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const s = await fetchStats()
                setStats({
                    pending: s.pending_misconceptions,
                    valid: s.valid_misconceptions,
                    analyzed: s.processed_responses
                })

                const m = await fetchMisconceptions("pending")
                setPendingMisconceptions(m)

                const p = await fetchProfessorRequests()
                setProfRequests(p)

                const instData = await fetchInstitutes()
                const instMap: Record<string, string> = {}
                instData.forEach((i: any) => {
                    instMap[i._id] = i.name
                })
                setInstitutes(instMap)

            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleApproveProf = async (id: string) => {
        try {
            await approveProfessorRequest(id)
            toast.success("Professor Approved")
            setProfRequests(profRequests.filter(r => r._id !== id))
        } catch (e) {
            toast.error("Failed to approve")
        }
    }

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                    <p className="text-slate-500 mt-1">Review recent analysis and validate student misconceptions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">Export Report</Button>
                </div>
            </header>

            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
                        <p className="text-xs text-slate-500 mt-1">Requires teacher attention</p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Validated Insights</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.valid}</div>
                        <p className="text-xs text-slate-500 mt-1">Confirmed misconceptions</p>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-slate-200 col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Analysis Coverage</CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.analyzed} Students</div>
                        <p className="text-xs text-slate-500 mt-1">Processed across assessments</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="pending" className="space-y-4">
                <div className="flex justify-between items-center">
                    <TabsList className="bg-slate-100 p-1">
                        <TabsTrigger value="pending">Pending Validation ({stats.pending})</TabsTrigger>
                        <TabsTrigger value="onboarding">Access Requests ({profRequests.length})</TabsTrigger>
                        <TabsTrigger value="messages">Messages</TabsTrigger>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-1">
                        <Card className="bg-white shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle>Misconception Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <MisconceptionChart />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    <Card className="bg-white shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle>Unvalidated Insights</CardTitle>
                            <CardDescription>Review and validate AI-detected misconception clusters.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {pendingMisconceptions.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No pending insights. Upload assessments to generate analysis.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Detected Concept</TableHead>
                                            <TableHead>Confidence</TableHead>
                                            <TableHead>Student Count</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingMisconceptions.map((m) => (
                                            <TableRow key={m._id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900">{m.cluster_label}</span>
                                                        <span className="text-xs text-slate-500">{m.assessment_id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{(m.confidence_score * 100).toFixed(0)}%</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{m.student_count}</span> students
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="default" asChild>
                                                        <Link href={`/misconceptions/${m._id}`}>Review</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="onboarding" className="space-y-4">
                    <Card className="bg-white shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle>Professor Access Requests</CardTitle>
                            <CardDescription>Verify and approve new professor accounts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profRequests.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No pending access requests.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Institution</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {profRequests.map((r) => (
                                            <TableRow key={r._id}>
                                                <TableCell className="font-medium">{r.full_name}</TableCell>
                                                <TableCell>{r.email}</TableCell>
                                                <TableCell>{institutes[r.institution_id] || "Unknown Institute"}</TableCell>
                                                <TableCell>{r.subject_expertise}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handleApproveProf(r._id)}>Approve</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4">
                    <ContactMessagesList />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function ContactMessagesList() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("http://localhost:8000/api/v1/contact/", {
            headers: {
                // In a real app we'd pass the token here, but for now assuming cookie session handled by browser/proxy or simplified
                // Note: NextAuth runs on server side, client fetch might need explicit token if backend requires it in header
                // For now, let's rely on standard fetch. If backend needs specific 'Authorization' header, we'd get it from session.
                // NOTE: 'useSession' would be needed here to get the token if endpoints are protected. 
            }
        })
            .then(res => {
                if (res.ok) return res.json()
                // throw new Error("Failed to fetch")
                return [] // Fallback for now if 403 or error
            })
            .then(data => setMessages(Array.isArray(data) ? data : []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div>Loading messages...</div>

    return (
        <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle>Contact Messages</CardTitle>
                <CardDescription>Messages from users and visitors.</CardDescription>
            </CardHeader>
            <CardContent>
                {messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No messages found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Message</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {messages.map((m) => (
                                <TableRow key={m._id}>
                                    <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                                        {new Date(m.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{m.name}</TableCell>
                                    <TableCell>{m.email}</TableCell>
                                    <TableCell className="max-w-md truncate" title={m.message}>{m.message}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
