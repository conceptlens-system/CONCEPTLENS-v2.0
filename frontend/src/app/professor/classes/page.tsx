"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, BookOpen, Copy } from "lucide-react"
import { useState, useEffect } from "react"
import { fetchClasses, createClass, fetchSubjects, fetchClassRequests, approveClassRequest } from "@/lib/api"
import { toast } from "sonner"
import { UserProfileDialog } from "@/components/UserProfileDialog"
import { Eye } from "lucide-react"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { PageTransition } from "@/components/PageTransition"
import { motion } from "framer-motion"

export default function ProfessorClassesPage() {
    const { data: session, status } = useSession()

    const [classes, setClasses] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [newClass, setNewClass] = useState({ name: "", subject_id: "" })
    const [requestDialogOpen, setRequestDialogOpen] = useState(false)
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
    const [requests, setRequests] = useState<any[]>([])
    const [profileDialogOpen, setProfileDialogOpen] = useState(false)
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

    useEffect(() => {
        if (status === "loading") return
        if (status === "unauthenticated") {
            setLoading(false)
            return // Or redirect
        }

        const token = (session?.user as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }

        Promise.all([fetchClasses(token), fetchSubjects(token)])
            .then(([cData, sData]) => {
                setClasses(cData)
                setSubjects(sData)
            })
            .catch(err => {
                console.error(err)
                toast.error("Failed to load data")
            })
            .finally(() => setLoading(false))
    }, [session, status])

    const handleCreate = async () => {
        if (!newClass.name || !newClass.subject_id || !session) return

        const token = (session.user as any).accessToken

        try {
            const created = await createClass(newClass, token)
            setClasses([created, ...classes])
            setOpen(false)
            setNewClass({ name: "", subject_id: "" })
            toast.success("Class created successfully")
        } catch (e) {
            toast.error("Failed to create class")
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success("Class code copied")
    }

    const handleViewRequests = async (classId: string) => {
        if (!session) return
        const token = (session.user as any).accessToken
        setSelectedClassId(classId)
        setRequestDialogOpen(true)
        setRequests([]) // Clear previous
        try {
            const data = await fetchClassRequests(classId, token)
            setRequests(data)
        } catch (e) {
            toast.error("Failed to fetch requests")
        }
    }

    const handleApprove = async (requestId: string) => {
        if (!session || !selectedClassId) return
        const token = (session.user as any).accessToken
        try {
            await approveClassRequest(selectedClassId, requestId, token)
            toast.success("Student approved")
            // Refresh requests
            handleViewRequests(selectedClassId)
        } catch (e) {
            toast.error("Failed to approve")
        }
    }

    return (
        <PageTransition className="space-y-8">
            {/* ... (Header & Create Class Dialog) ... */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Classes</h1>
                    <p className="text-slate-500 mt-2">Manage student batches and codes.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-sm hover:shadow-md transition-all"><Plus className="mr-2 h-4 w-4" /> Create Class</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Class</DialogTitle>
                            <DialogDescription>Generate a unique code for students to join.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Class Name</Label>
                                <Input
                                    placeholder="e.g. DBMS - Sem 3 - Section A"
                                    value={newClass.name}
                                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Select onValueChange={(val) => setNewClass({ ...newClass, subject_id: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create Class</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Enrollments Dialog */}
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Class Enrollments</DialogTitle>
                        <DialogDescription>Approve students waiting to join.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {requests.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No pending requests.</p>
                        ) : (
                            requests.map(r => (
                                <div key={r._id} className="flex justify-between items-center p-3 bg-slate-50 rounded border">
                                    <div>
                                        <div
                                            className="font-medium cursor-pointer hover:underline text-indigo-700 decoration-indigo-300"
                                            onClick={() => { setSelectedStudentId(r.student_user_id || r.student_id); setProfileDialogOpen(true); }}
                                        >
                                            {r.student_name}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-slate-500">{r.student_id_email || r.student_id}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedStudentId(r.student_user_id || r.student_id); setProfileDialogOpen(true); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" onClick={() => handleApprove(r._id)}>Approve</Button>
                                    </div>
                                </div>
                            ))
                        )}
                        <UserProfileDialog
                            isOpen={profileDialogOpen}
                            onClose={() => setProfileDialogOpen(false)}
                            userId={selectedStudentId}
                            token={(session?.user as any)?.accessToken}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {loading ? (
                <div>Loading classes...</div>
            ) : classes.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400">
                    No classes found. Create one to get started.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((c, i) => (
                        <motion.div
                            key={c._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                        >
                            <Card className="hover:shadow-lg transition-shadow duration-300 hover:-translate-y-1">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg leading-tight">{c.name}</CardTitle>
                                            <p className="text-sm font-medium text-slate-700">
                                                {subjects.find(s => s._id === c.subject_id)?.name || "Unknown Subject"}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="font-mono ml-2 shrink-0">{c.class_code}</Badge>
                                    </div>
                                    <CardDescription className="pt-1">
                                        Created {new Date(c.created_at).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-2 bg-slate-100 rounded flex justify-between items-center text-sm font-mono mt-2 group cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => copyCode(c.class_code)}>
                                        <span>Code: {c.class_code}</span>
                                        <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button variant="outline" className="flex-1 text-sm hover:bg-slate-50" onClick={() => handleViewRequests(c._id)}>
                                        <Users className="mr-2 h-4 w-4" /> Enrollments
                                    </Button>
                                    <Button className="flex-1 text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-sm" asChild>
                                        <Link href={`/professor/classes/${c._id}`}>
                                            Manage Class
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </PageTransition>
    )
}
