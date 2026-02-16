"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, BookOpen, Edit, Trash2, Search, Filter, X, Check, Settings, Upload, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { fetchSubjects, createSubject, deleteSubject, updateSubjectMetadata } from "@/lib/api"
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
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { SyllabusImportDialog } from "@/components/SyllabusImportDialog"

// Common branches for selection
const AVAILABLE_BRANCHES = ["Computer", "IT", "Mechanical", "Electrical", "Civil", "Electronics", "Chemical"]

export default function CurriculumPage() {
    const { data: session } = useSession()
    const token = (session?.user as any)?.accessToken
    const router = useRouter()

    const [subjects, setSubjects] = useState<any[]>([])
    const [filteredSubjects, setFilteredSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })
    const [confirmTitle, setConfirmTitle] = useState("")
    const [confirmDesc, setConfirmDesc] = useState("")

    // Filters
    const [searchQuery, setSearchQuery] = useState("")
    const [semesterFilter, setSemesterFilter] = useState("all")

    // Syllabus Import
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [importedSyllabus, setImportedSyllabus] = useState<any[] | null>(null)

    // Create Modal State
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newSubjectName, setNewSubjectName] = useState("")
    const [newSubjectSemester, setNewSubjectSemester] = useState("")
    const [newSubjectBranches, setNewSubjectBranches] = useState<string[]>([])
    const [newSubjectSections, setNewSubjectSections] = useState("")
    const [customBranchInput, setCustomBranchInput] = useState("")

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingSubject, setEditingSubject] = useState<any>(null)
    const [editName, setEditName] = useState("")
    const [editSemester, setEditSemester] = useState("")
    const [editBranches, setEditBranches] = useState<string[]>([])
    const [editSections, setEditSections] = useState("")
    const [editCustomBranchInput, setEditCustomBranchInput] = useState("")

    useEffect(() => {
        if (token) loadSubjects()
        else setLoading(false)
    }, [token])

    useEffect(() => {
        filterSubjects()
    }, [subjects, searchQuery, semesterFilter])

    async function loadSubjects() {
        if (!token) return
        try {
            const data = await fetchSubjects(token)
            setSubjects(data)
        } catch (e) {
            toast.error("Failed to load subjects")
        } finally {
            setLoading(false)
        }
    }

    function filterSubjects() {
        let result = subjects
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(s => s.name.toLowerCase().includes(q))
        }
        if (semesterFilter !== "all") {
            result = result.filter(s => s.semester === semesterFilter)
        }
        setFilteredSubjects(result)
    }

    // --- Create Logic ---
    const addCustomBranch = () => {
        const val = customBranchInput.trim()
        if (val && !newSubjectBranches.includes(val)) {
            setNewSubjectBranches([...newSubjectBranches, val])
        }
        setCustomBranchInput("")
    }

    const toggleBranch = (branch: string, isEdit = false) => {
        if (isEdit) {
            setEditBranches(prev =>
                prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
            )
        } else {
            setNewSubjectBranches(prev =>
                prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
            )
        }
    }

    const removeBranch = (branch: string, isEdit = false) => {
        if (isEdit) {
            setEditBranches(prev => prev.filter(b => b !== branch))
        } else {
            setNewSubjectBranches(prev => prev.filter(b => b !== branch))
        }
    }

    const handleImportSuccess = (data: any) => {
        setImportedSyllabus(data.units)
        setIsAddOpen(true)
        toast.info("Syllabus imported! Enter subject details to finalize.")
    }

    async function handleCreateSubject() {
        if (!newSubjectName || !token) return
        try {
            // Add any pending custom branch input
            const finalBranches = [...newSubjectBranches]
            if (customBranchInput.trim() && !finalBranches.includes(customBranchInput.trim())) {
                finalBranches.push(customBranchInput.trim())
            }

            const sections = newSubjectSections.split(",").map(s => s.trim()).filter(s => s)
            await createSubject(newSubjectName, token, newSubjectSemester, finalBranches, sections, importedSyllabus || [])
            toast.success("Subject Created")

            // Reset
            setNewSubjectName("")
            setNewSubjectSemester("")
            setNewSubjectBranches([])
            setNewSubjectSections("")
            setCustomBranchInput("")
            setIsAddOpen(false)
            loadSubjects()
        } catch (e) {
            toast.error("Failed to create subject")
        }
    }

    // --- Edit Logic ---
    const openEditModal = (subject: any) => {
        setEditingSubject(subject)
        setEditName(subject.name)
        setEditSemester(subject.semester || "")
        // Handle legacy branch vs new branches list
        let branches = subject.branches || []
        if (branches.length === 0 && subject.branch) branches = [subject.branch]
        setEditBranches(branches)
        setEditSections(subject.sections?.join(", ") || "")
        setEditCustomBranchInput("")
        setIsEditOpen(true)
    }

    const addEditCustomBranch = () => {
        const val = editCustomBranchInput.trim()
        if (val && !editBranches.includes(val)) {
            setEditBranches([...editBranches, val])
        }
        setEditCustomBranchInput("")
    }

    async function handleUpdateSubject() {
        if (!token || !editingSubject) return
        try {
            // Add any pending custom branch input
            const finalBranches = [...editBranches]
            if (editCustomBranchInput.trim() && !finalBranches.includes(editCustomBranchInput.trim())) {
                finalBranches.push(editCustomBranchInput.trim())
            }

            const sections = editSections.split(",").map(s => s.trim()).filter(s => s)
            const updates = {
                name: editName,
                semester: editSemester,
                branches: finalBranches,
                sections: sections
            }
            await updateSubjectMetadata(editingSubject._id, updates, token)
            toast.success("Subject Updated")
            setIsEditOpen(false)
            setEditingSubject(null)
            loadSubjects()
        } catch (e) {
            toast.error("Failed to update subject")
        }
    }


    const confirmDeleteSubject = (id: string, name: string) => {
        if (!token) return
        setConfirmTitle(`Delete Subject: ${name}?`)
        setConfirmDesc("This action cannot be undone. All units and topics will be removed.")
        setConfirmAction(() => async () => {
            try {
                await deleteSubject(id, token)
                setSubjects(prev => prev.filter(s => s._id !== id))
                toast.success("Subject deleted")
            } catch (e) {
                toast.error("Failed to delete subject")
            }
        })
        setConfirmOpen(true)
    }

    if (loading) return <div className="p-8">Loading Curriculum...</div>

    return (
        <PageTransition className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Curriculum Management</h1>
                    <p className="text-slate-500">Define subjects and syllabus for analysis.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Import PDF
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={(val) => { if (!val) setImportedSyllabus(null); setIsAddOpen(val); }}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Subject</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {importedSyllabus && (
                                    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md text-sm flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Full Syllabus Imported ({importedSyllabus.length} Units)</span>
                                    </div>
                                )}
                                {/* Create Form Fields */}
                                <div className="space-y-2">
                                    <Label>Subject Name</Label>
                                    <Input
                                        value={newSubjectName}
                                        onChange={e => setNewSubjectName(e.target.value)}
                                        placeholder="e.g. Data Structures"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Semester (Optional)</Label>
                                        <Select value={newSubjectSemester} onValueChange={setNewSubjectSemester}>
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
                                                    Add Branch
                                                    <Filter className="h-3 w-3 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56">
                                                <DropdownMenuLabel>Select Common</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {AVAILABLE_BRANCHES.map((branch) => (
                                                    <DropdownMenuCheckboxItem
                                                        key={branch}
                                                        checked={newSubjectBranches.includes(branch)}
                                                        onCheckedChange={() => toggleBranch(branch)}
                                                    >
                                                        {branch}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Custom Branch Input + Chips */}
                                <div className="space-y-2">
                                    <Label>Custom Branch / Tags</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={customBranchInput}
                                            onChange={e => setCustomBranchInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); addCustomBranch(); } }}
                                            placeholder="Type custom branch & enter..."
                                        />
                                        <Button type="button" size="sm" variant="secondary" onClick={addCustomBranch}>Add</Button>
                                    </div>
                                </div>

                                {newSubjectBranches.length > 0 && (
                                    <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-md border border-dashed border-slate-200">
                                        {newSubjectBranches.map(b => (
                                            <Badge key={b} variant="secondary" className="text-xs font-normal">
                                                {b}
                                                <span role="button" className="ml-1 cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeBranch(b); }}>
                                                    <X className="h-3 w-3" />
                                                </span>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Class Sections (comma separated)</Label>
                                    <Input
                                        value={newSubjectSections}
                                        onChange={e => setNewSubjectSections(e.target.value)}
                                        placeholder="e.g. A, B, C or None"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateSubject}>Create Subject</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Subject Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Subject Name</Label>
                            <Input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Semester</Label>
                                <Select value={editSemester} onValueChange={setEditSemester}>
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
                                            Add Branch
                                            <Filter className="h-3 w-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56">
                                        <DropdownMenuLabel>Select Common</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {AVAILABLE_BRANCHES.map((branch) => (
                                            <DropdownMenuCheckboxItem
                                                key={branch}
                                                checked={editBranches.includes(branch)}
                                                onCheckedChange={() => toggleBranch(branch, true)}
                                            >
                                                {branch}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Edit Custom Branch Input + Chips */}
                        <div className="space-y-2">
                            <Label>Custom Branch / Tags</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={editCustomBranchInput}
                                    onChange={e => setEditCustomBranchInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); addEditCustomBranch(); } }}
                                    placeholder="Type custom branch & enter..."
                                />
                                <Button type="button" size="sm" variant="secondary" onClick={addEditCustomBranch}>Add</Button>
                            </div>
                        </div>

                        {editBranches.length > 0 && (
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-md border border-dashed border-slate-200">
                                {editBranches.map(b => (
                                    <Badge key={b} variant="secondary" className="text-xs font-normal">
                                        {b}
                                        <span role="button" className="ml-1 cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeBranch(b, true); }}>
                                            <X className="h-3 w-3" />
                                        </span>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Class Sections</Label>
                            <Input
                                value={editSections}
                                onChange={e => setEditSections(e.target.value)}
                                placeholder="A, B, C"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateSubject}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        type="search"
                        placeholder="Search subjects..."
                        className="pl-9 bg-white"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger className="w-[140px] bg-white">
                        <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <SelectItem key={i} value={i.toString()}>Semester {i}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSubjects.map((subject, idx) => (
                    <motion.div
                        key={subject._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                        <Card className="bg-white shadow-sm hover:shadow-md transition-all h-full flex flex-col group">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1 w-full relative">
                                        <CardTitle className="text-lg flex items-center gap-2 pr-6">
                                            <BookOpen className="h-5 w-5 text-indigo-600 shrink-0" />
                                            <span className="truncate">{subject.name}</span>
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute -top-1 -right-1 h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => openEditModal(subject)}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            <Badge variant="outline" className="font-normal text-xs">{subject.semester ? `Sem ${subject.semester}` : 'No Sem'}</Badge>
                                            {(subject.branches || []).map((b: string) => (
                                                <Badge key={b} variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-600">{b}</Badge>
                                            ))}
                                            {/* Legacy support for singular branch */}
                                            {subject.branch && !subject.branches?.length && (
                                                <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-600">{subject.branch}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <div className="text-sm text-slate-500 font-medium">
                                    {subject.syllabus?.length || 0} Units Configured
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {(subject.syllabus || []).reduce((acc: number, unit: any) => acc + (unit.topics?.length || 0), 0)} Topics Total
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2 border-t bg-slate-50/50 flex justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-slate-200"
                                    onClick={() => confirmDeleteSubject(subject._id, subject.name)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => router.push(`/professor/curriculum/${subject._id}`)}
                                >
                                    <Edit className="h-4 w-4 mr-1" /> Edit Syllabus
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}

                {subjects.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No Subjects Yet</h3>
                        <p className="text-slate-500 max-w-sm text-center mb-6">
                            Create your first subject to start defining the curriculum and tracking topics.
                        </p>
                        <Button onClick={() => setIsAddOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Create Subject
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description={confirmDesc}
                onConfirm={confirmAction}
                variant="destructive"
            />

            <SyllabusImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onImportSuccess={handleImportSuccess}
            />
        </PageTransition>
    )
}
