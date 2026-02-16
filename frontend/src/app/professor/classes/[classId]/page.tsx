"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { fetchClass, fetchClassStudents, fetchClassRequests, approveClassRequest, rejectClassRequest, fetchExams, updateClass, fetchSubjects, deleteClass, createAnnouncement, fetchAnnouncements, removeStudentFromClass } from "@/lib/api"
import { formatDateLocal } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, UserPlus, FileText, Check, X, Copy, Settings, Trash2, Pencil, Megaphone, Send, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserProfileDialog } from "@/components/UserProfileDialog"
import { format } from "date-fns"

export default function ClassDetailsPage() {
    const params = useParams()
    const { data: session, status } = useSession()
    const router = useRouter()

    // Type checking for params
    const classId = typeof params.classId === 'string' ? params.classId : params.id as string

    const [classData, setClassData] = useState<any>(null)
    const [students, setStudents] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [exams, setExams] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [editOpen, setEditOpen] = useState(false)
    const [editData, setEditData] = useState({ name: "", subject_id: "" })

    const [announcementOpen, setAnnouncementOpen] = useState(false)
    const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" })

    const [profileOpen, setProfileOpen] = useState(false)
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const [studentRemovalId, setStudentRemovalId] = useState<string | null>(null)
    const [confirmName, setConfirmName] = useState("")

    useEffect(() => {
        if (status === "loading" || !classId) return
        const token = (session?.user as any)?.accessToken

        if (status === "unauthenticated" || !token) {
            setLoading(false)
            return // Or redirect
        }
        loadData(token)
    }, [session, status, classId])

    const loadData = async (token: string) => {
        setLoading(true)
        try {
            // Load Class Details
            const cData = await fetchClass(classId, token)
            setClassData(cData)

            // Load Students
            const sData = await fetchClassStudents(classId, token)
            setStudents(sData)

            // Load Requests
            const rData = await fetchClassRequests(classId, token)
            setRequests(rData)

            // Load Exams
            const allExams = await fetchExams(token)
            // Client side filter
            const classExams = allExams.filter((e: any) => e.class_ids?.includes(classId))
            setExams(classExams)

            // Load Subjects (for mapping and editing)
            const allSubjects = await fetchSubjects(token)
            setSubjects(allSubjects)

            // Load Announcements
            try {
                const ann = await fetchAnnouncements(classId, token)
                setAnnouncements(ann)
            } catch (ignore) { console.warn("Failed to load announcements") }

        } catch (error) {
            console.error("Failed to load class data", error)
            toast.error("Failed to load class details")
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (reqId: string) => {
        try {
            const token = (session?.user as any)?.accessToken
            if (!token) return
            await approveClassRequest(classId, reqId, token)
            toast.success("Student Approved")
            loadData(token) // Reload
        } catch (e) {
            toast.error("Failed to approve")
        }
    }

    const handleReject = async (reqId: string) => {
        try {
            const token = (session?.user as any)?.accessToken
            if (!token) return
            await rejectClassRequest(classId, reqId, token)
            toast.success("Student Rejected")
            loadData(token)
        } catch (e) {
            toast.error("Failed to reject")
        }
    }

    const handleRemoveStudent = (studentId: string) => {
        setStudentRemovalId(studentId)
    }

    const confirmRemoveStudent = async () => {
        if (!studentRemovalId) return
        try {
            const token = (session?.user as any)?.accessToken
            if (!token) return
            await removeStudentFromClass(classId, studentRemovalId, token)
            toast.success("Student removed")
            setStudentRemovalId(null)
            loadData(token)
        } catch (e) {
            toast.error("Failed to remove student")
        }
    }

    const copyCode = () => {
        if (classData) {
            navigator.clipboard.writeText(classData.class_code)
            toast.success("Class Code Copied!")
        }
    }

    const openEditDialog = () => {
        if (classData) {
            setEditData({ name: classData.name, subject_id: classData.subject_id })
            setEditOpen(true)
        }
    }

    const handleUpdateClass = async () => {
        const token = (session?.user as any)?.accessToken
        if (!token) return

        try {
            const updated = await updateClass(classId, editData, token)
            setClassData(updated)
            setEditOpen(false)
            toast.success("Class updated successfully")
        } catch (e) {
            toast.error("Failed to update class")
        }
    }

    const handleViewProfile = (student: any) => {
        // student object usually has { _id, student_id, user_id, ... } depending on aggregation
        // If 'student.user_id' exists, use it. usage in list: student.email, student.full_name
        // We'll try to find a valid ID to fetch profile.
        // Assuming student.user_id is the link to Auth User. Or if not, we might need student_id.
        // Let's rely on what we have.
        setSelectedStudentId(student.user_id || student.id || student._id)
        setProfileOpen(true)
    }

    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.title || !newAnnouncement.content) {
            toast.error("Please fill all fields")
            return
        }
        const token = (session?.user as any)?.accessToken
        if (!token) return

        try {
            await createAnnouncement(classId, newAnnouncement.title, newAnnouncement.content, token)
            setAnnouncementOpen(false)
            setNewAnnouncement({ title: "", content: "" })
            toast.success("Announcement posted")

            // Reload announcements
            const ann = await fetchAnnouncements(classId, token)
            setAnnouncements(ann)
        } catch (e) {
            toast.error("Failed to post announcement")
        }
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (!classData) return <div>Class not found</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
                        <Button variant="ghost" size="icon" onClick={openEditDialog}>
                            <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                    </div>
                    <p className="text-slate-500">
                        {subjects.find(s => s._id === classData.subject_id)?.name || "Unknown Subject"} • {students.length} Students
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={copyCode}>
                        <Copy className="mr-2 h-4 w-4" /> Code: {classData.class_code}
                    </Button>
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Class Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Class Name</Label>
                                    <Input
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Select
                                        value={editData.subject_id}
                                        onValueChange={(val) => setEditData({ ...editData, subject_id: val })}
                                    >
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
                                <Button onClick={handleUpdateClass}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <UserProfileDialog
                        isOpen={profileOpen}
                        onClose={() => setProfileOpen(false)}
                        userId={selectedStudentId}
                        token={(session?.user as any)?.accessToken}
                    />
                </div>
            </div>

            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    <TabsTrigger value="exams">Exams</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="space-y-6 mt-6">
                    {/* Pending Requests */}
                    {requests.length > 0 && (
                        <Card className="border-orange-200 bg-orange-50/30">
                            <CardHeader>
                                <CardTitle className="text-orange-900 text-lg">Pending Requests ({requests.length})</CardTitle>
                                <CardDescription>Students waiting for approval to join this class.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {requests.map(req => (
                                    <div key={req._id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                                {req.student_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{req.student_name}</div>
                                                <div className="text-sm text-slate-500">{req.student_id}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(req._id)}>
                                                <X className="h-4 w-4 mr-1" /> Reject
                                            </Button>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req._id)}>
                                                <Check className="h-4 w-4 mr-1" /> Approve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Active Students */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Enrolled Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {students.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">No students enrolled yet.</div>
                            ) : (
                                <div className="space-y-1">
                                    {students.map((student, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={`https://avatar.vercel.sh/${student.email}`} />
                                                    <AvatarFallback>{student.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{student.full_name}</div>
                                                    <div className="text-sm text-slate-500">{student.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opactiy-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Remove Student" onClick={() => handleRemoveStudent(student.id || student._id)}>
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleViewProfile(student)}>
                                                    View Profile
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="announcements" className="mt-6 space-y-6">
                    <div className="flex justify-between items-center bg-blue-50/50 p-6 rounded-lg border border-blue-100">
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900">Class Announcements</h3>
                            <p className="text-blue-700/80 text-sm">Post updates and notifications for your students.</p>
                        </div>
                        <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                    <Megaphone className="h-4 w-4" /> New Announcement
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>New Announcement</DialogTitle>
                                    <DialogDescription>
                                        This will be visible to all students in the class.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input
                                            placeholder="e.g. Exam Schedule Update"
                                            value={newAnnouncement.title}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Content</Label>
                                        <Textarea
                                            placeholder="Type your message here..."
                                            value={newAnnouncement.content}
                                            rows={4}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateAnnouncement} className="gap-2">
                                        <Send className="h-3 w-3" /> Post Now
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="space-y-4">
                        {announcements.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-lg">
                                <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>No announcements yet.</p>
                            </div>
                        ) : (
                            announcements.map((ann) => (
                                <Card key={ann._id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between">
                                            <CardTitle className="text-base font-semibold">{ann.title}</CardTitle>
                                            <span className="text-xs text-slate-500">{formatDateLocal(ann.created_at)}</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-600 text-sm whitespace-pre-wrap">{ann.content}</p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="exams" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => router.push(`/professor/exams/create?classId=${classId}`)}>
                            <FileText className="mr-2 h-4 w-4" /> Create Exam for this Class
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {exams.length === 0 ? (
                            <Card className="col-span-full border-dashed">
                                <CardContent className="flex flex-col items-center justify-center h-48 text-slate-400">
                                    <FileText className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No exams created for this class yet.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            exams.map(exam => (
                                <Card key={exam._id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/professor/exams/${exam._id}`)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                                        <CardDescription>{new Date(exam.schedule_start).toLocaleDateString()}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Badge variant={new Date(exam.schedule_start) > new Date() ? "outline" : "secondary"}>
                                            {new Date(exam.schedule_start) > new Date() ? "Upcoming" : "Completed"}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class Settings</CardTitle>
                            <CardDescription>Manage class details and configuration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Class Name</label>
                                <div className="p-2 border rounded-md bg-slate-50">{classData.name}</div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Class Code</label>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 border rounded-md bg-slate-50 font-mono flex-1">{classData.class_code}</div>
                                    <Button size="icon" variant="ghost" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>

                            <hr className="my-4" />

                            <div className="flex justify-between items-center bg-red-50 p-4 rounded-lg border border-red-100">
                                <div>
                                    <h4 className="font-medium text-red-700">Danger Zone</h4>
                                    <p className="text-xs text-red-600/80">Delete this class and all associated data.</p>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" size="sm">Delete Class</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Delete Class</DialogTitle>
                                            <DialogDescription>
                                                This action cannot be undone. Please type <strong>{classData.name}</strong> to confirm.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-2">
                                            <Input
                                                placeholder="Type class name to confirm"
                                                value={confirmName}
                                                onChange={(e) => setConfirmName(e.target.value)}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                variant="destructive"
                                                disabled={confirmName !== classData.name}
                                                onClick={async () => {
                                                    const token = (session?.user as any)?.accessToken
                                                    if (!token) return
                                                    try {
                                                        await deleteClass(classId, token)
                                                        toast.success("Class deleted")
                                                        router.push("/professor/classes")
                                                    } catch (e) {
                                                        toast.error("Failed to delete")
                                                    }
                                                }}
                                            >
                                                Confirm Delete
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            <AlertDialog open={!!studentRemovalId} onOpenChange={(open) => !open && setStudentRemovalId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Student</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this student from the class? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveStudent} className="bg-red-600 hover:bg-red-700 text-white">
                            Remove Student
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
