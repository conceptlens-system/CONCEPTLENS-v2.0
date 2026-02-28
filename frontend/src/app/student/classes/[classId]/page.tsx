"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { fetchClass, fetchAnnouncements, fetchPublicProfile, fetchSubject } from "@/lib/api"
import { formatDateLocal } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PageTransition } from "@/components/PageTransition"
import { Loader2, ArrowLeft, User, Megaphone, Calendar, BookOpen, Layers } from "lucide-react"

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
    const [subjectData, setSubjectData] = useState<any>(null)
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

            // 4. Fetch Subject for Curriculum
            if (cData.subject_id) {
                try {
                    const sData = await fetchSubject(cData.subject_id, token)
                    setSubjectData(sData)
                } catch (e) { console.warn("Subject fetch failed", e) }
            }

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

                    <Tabs defaultValue="announcements" className="mt-8">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                            <TabsTrigger
                                value="announcements"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 py-3 font-medium"
                            >
                                <Megaphone className="h-4 w-4 mr-2" />
                                Announcements
                            </TabsTrigger>
                            <TabsTrigger
                                value="curriculum"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 py-3 font-medium"
                            >
                                <BookOpen className="h-4 w-4 mr-2" />
                                Curriculum
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="announcements" className="pt-6">
                            {announcements.length === 0 ? (
                                <p className="text-slate-500 italic text-center py-8">No announcements yet.</p>
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
                        </TabsContent>

                        <TabsContent value="curriculum" className="pt-6">
                            {!subjectData ? (
                                <p className="text-slate-500 italic text-center py-8">Loading curriculum...</p>
                            ) : !subjectData.syllabus || subjectData.syllabus.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
                                    <Layers className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>No curriculum has been published for this subject yet.</p>
                                </div>
                            ) : (
                                <div className="bg-white border rounded-lg p-1">
                                    <Accordion type="multiple" className="w-full">
                                        {subjectData.syllabus.map((syl: any, index: number) => {
                                            let cleanName = syl.unit_name || "Overview"
                                            const prefixRegex = new RegExp(`^Unit\\s*${syl.unit}\\s*[:-]?\\s*`, 'i')
                                            cleanName = cleanName.replace(prefixRegex, '')

                                            return (
                                                <AccordionItem key={index} value={`unit-${index}`} className="border-b last:border-0">
                                                    <AccordionTrigger className="px-4 hover:bg-slate-50 hover:no-underline">
                                                        <div className="flex items-start sm:items-center gap-2 text-left w-full pr-4">
                                                            <span className="font-semibold text-indigo-700 whitespace-nowrap shrink-0">Unit {syl.unit}:</span>
                                                            <span className="font-medium text-slate-800 break-words">{cleanName}</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-4 pb-4 pt-2">
                                                        <ul className="list-disc list-inside space-y-1 text-slate-600 pl-16">
                                                            {syl.topics.map((topic: string, tIndex: number) => (
                                                                <li key={tIndex} className="leading-relaxed">{topic}</li>
                                                            ))}
                                                        </ul>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                    </Accordion>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
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
