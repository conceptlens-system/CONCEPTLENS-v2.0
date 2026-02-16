"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { fetchClass, fetchAnnouncements, fetchPublicProfile } from "@/lib/api"
import { formatDateLocal } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/PageTransition"
import { Loader2, ArrowLeft, User, Megaphone, Calendar } from "lucide-react"

import { ProfessorProfileDialog } from "@/components/ProfessorProfileDialog"

export default function StudentClassDetailsPage() {
    const params = useParams()
    const { data: session, status } = useSession()
    const router = useRouter()

    // Safety check for params.classId
    const classId = params.classId as string

    const [classData, setClassData] = useState<any>(null)
    const [professor, setProfessor] = useState<any>(null)
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [profModalOpen, setProfModalOpen] = useState(false)

    useEffect(() => {
        if (status === "loading" || !classId) return
        const token = (session?.user as any)?.accessToken
        if (!token) return
        loadData(token)
    }, [classId, status, session])

    const loadData = async (token: string) => {
        try {
            // 1. Fetch Class
            const cData = await fetchClass(classId, token)
            setClassData(cData)

            // 2. Fetch Professor
            if (cData.professor_id) {
                try {
                    const pData = await fetchPublicProfile(cData.professor_id, token)
                    setProfessor(pData)
                } catch (e) { console.warn("Prof fetch failed", e) }
            }

            // 3. Fetch Announcements
            try {
                const aData = await fetchAnnouncements(classId, token)
                setAnnouncements(aData)
            } catch (e) { console.warn("Announcements fetch failed", e) }

        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (!classData) return <div className="p-8 text-center">Class not found</div>

    return (
        <PageTransition className="space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Classes
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content: Header & Announcements */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-l-4 border-l-indigo-600">
                        <CardHeader>
                            <Badge variant="outline" className="w-fit mb-2">{classData.class_code}</Badge>
                            <CardTitle className="text-3xl">{classData.name}</CardTitle>
                            <CardDescription>
                                {classData.subject_id} • {classData.institution_id}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <h2 className="text-xl font-bold flex items-center gap-2 mt-8">
                        <Megaphone className="h-5 w-5 text-slate-600" />
                        Announcements
                    </h2>
                    {announcements.length === 0 ? (
                        <p className="text-slate-500 italic">No announcements yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map((ann: any) => (
                                <Card key={ann._id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">{ann.title}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {formatDateLocal(ann.created_at)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-700 whitespace-pre-wrap">{ann.content}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: Professor & Tools */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-indigo-600" />
                                Instructor
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {professor ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 text-lg">
                                            {professor.full_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium">{professor.full_name}</p>
                                            <p className="text-xs text-slate-500">{professor.email}</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-100 my-4" />
                                    <div className="text-sm space-y-2">
                                        {professor.department && <p><span className="font-medium text-slate-700">Dept:</span> {professor.department}</p>}
                                        {professor.office_hours && <p><span className="font-medium text-slate-700">Office Hours:</span> {professor.office_hours}</p>}
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setProfModalOpen(true)}>
                                        View Details
                                    </Button>
                                </>
                            ) : (
                                <p className="text-slate-500">Instructor details unavailable.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ProfessorProfileDialog
                professor={professor}
                open={profModalOpen}
                onOpenChange={setProfModalOpen}
            />
        </PageTransition>
    )
}
