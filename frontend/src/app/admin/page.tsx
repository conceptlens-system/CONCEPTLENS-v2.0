"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Activity, CheckCircle2, Users, Building, ShieldCheck, Mail, Server, Database, Trash2, Settings, BarChart3, Megaphone, ClipboardList, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { fetchUsers, fetchInstitutes, fetchProfessorRequests, approveProfessorRequest, fetchGlobalAnnouncements, createGlobalAnnouncement, toggleGlobalAnnouncement, deleteGlobalAnnouncement, fetchAuditLogs } from "@/lib/api"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminDashboard() {
    const { data: session } = useSession()
    const [stats, setStats] = useState({ users: 0, institutions: 0, requests: 0 })
    const [profRequests, setProfRequests] = useState<any[]>([])
    const [institutes, setInstitutes] = useState<Record<string, string>>({})
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("overview")

    useEffect(() => {
        async function load() {
            try {
                // Fetch data for IT Admin metrics
                const [usersData, instData, requestsData] = await Promise.all([
                    fetchUsers().catch(() => []),
                    fetchInstitutes().catch(() => []),
                    fetchProfessorRequests().catch(() => [])
                ])

                setStats({
                    users: Array.isArray(usersData) ? usersData.length : 0,
                    institutions: Array.isArray(instData) ? instData.length : 0,
                    requests: Array.isArray(requestsData) ? requestsData.length : 0
                })

                setProfRequests(Array.isArray(requestsData) ? requestsData : [])

                const instMap: Record<string, string> = {}
                if (Array.isArray(instData)) {
                    instData.forEach((i: any) => {
                        instMap[i._id] = i.name
                    })
                }
                setInstitutes(instMap)

                // Fetch Messages
                const token = session?.user ? (session.user as any).accessToken : null;
                if (token) {
                    const res = await fetch("http://localhost:8000/api/v1/contact/", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setMessages(Array.isArray(data) ? data : [])
                    }
                }

            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session])

    const unreadCount = messages.filter(m => m.status === "new").length;

    const handleApproveProf = async (id: string) => {
        try {
            await approveProfessorRequest(id)
            toast.success("Professor Approved")
            setProfRequests(profRequests.filter(r => r._id !== id))
            setStats(prev => ({ ...prev, requests: prev.requests - 1, users: prev.users + 1 }))
        } catch (e) {
            toast.error("Failed to approve")
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">IT Admin Overview</h1>
                    <p className="text-slate-500 mt-1">Manage system infrastructure, user roles, and access requests.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="shadow-sm">System Logs</Button>
                </div>
            </header>

            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/admin/users" className="block outline-none hover:ring-2 hover:ring-indigo-500 rounded-xl transition-all">
                    <Card className="bg-white shadow-sm border-slate-200 h-full hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Total Active Users</CardTitle>
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">{stats.users}</div>
                            <p className="text-xs text-slate-500 mt-1">Registered across all roles</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/institutions" className="block outline-none hover:ring-2 hover:ring-indigo-500 rounded-xl transition-all">
                    <Card className="bg-white shadow-sm border-slate-200 h-full hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Registered Institutions</CardTitle>
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Building className="h-4 w-4 text-indigo-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">{stats.institutions}</div>
                            <p className="text-xs text-slate-500 mt-1">Connected universities & colleges</p>
                        </CardContent>
                    </Card>
                </Link>

                <div onClick={() => setActiveTab("onboarding")} className="block cursor-pointer outline-none hover:ring-2 hover:ring-indigo-500 rounded-xl transition-all">
                    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm border-transparent text-white h-full hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-300">Pending Requests</CardTitle>
                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                                <ShieldCheck className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{stats.requests}</div>
                            <p className="text-xs text-slate-300 mt-1">Accounts awaiting approval</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Layout containing Sidebar and Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col md:flex-row gap-8 mt-8">

                {/* Vertical Sidebar */}
                <div className="w-full md:w-64 shrink-0">
                    <TabsList className="flex flex-col h-auto bg-transparent items-stretch space-y-1 p-0">
                        <TabsTrigger
                            value="overview"
                            className="justify-start px-4 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium text-slate-600 hover:text-slate-900 w-full"
                        >
                            System Health
                        </TabsTrigger>
                        <TabsTrigger
                            value="onboarding"
                            className="justify-start px-4 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium text-slate-600 hover:text-slate-900 w-full flex justify-between items-center"
                        >
                            <span>Account Requests</span>
                            {stats.requests > 0 && (
                                <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">
                                    {stats.requests}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="messages"
                            className="justify-start px-4 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium text-slate-600 hover:text-slate-900 w-full flex justify-between items-center"
                        >
                            <span>Support Messages</span>
                            {unreadCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white animate-in zoom-in">
                                    {unreadCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="announcements"
                            className="justify-start px-4 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium text-slate-600 hover:text-slate-900 w-full"
                        >
                            Announcements
                        </TabsTrigger>
                        <TabsTrigger
                            value="audit"
                            className="justify-start px-4 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium text-slate-600 hover:text-slate-900 w-full"
                        >
                            Recent Activity
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">

                    <TabsContent value="overview" className="space-y-4 animate-in fade-in duration-300">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="bg-white shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Server className="h-5 w-5 text-emerald-500" />
                                        Server Status
                                    </CardTitle>
                                    <CardDescription>All core systems and AI services are fully operational.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-sm font-medium text-slate-600">Database (MongoDB)</span>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Online</Badge>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-sm font-medium text-slate-600">API Gateway (FastAPI)</span>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Online</Badge>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-sm font-medium text-slate-600">AI Inference Engine</span>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Online</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-600">Storage Service</span>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Online</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-blue-500" />
                                        Quick Links
                                    </CardTitle>
                                    <CardDescription>Direct access to IT management modules.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2" asChild>
                                            <Link href="/admin/users">
                                                <Users className="h-6 w-6 text-slate-600" />
                                                <span>Manage Users</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2" asChild>
                                            <Link href="/admin/institutions">
                                                <Building className="h-6 w-6 text-slate-600" />
                                                <span>Institutions</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors" asChild>
                                            <Link href="/admin/settings">
                                                <Settings className="h-6 w-6 text-slate-600" />
                                                <span>Global Settings</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors" asChild>
                                            <Link href="/admin/analytics">
                                                <BarChart3 className="h-6 w-6 text-slate-600" />
                                                <span>System Analytics</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors" asChild>
                                            <Link href="/admin/security">
                                                <ShieldCheck className="h-6 w-6 text-slate-600" />
                                                <span>Security Config</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors" asChild>
                                            <Link href="/admin/backups">
                                                <Database className="h-6 w-6 text-slate-600" />
                                                <span>Backup & Restore</span>
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="onboarding" className="space-y-4 animate-in fade-in duration-300">
                        <Card className="bg-white shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle>Professor Access Requests</CardTitle>
                                <CardDescription>Verify and approve new professor accounts.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {profRequests.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                                        <p className="font-medium text-slate-900">All caught up!</p>
                                        <p className="text-sm">No pending account requests at the moment.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border border-slate-100 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
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
                                                    <TableRow key={r._id} className="hover:bg-slate-50/50">
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                                    {r.full_name?.[0] || '?'}
                                                                </div>
                                                                {r.full_name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-slate-600">{r.email}</TableCell>
                                                        <TableCell className="text-slate-600">
                                                            <div className="flex items-center gap-1.5">
                                                                <Building className="h-3.5 w-3.5 text-slate-400" />
                                                                {institutes[r.institution_id] || "Unknown Institute"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                                {r.subject_expertise}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleApproveProf(r._id)}>
                                                                Approve Request
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="messages" className="space-y-4 animate-in fade-in duration-300">
                        <ContactMessagesList
                            messages={messages}
                            setMessages={setMessages}
                            token={session?.user ? (session.user as any).accessToken : ""}
                        />
                    </TabsContent>

                    <TabsContent value="announcements" className="space-y-4 animate-in fade-in duration-300">
                        <AnnouncementsManager token={session?.user ? (session.user as any).accessToken : ""} />
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4 animate-in fade-in duration-300">
                        <AuditLogsViewer token={session?.user ? (session.user as any).accessToken : ""} />
                    </TabsContent>
                </div> {/* End Content Area */}
            </Tabs>
        </div>
    )
}

function AnnouncementsManager({ token }: { token: string }) {
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newTitle, setNewTitle] = useState("")
    const [newMessage, setNewMessage] = useState("")
    const [newType, setNewType] = useState("info")

    const loadAnnouncements = async () => {
        try {
            if (!token) return;
            const data = await fetchGlobalAnnouncements(token, false)
            setAnnouncements(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAnnouncements()
    }, [token])

    const handleCreate = async () => {
        if (!newTitle.trim() || !newMessage.trim()) return toast.error("Please fill all fields")
        try {
            await createGlobalAnnouncement(token, { title: newTitle, message: newMessage, type: newType, active: true })
            toast.success("Announcement published")
            setNewTitle("")
            setNewMessage("")
            setNewType("info")
            loadAnnouncements()
        } catch (e) {
            toast.error("Failed to create announcement")
            console.error(e)
        }
    }

    const handleToggle = async (id: string, active: boolean) => {
        try {
            await toggleGlobalAnnouncement(token, id, active)
            setAnnouncements(announcements.map(a => a._id === id ? { ...a, active } : a))
            toast.success("Status updated")
        } catch (e) {
            toast.error("Failed to update status")
            console.error(e)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteGlobalAnnouncement(token, id)
            setAnnouncements(announcements.filter(a => a._id !== id))
            toast.success("Announcement deleted")
        } catch (e) {
            toast.error("Failed to delete announcement")
            console.error(e)
        }
    }

    return (
        <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle>Global Announcements</CardTitle>
                <CardDescription>Manage alerts broadcasted to all professors and students.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2"><Plus className="h-4 w-4" /> Create New Announcement</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input placeholder="Announcement Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="col-span-2 bg-white" />
                        <Select value={newType} onValueChange={setNewType}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info (Blue)</SelectItem>
                                <SelectItem value="warning">Warning (Amber)</SelectItem>
                                <SelectItem value="critical">Critical (Red)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Textarea placeholder="Message body..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="min-h-[80px] bg-white" />
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">Publish Announcement</Button>
                </div>

                <div className="rounded-md border border-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px]">Active</TableHead>
                                <TableHead className="w-[100px]">Type</TableHead>
                                <TableHead className="w-[200px]">Title</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className="w-[150px]">Date</TableHead>
                                <TableHead className="text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell>
                                </TableRow>
                            ) : announcements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">No announcements found.</TableCell>
                                </TableRow>
                            ) : announcements.map((a) => (
                                <TableRow key={a._id} className={!a.active ? "opacity-60" : ""}>
                                    <TableCell>
                                        <Switch checked={a.active} onCheckedChange={(checked) => handleToggle(a._id, checked)} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            (a.type || 'info') === 'critical' ? 'border-red-200 text-red-700 bg-red-50' :
                                                (a.type || 'info') === 'warning' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                    'border-blue-200 text-blue-700 bg-blue-50'
                                        }>
                                            {(a.type || 'info').toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{a.title}</TableCell>
                                    <TableCell className="truncate max-w-[300px]" title={a.message}>{a.message}</TableCell>
                                    <TableCell className="text-slate-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a._id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

function AuditLogsViewer({ token }: { token: string }) {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadLogs = async () => {
            try {
                if (!token) return;
                const data = await fetchAuditLogs(token, 100)
                setLogs(Array.isArray(data) ? data : [])
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        loadLogs()
    }, [token])

    return (
        <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle>System Activity Ledger</CardTitle>
                <CardDescription>Recent actions tracked across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[150px]">Date</TableHead>
                                <TableHead className="w-[200px]">Actor</TableHead>
                                <TableHead className="w-[200px]">Action</TableHead>
                                <TableHead>Target Resource</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading audit logs...</TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 flex flex-col items-center">
                                        <ClipboardList className="h-10 w-10 text-slate-300 mb-2" />
                                        No recent activity.
                                    </TableCell>
                                </TableRow>
                            ) : logs.map((log) => (
                                <TableRow key={log._id} className="text-sm">
                                    <TableCell className="text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                    <TableCell className="font-medium text-slate-700">{log.actor}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-slate-100 font-mono text-xs">{log.action}</Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-600 font-mono text-xs">{log.resource}</TableCell>
                                    <TableCell className="text-slate-600">{log.details}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

function ContactMessagesList({ messages, setMessages, token }: { messages: any[], setMessages: (m: any[]) => void, token: string }) {

    const handleMarkSeen = async (id: string) => {
        try {
            if (!token) return;
            const res = await fetch(`http://localhost:8000/api/v1/contact/${id}/seen`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Message marked as seen")
                setMessages(messages.map(m => m._id === id ? { ...m, status: "seen", seen_at: new Date().toISOString() } : m))
            } else {
                toast.error("Failed to mark message as seen")
            }
        } catch (err) {
            console.error(err)
            toast.error("An error occurred")
        }
    }

    const handleDeleteMessage = async (id: string) => {
        try {
            if (!token) return;
            const res = await fetch(`http://localhost:8000/api/v1/contact/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Message deleted")
                setMessages(messages.filter(m => m._id !== id))
            } else {
                toast.error("Failed to delete message")
            }
        } catch (err) {
            console.error(err)
            toast.error("An error occurred")
        }
    }

    return (
        <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle>Contact & Support Messages</CardTitle>
                <CardDescription>Inquiries and support requests from visitors.</CardDescription>
            </CardHeader>
            <CardContent>
                {messages.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        <Mail className="h-10 w-10 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-900">Inbox empty</p>
                        <p className="text-sm">No new support messages.</p>
                    </div>
                ) : (
                    <div className="rounded-md border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead className="w-[200px]">Sender Name</TableHead>
                                    <TableHead className="w-[200px]">Email Address</TableHead>
                                    <TableHead>Message Detail</TableHead>
                                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {messages.map((m) => (
                                    <TableRow key={m._id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            {m.status === "seen" ? (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none">Seen</Badge>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none shadow-none">New</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                                            {new Date(m.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-medium">{m.name}</TableCell>
                                        <TableCell className="text-slate-600">{m.email}</TableCell>
                                        <TableCell className="max-w-md truncate text-slate-600" title={m.message}>{m.message}</TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-2">
                                            {m.status !== "seen" ? (
                                                <Button variant="ghost" size="sm" onClick={() => handleMarkSeen(m._id)} title="Mark as Seen" className="h-8 w-8 p-0">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(m._id)} title="Delete Message" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600 transition-colors" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
