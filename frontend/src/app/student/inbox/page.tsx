"use client"

import { cn, formatDateLocal } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, Info, FileText, Megaphone } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchClass,
    fetchPublicProfile,
    fetchClasses
} from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

import { ProfessorProfileDialog } from "@/components/ProfessorProfileDialog"

export default function StudentInboxPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modal State
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedNotif, setSelectedNotif] = useState<any>(null)
    const [detailData, setDetailData] = useState<any>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)

    // Prof Profile State
    const [profModalOpen, setProfModalOpen] = useState(false)

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const load = async () => {
            try {
                const data = await fetchNotifications(token)
                setNotifications(data)
            } catch (e) {
                toast.error("Failed to load notifications")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session, status])

    const handleMarkAllRead = async () => {
        const token = (session?.user as any)?.accessToken
        try {
            await markAllNotificationsRead(token)
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            toast.success("All marked as read")
        } catch (e) {
            toast.error("Failed to mark all read")
        }
    }

    const handleRead = async (id: string, link: string, type: string, message: string) => {
        const token = (session?.user as any)?.accessToken
        try {
            await markNotificationRead(id, token)
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n))

            // Redirects
            if (type === "RESULT_PUBLISHED" || type === "ANNOUNCEMENT") {
                if (link && link !== "#") {
                    // For announcements, the backend sends /student/classes/{class_id}
                    // This is exactly what we want.
                    router.push(link)
                }
                return
            }

            // For Class Updates -> Open Modal
            if (type === "STATUS_UPDATE" && link && link.includes("/")) {
                setSelectedNotif({ type, message, link })
                setDetailOpen(true)
                setLoadingDetail(true)

                let classId = ""
                // Robust ID Extraction
                try {
                    const url = new URL(link, window.location.origin)
                    if (url.searchParams.get("approved")) {
                        classId = url.searchParams.get("approved") || ""
                    } else {
                        const parts = url.pathname.split("/")
                        // Look for Mongo ID (24 chars hex)
                        const candidate = parts.find(p => p && p.match(/^[0-9a-fA-F]{24}$/))
                        if (candidate) {
                            classId = candidate
                        }
                    }
                    // Console log for debugging
                    console.log("Parsed Link:", link, "Extracted ID:", classId)
                } catch (e) {
                    const parts = link.split("/")
                    classId = parts.slice().reverse().find(p => p && p.match(/^[0-9a-fA-F]{24}$/)) || ""
                    console.log("Fallback ID:", classId)
                }

                if (classId && classId.length === 24) {
                    try {
                        const classData = await fetchClass(classId, token)
                        let profData = null
                        if (classData.professor_id) {
                            profData = await fetchPublicProfile(classData.professor_id, token)
                        }
                        setDetailData({ class: classData, professor: profData })
                    } catch (e) {
                        console.error("Failed to load details", e)
                        setDetailData(null)
                    }
                } else if (message.includes("request to join")) {
                    // Fallback: Try to find class by name from the message
                    try {
                        const match = message.match(/join (.*?) has been/)
                        if (match && match[1]) {
                            const className = match[1].trim()
                            // Fetch all enrolled classes
                            const myClasses = await fetchClasses(token)
                            const found = myClasses.find((c: any) => c.name === className)
                            if (found) {
                                // Found it! Load details.
                                const classData = await fetchClass(found._id, token)
                                let profData = null
                                if (classData.professor_id) {
                                    profData = await fetchPublicProfile(classData.professor_id, token)
                                }
                                setDetailData({ class: classData, professor: profData })
                            } else {
                                console.warn("Class not found by name:", className)
                                setDetailData(null)
                            }
                        } else {
                            setDetailData(null)
                        }
                    } catch (e) {
                        console.warn("Fallback lookup failed", e)
                        setDetailData(null)
                    }
                } else {
                    console.warn("Could not extract valid Class ID from:", link)
                    setDetailData(null)
                }
                setLoadingDetail(false)
            } else if (link && link !== "#") {
                router.push(link)
            }

        } catch (e) {
            // ignore
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "RESULT_PUBLISHED": return <CheckCircle className="h-5 w-5 text-green-500" />
            case "ANNOUNCEMENT": return <Megaphone className="h-5 w-5 text-blue-500" />
            case "JOIN_REQUEST": return <Bell className="h-5 w-5 text-amber-500" />
            default: return <Bell className="h-5 w-5 text-slate-500" />
        }
    }

    if (loading) return <div className="p-8">Loading Inbox...</div>

    return (
        <>
            <PageTransition className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Inbox</h1>
                        <p className="text-slate-500 mt-2">Check your latest updates and announcements.</p>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                        <Button variant="outline" onClick={handleMarkAllRead}>Mark All Read</Button>
                    )}
                </div>

                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <Bell className="h-12 w-12 mb-4 text-slate-300" />
                                <p>No notifications yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        notifications.map((notif) => (
                            <Card
                                key={notif._id}
                                className={`transition-all hover:bg-slate-50/50 cursor-pointer ${!notif.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/10' : ''}`}
                                onClick={() => handleRead(notif._id, notif.link, notif.type, notif.message)}
                            >
                                <div className="p-4 flex items-start gap-4">
                                    <div className="mt-1">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`text-base ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                {formatDateLocal(notif.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                                        {notif.link && notif.link !== "#" && (
                                            <div className="mt-2 text-xs text-blue-600 font-medium">
                                                Click to view details &rarr;
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <p className="text-center text-xs text-slate-400 mt-4">
                        Read notifications older than 7 days are automatically hidden.
                    </p>
                )}
            </PageTransition>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedNotif?.type === "ANNOUNCEMENT" ? "Announcement Details" : "Class Update"}</DialogTitle>
                        <DialogDescription>
                            {selectedNotif?.message}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingDetail ? (
                        <div className="py-8 text-center text-slate-500">Loading details...</div>
                    ) : detailData ? (
                        <div className="space-y-4 py-4">
                            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                <h4 className="font-semibold text-slate-900">{detailData.class?.name}</h4>
                                <Badge variant="outline">{detailData.class?.class_code}</Badge>
                            </div>
                            {detailData.professor && (
                                <div className="flex items-center gap-3 border-t pt-4">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                        {detailData.professor.full_name?.[0] || "P"}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">Professor {detailData.professor.full_name}</p>
                                        <p className="text-xs text-slate-500">{detailData.professor.email}</p>
                                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setProfModalOpen(true)}>
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {selectedNotif?.type === "STATUS_UPDATE" && (
                                <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={() => router.push(selectedNotif.link)}>Go to Class List</Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                            <p className="text-red-500 font-medium">Unable to load details.</p>
                            <p className="text-sm text-slate-500 max-w-[260px]">This notification might be older or the resource was removed.</p>
                            <Button size="sm" onClick={() => router.push("/student/classes")}>
                                Go to My Classes
                            </Button>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDetailOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ProfessorProfileDialog
                professor={detailData?.professor}
                open={profModalOpen}
                onOpenChange={setProfModalOpen}
            />
        </>
    )
}
