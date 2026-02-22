"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, ArrowLeft, BookOpen, Pencil, Check, X, Settings, Filter } from "lucide-react"
import { useState, useEffect, use } from "react"
import { toast } from "sonner"
import { fetchSubjects, updateSyllabus, updateSubjectMetadata } from "@/lib/api"
import { useSession } from "next-auth/react"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

const AVAILABLE_BRANCHES = ["Computer", "IT", "Mechanical", "Electrical", "Civil", "Electronics", "Chemical"]

export default function SubjectEditPage({ params }: { params: Promise<{ subjectId: string }> }) {
    const { subjectId } = use(params)
    const { data: session } = useSession()
    const token = (session?.user as any)?.accessToken
    const router = useRouter()

    const [subject, setSubject] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // State for Modals
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })
    const [confirmTitle, setConfirmTitle] = useState("")
    const [confirmDesc, setConfirmDesc] = useState("")

    const [addTopicOpen, setAddTopicOpen] = useState(false)
    const [topicName, setTopicName] = useState("")
    const [activeUnitIdx, setActiveUnitIdx] = useState<number | null>(null)

    // Edit Metadata Modal
    const [editMetaOpen, setEditMetaOpen] = useState(false)
    const [metaName, setMetaName] = useState("")
    const [metaSem, setMetaSem] = useState("")
    const [metaBranches, setMetaBranches] = useState<string[]>([])
    const [metaSections, setMetaSections] = useState("")

    // Inline Edit State
    const [editingUnit, setEditingUnit] = useState<{ uIdx: number, name: string } | null>(null)

    useEffect(() => {
        if (token && subjectId) loadSubject()
    }, [token, subjectId])

    async function loadSubject() {
        try {
            const data = await fetchSubjects(token)
            const sub = data.find((s: any) => s._id === subjectId)
            if (sub) {
                setSubject(sub)
            } else {
                toast.error("Subject not found")
                router.push("/professor/curriculum")
            }
        } catch (e) {
            toast.error("Failed to load subject")
        } finally {
            setLoading(false)
        }
    }

    const saveChanges = async (newSyllabus: any[]) => {
        if (!token || !subject) return
        try {
            // Optimistic update
            setSubject({ ...subject, syllabus: newSyllabus })
            await updateSyllabus(subjectId, newSyllabus, token)
        } catch (e) {
            toast.error("Failed to save changes")
        }
    }

    const openEditMeta = () => {
        if (!subject) return
        setMetaName(subject.name)
        setMetaSem(subject.semester || "")
        // Handle legacy branch vs new branches list
        let branches = subject.branches || []
        if (branches.length === 0 && subject.branch) branches = [subject.branch]
        setMetaBranches(branches)
        setMetaSections(subject.sections?.join(", ") || "")
        setEditMetaOpen(true)
    }

    const toggleBranch = (branch: string) => {
        setMetaBranches(prev =>
            prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
        )
    }

    const handleUpdateMeta = async () => {
        if (!token || !subject) return
        try {
            const sections = metaSections.split(",").map(s => s.trim()).filter(s => s)
            const updates = {
                name: metaName,
                semester: metaSem,
                branches: metaBranches,
                sections: sections
            }
            const updatedSub = await updateSubjectMetadata(subjectId, updates, token)
            setSubject(updatedSub)
            setEditMetaOpen(false)
            toast.success("Details Updated")
        } catch (e) {
            toast.error("Failed to update details")
        }
    }

    const addUnit = async () => {
        if (!subject) return
        const newSyllabus = [...(subject.syllabus || [])]
        newSyllabus.push({
            unit: `Unit ${newSyllabus.length + 1}`,
            topics: []
        })
        await saveChanges(newSyllabus)
        toast.success("Unit Added")
    }

    const saveUnitName = async () => {
        if (!editingUnit || !subject) return
        const newSyllabus = [...subject.syllabus]
        newSyllabus[editingUnit.uIdx].unit = editingUnit.name
        setEditingUnit(null)
        await saveChanges(newSyllabus)
        toast.success("Unit Renamed")
    }

    const openAddTopic = (uIdx: number) => {
        setActiveUnitIdx(uIdx)
        setTopicName("")
        setAddTopicOpen(true)
    }

    const handleAddTopic = async () => {
        if (activeUnitIdx === null || !topicName || !subject) return

        const newSyllabus = [...subject.syllabus]
        newSyllabus[activeUnitIdx].topics.push(topicName)

        await saveChanges(newSyllabus)
        setAddTopicOpen(false)
        toast.success("Topic Added")
    }

    const confirmDeleteUnit = (uIdx: number, topicCount: number) => {
        setConfirmTitle(`Delete Unit ${uIdx + 1}?`)
        setConfirmDesc(`This will delete the unit and all ${topicCount} topics inside it.`)
        setConfirmAction(() => async () => {
            const newSyllabus = [...subject.syllabus]
            newSyllabus.splice(uIdx, 1)
            await saveChanges(newSyllabus)
            toast.success("Unit deleted")
        })
        setConfirmOpen(true)
    }

    const confirmDeleteTopic = (uIdx: number, tIdx: number) => {
        setConfirmTitle("Delete Topic?")
        setConfirmDesc("Are you sure you want to remove this topic?")
        setConfirmAction(() => async () => {
            const newSyllabus = [...subject.syllabus]
            newSyllabus[uIdx].topics.splice(tIdx, 1)
            await saveChanges(newSyllabus)
            toast.success("Topic deleted")
        })
        setConfirmOpen(true)
    }

    if (loading) return <div className="p-8">Loading Syllabus...</div>
    if (!subject) return <div className="p-8">Subject not found</div>

    return (
        <PageTransition className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/professor/curriculum")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <BookOpen className="h-6 w-6 text-indigo-600" />
                            {subject.name}
                        </h1>
                        <div className="text-slate-500 text-sm flex flex-col mt-1">
                            <div className="flex items-center gap-2">
                                {subject.semester && (
                                    <Badge variant="outline">Sem {subject.semester}</Badge>
                                )}
                                {(subject.branches || [subject.branch]).filter(Boolean).map((b: string) => (
                                    <Badge key={b} variant="secondary" className="bg-slate-100">{b}</Badge>
                                ))}
                            </div>
                            {subject.sections?.length > 0 && (
                                <span className="text-xs mt-1">
                                    Sections: <span className="font-medium bg-slate-100 px-1 rounded">{subject.sections.join(", ")}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Syllabus</CardTitle>
                        <CardDescription>Organize your curriculum into units and topics.</CardDescription>
                    </div>
                    <Button onClick={addUnit}>
                        <Plus className="mr-2 h-4 w-4" /> Add Unit
                    </Button>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {(subject.syllabus || []).map((unit: any, uIdx: number) => (
                            <AccordionItem key={uIdx} value={`item-${uIdx}`} className="border rounded-lg px-4">
                                <div className="flex items-center justify-between py-2 group">
                                    {editingUnit?.uIdx === uIdx ? (
                                        <div className="flex items-center gap-2 flex-1 p-1" onClick={e => e.stopPropagation()}>
                                            <Input
                                                value={editingUnit.name}
                                                onChange={e => setEditingUnit({ ...editingUnit, name: e.target.value })}
                                                className="h-8 text-sm font-medium"
                                                autoFocus
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={saveUnitName}><Check className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setEditingUnit(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <>
                                            <AccordionTrigger className="hover:no-underline flex-1 text-base font-semibold text-slate-800">
                                                {unit.unit}
                                            </AccordionTrigger>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingUnit({ uIdx, name: unit.unit })
                                                }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={(e) => {
                                                    e.stopPropagation()
                                                    confirmDeleteUnit(uIdx, unit.topics?.length || 0)
                                                }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <AccordionContent className="pt-2 pb-4">
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                        <ul className="space-y-2">
                                            {(unit.topics || []).map((t: string, tIdx: number) => (
                                                <li key={tIdx} className="flex justify-between items-center group/topic bg-white border border-slate-100 p-2 rounded hover:border-slate-300 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 bg-slate-300 rounded-full" />
                                                        <span className="text-sm text-slate-700">{t}</span>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 opacity-0 group-hover/topic:opacity-100 text-slate-400 hover:text-red-500"
                                                        onClick={() => confirmDeleteTopic(uIdx, tIdx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </li>
                                            ))}
                                            {(!unit.topics || unit.topics.length === 0) && (
                                                <li className="text-sm text-slate-400 italic text-center py-2">No topics added yet.</li>
                                            )}
                                        </ul>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2 border-dashed text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                                            onClick={() => openAddTopic(uIdx)}
                                        >
                                            <Plus className="mr-2 h-3.5 w-3.5" /> Add Topic
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {(!subject.syllabus || subject.syllabus.length === 0) && (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50/50 mt-4">
                            <p className="text-slate-500">No units defined for this subject.</p>
                            <Button variant="link" onClick={addUnit}>Add your first Unit</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description={confirmDesc}
                onConfirm={confirmAction}
                variant="destructive"
            />

            <Dialog open={addTopicOpen} onOpenChange={setAddTopicOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Topic</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Topic Name</Label>
                        <Input
                            value={topicName}
                            onChange={e => setTopicName(e.target.value)}
                            placeholder="e.g. B-Trees"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic() }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddTopic}>Add Topic</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editMetaOpen} onOpenChange={setEditMetaOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subject Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Subject Name</Label>
                            <Input
                                value={metaName}
                                onChange={e => setMetaName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Semester</Label>
                                <Select value={metaSem} onValueChange={setMetaSem}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                            <SelectItem key={i} value={i.toString()}>Sem {i}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Branches</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal">
                                            {metaBranches.length > 0
                                                ? `${metaBranches.length} Selected`
                                                : "Select Branches"}
                                            <Filter className="h-3 w-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-48">
                                        <DropdownMenuLabel>Select Branches</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {AVAILABLE_BRANCHES.map((branch) => (
                                            <DropdownMenuCheckboxItem
                                                key={branch}
                                                checked={metaBranches.includes(branch)}
                                                onCheckedChange={() => toggleBranch(branch)}
                                            >
                                                {branch}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        {metaBranches.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {metaBranches.map(b => (
                                    <Badge key={b} variant="secondary" className="text-xs font-normal">
                                        {b} <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleBranch(b)} />
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Class Sections</Label>
                            <Input
                                value={metaSections}
                                onChange={e => setMetaSections(e.target.value)}
                                placeholder="A, B, C"
                            />
                            <p className="text-xs text-slate-400">Comma separated list of sections</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateMeta}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageTransition >
    )
}
