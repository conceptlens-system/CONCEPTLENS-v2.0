"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, Suspense, useRef } from "react"
import { toast } from "sonner"
import { fetchSubjects, createExam, fetchClasses, generateExam } from "@/lib/api"
import { Plus, Trash2, Users, Upload, Copy, HelpCircle, Check, ChevronLeft, Search, ChevronsUpDown, X, Sparkles } from "lucide-react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const formatExample = `*** COPY THIS PROMPT TO AI ***
You are an Exam Question Generator. Generate questions in this EXACT format:

Q: [Question Text]
A: [Option A]
B: [Option B]
C: [Option C]
D: [Option D]
Correct: [Correct Option Letter or Answer Text]
Type: [mcq | short_answer | true_false | one_word]

--- EXAMPLES ---

Q: What is the capital of France?
A: Berlin
B: Madrid
C: Paris
D: Rome
Correct: C
Type: mcq

Q: Photosynthesis requires sunlight.
Correct: True
Type: true_false

Q: What is the chemical symbol for Gold?
Correct: Au
Type: one_word

Q: Explain the concept of inertia.
Correct: Objects in motion stay in motion unless acted upon by a force.
Type: short_answer`

function CreateExamContent() {
    const { data: session } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const preSelectedClassId = searchParams.get("classId")

    const [subjects, setSubjects] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    // Exam State
    const [title, setTitle] = useState("")
    const [selectedSubject, setSelectedSubject] = useState("")
    const [selectedClasses, setSelectedClasses] = useState<string[]>([])
    const [duration, setDuration] = useState("60")
    const [isCustomDuration, setIsCustomDuration] = useState(false)
    const [durationUnit, setDurationUnit] = useState<"min" | "hour">("min")
    const [subjectListVisible, setSubjectListVisible] = useState(false)
    const [classListVisible, setClassListVisible] = useState(false)
    const [startTime, setStartTime] = useState<Date | undefined>(undefined)
    const [accessEndTime, setAccessEndTime] = useState<Date | undefined>(undefined)
    const [questions, setQuestions] = useState<any[]>([])
    const [isReviewMode, setIsReviewMode] = useState(false)

    // Search States
    const [subjectOpen, setSubjectOpen] = useState(false)
    const [subjectSearch, setSubjectSearch] = useState("")
    const [classSearch, setClassSearch] = useState("")

    const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
    const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()))

    // AI Generation State
    const [aiMode, setAiMode] = useState("manual")
    const [aiQuestionCount, setAiQuestionCount] = useState([10])
    const [aiDifficulty, setAiDifficulty] = useState("Medium")
    const [aiGenerating, setAiGenerating] = useState(false)

    const handleAiGenerate = async () => {
        if (!selectedSubject) {
            toast.error("Please select a subject first")
            return
        }

        setAiGenerating(true)
        try {
            const token = (session?.user as any)?.accessToken
            const generated = await generateExam(
                selectedSubject,
                aiQuestionCount[0],
                aiDifficulty,
                token
            )

            // Map generated questions to editor format
            const mapping = generated.map((q: any) => ({
                id: q.id || `ai_${Date.now()}_${Math.random()}`,
                text: q.text,
                type: q.type, // types now match: mcq, true_false, short_answer, one_word
                options: q.options || [],
                correct_answer: q.correct_answer || "",
                marks: q.marks || 1,
                explanation: q.explanation
            }))

            setQuestions([...questions, ...mapping])
            setAiMode("manual") // Switch back to editor
            setShouldScroll(true)
            toast.success(`Generated ${mapping.length} questions!`)
        } catch (e: any) {
            console.error(e)
            toast.error("AI Generation Failed: " + (e.message || "Unknown error"))
        } finally {
            setAiGenerating(false)
        }
    }

    // Anti-Cheat State
    // Anti-Cheat State
    interface AntiCheatConfig {
        fullscreen: boolean;
        tab_switch: boolean;
        copy_paste: boolean;
        right_click: boolean;
        [key: string]: boolean;
    }

    const [antiCheatConfig, setAntiCheatConfig] = useState<AntiCheatConfig>({
        fullscreen: true,
        tab_switch: true,
        copy_paste: true,
        right_click: true
    })

    const [draftId, setDraftId] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, boolean>>({})

    const DURATION_PRESETS = [
        { label: "30m", value: 30 },
        { label: "45m", value: 45 },
        { label: "1h", value: 60 },
    ]

    useEffect(() => {
        const fetchData = async () => {
            if (session?.user) {
                const token = (session.user as any).accessToken
                try {
                    const [subData, clsData] = await Promise.all([
                        fetchSubjects(token),
                        fetchClasses(token)
                    ])
                    setSubjects(subData || [])
                    setClasses(clsData || [])
                    if (preSelectedClassId) {
                        setSelectedClasses([preSelectedClassId])
                    }
                } catch (error) {
                    toast.error("Failed to load data")
                    console.error(error)
                }
            }
        }
        fetchData()
    }, [session, preSelectedClassId])

    // Load Draft from LocalStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const id = params.get("draftId")
        const savedDraftsStr = localStorage.getItem("examDrafts")

        let foundDraft: any = null

        if (savedDraftsStr) {
            try {
                const drafts = JSON.parse(savedDraftsStr)
                if (id) {
                    foundDraft = drafts.find((d: any) => d.id === id)
                }
            } catch (e) {
                console.error("Failed to parse drafts", e)
            }
        }

        if (foundDraft) {
            setDraftId(foundDraft.id)
            if (foundDraft.title) setTitle(foundDraft.title)
            if (foundDraft.subjectId) setSelectedSubject(foundDraft.subjectId)
            if (foundDraft.selectedClasses) setSelectedClasses(foundDraft.selectedClasses)
            if (foundDraft.duration) setDuration(foundDraft.duration)
            if (foundDraft.antiCheat) setAntiCheatConfig(foundDraft.antiCheat)

            if (foundDraft.questions && Array.isArray(foundDraft.questions)) {
                // Schema Migration: Ensure all fields exist
                const migratedQuestions = foundDraft.questions.map((q: any) => ({
                    ...q,
                    topic_id: q.topic_id || "general",
                    marks: typeof q.marks === 'number' ? q.marks : 1,
                    options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
                    type: q.type || "mcq",
                    correct_answer: q.correct_answer || ""
                }))
                setQuestions(migratedQuestions)
            }
            if (foundDraft.startTime) setStartTime(new Date(foundDraft.startTime))
            if (foundDraft.accessEndTime) setAccessEndTime(new Date(foundDraft.accessEndTime))
            toast.info("Restored saved draft")
        } else if (!id) {
            // Initialize new draft ID if creating new
            const newId = crypto.randomUUID()
            setDraftId(newId)
            // Update URL without reload so we stay on this draft
            window.history.replaceState(null, "", `/professor/exams/create?draftId=${newId}`)
        }

        setIsLoaded(true)
    }, [])

    // Auto-Save Draft
    useEffect(() => {
        if (!isLoaded || !draftId) return

        const currentData = {
            id: draftId,
            title,
            subjectId: selectedSubject,
            selectedClasses,
            duration,
            questions,
            antiCheat: antiCheatConfig,
            startTime: startTime ? startTime.toISOString() : null,
            accessEndTime: accessEndTime ? accessEndTime.toISOString() : null,
            lastModified: Date.now()
        }

        const draftsStr = localStorage.getItem("examDrafts")
        let drafts = []
        try {
            drafts = draftsStr ? JSON.parse(draftsStr) : []
        } catch (e) { drafts = [] }

        // Remove existing version of this draft if exists
        const otherDrafts = drafts.filter((d: any) => d.id !== draftId)

        // Add updated version to START of array
        otherDrafts.unshift(currentData)

        // Save back
        localStorage.setItem("examDrafts", JSON.stringify(otherDrafts))

    }, [isLoaded, draftId, title, selectedSubject, selectedClasses, duration, questions, startTime, accessEndTime, antiCheatConfig])

    const handleDurationPreset = (value: number) => {
        setDuration(value.toString())
        setIsCustomDuration(false)
    }

    // Auto-scroll to new question
    const questionListRef = useRef<HTMLDivElement>(null)
    const [shouldScroll, setShouldScroll] = useState(false)

    useEffect(() => {
        if (shouldScroll && questionListRef.current) {
            const container = questionListRef.current
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
            })
            setShouldScroll(false)
        }
    }, [questions.length, shouldScroll])

    const addQuestion = () => {
        setQuestions([...questions, {
            id: `q${questions.length + 1}`,
            text: "",
            type: "mcq",
            options: ["", "", "", ""],
            correct_answer: "",
            marks: 1,
            topic_id: "general"
        }])
        setShouldScroll(true)
    }

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQ = [...questions]
        newQ[index] = { ...newQ[index], [field]: value }
        setQuestions(newQ)
    }

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQ = [...questions]
        newQ[qIndex].options[optIndex] = value
        setQuestions(newQ)
    }

    const renderQuestionOptions = (q: any, idx: number) => {
        if (q.type === 'mcq') {
            return (
                <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="flex gap-2 items-center group/opt">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="radio"
                                        name={`q_${idx}_correct`}
                                        checked={q.correct_answer === opt && opt !== ""}
                                        onChange={() => updateQuestion(idx, 'correct_answer', opt)}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 transition-all checked:border-emerald-500 checked:bg-emerald-500"
                                    />
                                    <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                                </div>
                                <Input
                                    placeholder={`Option ${oIdx + 1}`}
                                    value={opt}
                                    onChange={e => updateOption(idx, oIdx, e.target.value)}
                                    className={`bg-white ${q.correct_answer === opt && opt !== "" ? "border-emerald-500 ring-1 ring-emerald-500" : ""}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        if (q.type === 'true_false') {
            return (
                <div className="flex gap-4 pt-2">
                    {["True", "False"].map(val => (
                        <Button
                            key={val}
                            type="button"
                            variant={q.correct_answer === val ? "default" : "outline"}
                            onClick={() => updateQuestion(idx, 'correct_answer', val)}
                            className={q.correct_answer === val ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        >
                            {val}
                        </Button>
                    ))}
                </div>
            )
        }

        if (q.type === 'short_answer' || q.type === 'one_word') {
            return (
                <div className="pt-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Expected Answer Key</Label>
                    <Input
                        placeholder="Enter the expected answer for auto-grading..."
                        value={q.correct_answer}
                        onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                        className="bg-emerald-50/50 border-emerald-200 focus-visible:ring-emerald-500"
                    />
                </div>
            )
        }
        return null
    }

    const toggleClass = (classId: string) => {
        if (selectedClasses.includes(classId)) {
            setSelectedClasses(selectedClasses.filter(id => id !== classId))
        } else {
            setSelectedClasses([...selectedClasses, classId])
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(formatExample)
        toast.success("Format copied to clipboard!")
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            if (!text) return

            // Parse Logic
            const blocks = text.split(/\n\s*\n/) // Split by empty lines
            const parsedQuestions: any[] = []

            blocks.forEach((block, idx) => {
                const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
                if (lines.length === 0) return

                const qTextLine = lines.find(l => l.startsWith("Q:"))
                if (!qTextLine) return

                const questionText = qTextLine.substring(2).trim()
                const options: string[] = ["", "", "", ""]
                let correctAnswer = ""
                let type = "short_answer" // Default

                // Check for Options
                const optA = lines.find(l => l.startsWith("A:"))
                const optB = lines.find(l => l.startsWith("B:"))
                const optC = lines.find(l => l.startsWith("C:"))
                const optD = lines.find(l => l.startsWith("D:"))

                if (optA || optB || optC || optD) {
                    type = "mcq"
                    if (optA) options[0] = optA.substring(2).trim()
                    if (optB) options[1] = optB.substring(2).trim()
                    if (optC) options[2] = optC.substring(2).trim()
                    if (optD) options[3] = optD.substring(2).trim()
                }

                // Check for Correct Answer
                const correctLine = lines.find(l => l.startsWith("Correct:"))
                if (correctLine) {
                    const val = correctLine.substring(8).trim()
                    // If MCQ, map A/B/C/D to full string value
                    if (type === "mcq") {
                        if (val === 'A') correctAnswer = options[0]
                        else if (val === 'B') correctAnswer = options[1]
                        else if (val === 'C') correctAnswer = options[2]
                        else if (val === 'D') correctAnswer = options[3]
                        else correctAnswer = val // raw value
                    } else {
                        correctAnswer = val
                    }
                }

                // Check for Explicit Type
                const typeLine = lines.find(l => l.startsWith("Type:"))
                if (typeLine) {
                    const tVal = typeLine.substring(5).trim().toLowerCase()
                    if (["mcq", "short_answer", "true_false", "one_word"].includes(tVal)) {
                        type = tVal
                    }
                }

                parsedQuestions.push({
                    id: `import_${Date.now()}_${idx}`,
                    text: questionText,
                    type,
                    options,
                    correct_answer: correctAnswer,
                    marks: 1, // Default
                    topic_id: "general"
                })
            })

            if (parsedQuestions.length > 0) {
                setQuestions([...questions, ...parsedQuestions])
                toast.success(`Imported ${parsedQuestions.length} questions!`)
            } else {
                toast.error("No valid questions found in file.")
            }
        }
        reader.readAsText(file) // fixed syntax error here
        e.target.value = ""
    }

    const handleSubmit = async () => {
        const newErrors: Record<string, boolean> = {}
        let firstError = ""

        if (!title) { newErrors.title = true; if (!firstError) firstError = "field-title" }
        if (!selectedSubject) { newErrors.subject = true; if (!firstError) firstError = "field-subject" }
        if (!startTime) { newErrors.startTime = true; if (!firstError) firstError = "field-start-time" }
        if (!accessEndTime) { newErrors.accessEndTime = true; if (!firstError) firstError = "field-end-time" }
        if (selectedClasses.length === 0) { newErrors.classes = true; if (!firstError) firstError = "field-classes" }

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please fill in all required fields marked in red.")

            if (firstError) {
                const el = document.getElementById(firstError)
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" })
                    // Add a temporary highlight effect class
                    el.classList.add("ring-2", "ring-red-500", "ring-offset-2")
                    setTimeout(() => {
                        el.classList.remove("ring-2", "ring-red-500", "ring-offset-2")
                    }, 2500)
                }
            }
            return
        }

        if (startTime && accessEndTime && startTime >= accessEndTime) {
            toast.error("Access End Time must be after Start Time")
            newErrors.accessEndTime = true
            setErrors(newErrors)
            const el = document.getElementById("field-end-time")
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
            return
        }

        setLoading(true)
        try {
            const token = (session?.user as any)?.accessToken
            const payload = {
                title,
                subject_id: selectedSubject,
                professor_id: (session?.user as any)?.id || "prof_1",
                duration_minutes: parseInt(duration),
                schedule_start: startTime!.toISOString(),
                exam_access_end_time: accessEndTime!.toISOString(),
                questions,
                class_ids: selectedClasses,
                anti_cheat_config: antiCheatConfig
            }

            console.log("Submitting Exam Payload:", JSON.stringify(payload).length, "bytes")

            const res = await createExam(payload, token)

            // createExam throws if failed, so if we get here, it succeeded
            // The response is the created exam object

            toast.success("Exam Created Successfully")
            // Cleanup draft
            const draftsStr = localStorage.getItem("examDrafts")
            if (draftsStr && draftId) {
                try {
                    const drafts = JSON.parse(draftsStr)
                    const filtered = drafts.filter((d: any) => d.id !== draftId)
                    localStorage.setItem("examDrafts", JSON.stringify(filtered))
                } catch (e) { }
            }

            router.push("/professor/exams")
        } catch (e: any) {
            toast.error("Failed to create exam: " + (e.message || "Unknown error"))
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    )

    if (isReviewMode) {
        return (
            <div className="max-w-[1000px] mx-auto pb-12 space-y-6">
                <div className="flex justify-between items-center sticky top-0 z-10 bg-white/50 backdrop-blur-lg py-4 border-b">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsReviewMode(false)}
                            className="pl-0 hover:bg-transparent hover:text-slate-900 -ml-2 mb-1 text-slate-500"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Edit
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">Review Exam</h1>
                        <p className="text-slate-500">Verify all questions and answers before saving.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsReviewMode(false)}>Back to Edit</Button>
                        <Button className="bg-slate-900 text-white min-w-[140px]" onClick={handleSubmit}>
                            Create Exam
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <Card key={idx} id={`review-q-${idx}`} className="group hover:border-slate-400 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-lg text-slate-900">{q.text || <span className="text-slate-400 italic">No question text</span>}</div>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{q.type.replace('_', ' ')}</span>
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{q.marks} Marks</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsReviewMode(false)
                                            // Wait for render then scroll
                                            setTimeout(() => {
                                                const el = document.getElementById(`question-card-${idx}`)
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                            }, 100)
                                        }}
                                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {q.type === 'mcq' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {q.options.map((opt: string, i: number) => (
                                            <div key={i} className={cn(
                                                "p-3 rounded-lg border text-sm",
                                                q.correct_answer === opt && opt !== ""
                                                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-medium"
                                                    : "bg-white border-slate-200 text-slate-600"
                                            )}>
                                                <span className="mr-2 font-bold opacity-60">{String.fromCharCode(65 + i)}.</span>
                                                {opt}
                                                {q.correct_answer === opt && opt !== "" && <Check className="h-4 w-4 inline-block ml-2 text-emerald-600" />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                                        <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Correct Answer</p>
                                        <p className="text-emerald-900 font-medium">{q.correct_answer || <span className="italic opacity-50">Not specified</span>}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex justify-end gap-4 py-8 border-t">
                        <Button variant="outline" size="lg" onClick={() => setIsReviewMode(false)}>Back to Edit</Button>
                        <Button className="bg-slate-900 text-white min-w-[200px]" size="lg" onClick={handleSubmit}>
                            Create Exam
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-12 space-y-6">
            <div className="flex justify-between items-center sticky top-0 z-10 bg-white/50 backdrop-blur-lg py-4 border-b">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="pl-0 hover:bg-transparent hover:text-slate-900 -ml-2 mb-1 text-slate-500"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Exams
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Create New Exam</h1>
                    <p className="text-slate-500">Configure exam details and add questions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 items-start">
                {/* LEFT SIDEBAR - SETTINGS */}
                <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-24">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Exam Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    id="field-title"
                                    placeholder="e.g. Mid-Term Physics"
                                    value={title}
                                    onChange={e => {
                                        setTitle(e.target.value)
                                        if (errors.title) setErrors({ ...errors, title: false })
                                    }}
                                    className={cn(errors.title && "border-red-500 ring-red-500 focus-visible:ring-red-500")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 z-10" />
                                    <div id="field-subject">
                                        <Input
                                            placeholder="Search subject..."
                                            className={cn("pl-9 h-9", errors.subject && "border-red-500 ring-red-500 focus-visible:ring-red-500")}
                                            value={subjectSearch}
                                            onChange={(e) => {
                                                setSubjectSearch(e.target.value)
                                                setSubjectListVisible(true)
                                                if (errors.subject) setErrors({ ...errors, subject: false })
                                            }}
                                            onFocus={() => setSubjectListVisible(true)}
                                            onBlur={() => setTimeout(() => setSubjectListVisible(false), 200)}
                                        />
                                    </div>
                                    {subjectListVisible && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                            {filteredSubjects.length === 0 ? (
                                                <div className="text-xs text-slate-500 text-center py-3">No subjects match.</div>
                                            ) : (
                                                filteredSubjects.map((subject) => (
                                                    <div
                                                        key={subject._id}
                                                        className={cn(
                                                            "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none transition-colors",
                                                            selectedSubject === subject._id
                                                                ? "bg-slate-100 text-slate-900 font-medium"
                                                                : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                                                        )}
                                                        onClick={() => {
                                                            setSelectedSubject(subject._id)
                                                            setSubjectSearch(subject.name)
                                                            setSubjectListVisible(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4 text-emerald-600",
                                                                selectedSubject === subject._id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {subject.name}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Duration</Label>
                                <Select value={isCustomDuration ? "custom" : duration} onValueChange={(val) => {
                                    if (val === "custom") setIsCustomDuration(true)
                                    else handleDurationPreset(parseInt(val))
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DURATION_PRESETS.map(p => (
                                            <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                                        ))}
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isCustomDuration && (
                                    <div className="flex gap-2 pt-2">
                                        <Input
                                            type="number"
                                            placeholder="Duration"
                                            value={durationUnit === 'hour' ? (parseInt(duration) / 60) : duration}
                                            step={durationUnit === 'hour' ? 0.25 : 15}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value)
                                                if (durationUnit === 'hour') {
                                                    setDuration((val * 60).toString())
                                                } else {
                                                    setDuration(val.toString())
                                                }
                                            }}
                                        />
                                        <Select value={durationUnit} onValueChange={(val: "min" | "hour") => setDurationUnit(val)}>
                                            <SelectTrigger className="w-[110px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="min">Minutes</SelectItem>
                                                <SelectItem value="hour">Hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Schedule</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 uppercase font-semibold">Start Time</Label>
                                <Input
                                    id="field-start-time"
                                    type="datetime-local"
                                    className={cn(errors.startTime && "border-red-500 ring-red-500 focus-visible:ring-red-500")}
                                    value={startTime ? new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                                    onChange={(e) => {
                                        setStartTime(e.target.value ? new Date(e.target.value) : undefined)
                                        if (errors.startTime) setErrors({ ...errors, startTime: false })
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 uppercase font-semibold">Access Ends</Label>
                                <Input
                                    id="field-end-time"
                                    type="datetime-local"
                                    className={cn(errors.accessEndTime && "border-red-500 ring-red-500 focus-visible:ring-red-500")}
                                    value={accessEndTime ? new Date(accessEndTime.getTime() - (accessEndTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                                    onChange={(e) => {
                                        setAccessEndTime(e.target.value ? new Date(e.target.value) : undefined)
                                        if (errors.accessEndTime) setErrors({ ...errors, accessEndTime: false })
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Classes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Selected Classes Chips */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedClasses.length === 0 && (
                                        <span className="text-sm text-slate-400 italic">No classes selected</span>
                                    )}
                                    {classes.filter(c => selectedClasses.includes(c._id)).map(cls => (
                                        <div key={cls._id} className="bg-slate-100 border border-slate-200 text-slate-900 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                            {cls.name}
                                            <button onClick={() => toggleClass(cls._id)} className="hover:text-red-500 focus:outline-none">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Search Input & Floating List */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 z-10" />
                                    <div id="field-classes">
                                        <Input
                                            placeholder="Search to add classes..."
                                            className={cn("pl-9 h-9", errors.classes && "border-red-500 ring-red-500 focus-visible:ring-red-500")}
                                            value={classSearch}
                                            onChange={(e) => {
                                                setClassSearch(e.target.value)
                                                setClassListVisible(true)
                                                if (errors.classes) setErrors({ ...errors, classes: false })
                                            }}
                                            onFocus={() => setClassListVisible(true)}
                                            onBlur={() => setTimeout(() => setClassListVisible(false), 200)}
                                        />
                                    </div>
                                    {classListVisible && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                            {filteredClasses.length === 0 ? (
                                                <div className="text-xs text-slate-500 text-center py-3">No classes match.</div>
                                            ) : (
                                                filteredClasses.map((cls) => (
                                                    <div
                                                        key={cls._id}
                                                        className={cn(
                                                            "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none transition-colors",
                                                            selectedClasses.includes(cls._id)
                                                                ? "bg-blue-50 text-blue-900 font-medium"
                                                                : "hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                                                        )}
                                                        onClick={() => {
                                                            toggleClass(cls._id)
                                                            // Keep list open for multi-select convenience
                                                            // setClassListVisible(false) 
                                                        }}
                                                    >
                                                        <div className={cn(
                                                            "mr-2 h-4 w-4 border rounded flex items-center justify-center transition-colors",
                                                            selectedClasses.includes(cls._id) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                                                        )}>
                                                            {selectedClasses.includes(cls._id) && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="truncate">{cls.name}</div>
                                                            <div className="text-[10px] text-slate-400 truncate leading-tight">{cls.class_code}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Anti-Cheat</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {[
                                { id: 'fullscreen', label: 'Fullscreen', desc: 'Require fullscreen' },
                                { id: 'tab_switch', label: 'Tab Monitor', desc: 'Log tab switching' },
                                { id: 'copy_paste', label: 'No Copy/Paste', desc: 'Disable clipboard' },
                                { id: 'right_click', label: 'No Right-Click', desc: 'Disable context menu' }
                            ].map((option) => (
                                <div
                                    key={option.id}
                                    className={`
                                        flex items-center space-x-3 p-2 rounded-md border cursor-pointer transition-all
                                        ${(antiCheatConfig as any)[option.id]
                                            ? 'bg-emerald-50 border-emerald-500'
                                            : 'bg-white border-slate-200 hover:border-slate-300'}
                                    `}
                                    onClick={() => setAntiCheatConfig(prev => ({ ...prev, [option.id]: !(prev as any)[option.id] }))}
                                >
                                    <div className={`
                                        h-4 w-4 rounded border flex items-center justify-center transition-colors
                                        ${(antiCheatConfig as any)[option.id] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}
                                    `}>
                                        {(antiCheatConfig as any)[option.id] && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                        <Label className="cursor-pointer font-medium text-slate-900 text-sm block">
                                            {option.label}
                                        </Label>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT MAIN - QUESTIONS */}
                <div className="col-span-12 lg:col-span-8 xl:col-span-9">
                    <Tabs value={aiMode} onValueChange={setAiMode} className="space-y-6">
                        <TabsList className="bg-white border p-1 rounded-xl w-fit inline-flex h-auto shadow-sm">
                            <TabsTrigger value="manual" className="px-6 py-3 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 font-medium transition-all flex items-center justify-center">
                                <span className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">M</div>
                                    Manual Editor
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="ai" className="px-6 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 font-medium transition-all flex items-center justify-center">
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    AI Auto-Generate
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="manual" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                                        {questions.length}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Questions</h2>
                                        <p className="text-sm text-slate-500">Total Marks: {questions.reduce((acc, q) => acc + (q.marks || 0), 0)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                                <Sparkles className="h-4 w-4" /> AI Prompt Guide
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                                            <DialogHeader className="p-6 pb-2">
                                                <DialogTitle className="flex items-center gap-2">
                                                    <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                        <Sparkles className="h-4 w-4" />
                                                    </span>
                                                    AI Generation Prompt
                                                </DialogTitle>
                                                <DialogDescription className="text-base">
                                                    Copy this formatting prompt and paste it into ChatGPT, Claude, or Gemini to generate questions instantly.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="flex-1 overflow-y-auto p-6 pt-2">
                                                <div className="relative group">
                                                    <div className="absolute right-2 top-2 opacity-100 transition-opacity">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="h-8 bg-white/10 text-white hover:bg-white/20 border-white/20 shadow-none backdrop-blur-sm"
                                                            onClick={copyToClipboard}
                                                        >
                                                            <Copy className="mr-2 h-3.5 w-3.5" /> Copy Prompt
                                                        </Button>
                                                    </div>
                                                    <div className="bg-slate-950 text-slate-300 p-6 rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner">
                                                        {formatExample}
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex gap-4 text-sm text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        Supports MCQ, True/False, Short Answer
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        Auto-detects correct answers
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                                                <Button onClick={copyToClipboard} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                    <Copy className="mr-2 h-4 w-4" /> Copy Prompt to Clipboard
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>

                            {/* Question List */}
                            {/* Question List */}
                            <div
                                className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                                ref={questionListRef}
                            >
                                {questions.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <HelpCircle className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">No questions added yet</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mb-6">Start by adding questions manually, importing a text file, or use AI generation.</p>
                                        <div className="flex justify-center gap-3">
                                            <Button onClick={() => setAiMode("ai")} variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                <Sparkles className="h-4 w-4" /> Try AI Generator
                                            </Button>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".txt"
                                                    onChange={handleFileUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                                <Button variant="outline" className="gap-2">
                                                    <Upload className="h-4 w-4" /> Import .txt
                                                </Button>
                                            </div>
                                            <Button onClick={addQuestion} className="gap-2">
                                                <Plus className="h-4 w-4" /> Add Manually
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    questions.map((q, idx) => (
                                        <Card key={idx} id={`question-card-${idx}`} className={cn(
                                            "group transition-all duration-200 border-slate-200 shadow-sm hover:shadow-md",
                                        )}>
                                            <CardHeader className="pb-3 pt-4 px-4">
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm border">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <select
                                                                    className="h-7 text-xs bg-slate-50 border-slate-200 rounded px-2 outline-none focus:border-indigo-500 transition-colors"
                                                                    value={q.type}
                                                                    onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                                                                >
                                                                    <option value="mcq">Multiple Choice</option>
                                                                    <option value="short_answer">Short Answer</option>
                                                                    <option value="true_false">True / False</option>
                                                                    <option value="one_word">One Word</option>
                                                                </select>

                                                                <div className="flex items-center relative">
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">PTS</span>
                                                                    <input
                                                                        type="number"
                                                                        className="h-7 w-16 text-xs bg-slate-50 border-slate-200 rounded pl-2 pr-6 outline-none focus:border-indigo-500 transition-colors"
                                                                        value={q.marks}
                                                                        onChange={(e) => updateQuestion(idx, 'marks', parseInt(e.target.value) || 1)}
                                                                        min={1}
                                                                    />
                                                                </div>

                                                                {/* Topic Selector */}
                                                                <div className="w-[180px]">
                                                                    {subjects.find(s => s._id === selectedSubject)?.syllabus?.length > 0 ? (
                                                                        <Select value={q.topic_id} onValueChange={(val) => updateQuestion(idx, 'topic_id', val)}>
                                                                            <SelectTrigger className="h-7 text-xs bg-white border-slate-200">
                                                                                <SelectValue placeholder="Select Topic" />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="max-h-[300px]">
                                                                                {subjects.find(s => s._id === selectedSubject)?.syllabus.map((unit: any, uIdx: number) => (
                                                                                    <SelectGroup key={uIdx}>
                                                                                        <SelectLabel className="pl-2 py-1 text-xs font-bold text-slate-900 bg-slate-100 sticky top-0">
                                                                                            Unit {unit.unit}: {unit.title || `Unit ${unit.unit}`}
                                                                                        </SelectLabel>
                                                                                        {unit.topics.map((topic: string, tIdx: number) => (
                                                                                            <SelectItem key={`${uIdx}-${tIdx}`} value={topic} className="text-xs">
                                                                                                {topic}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectGroup>
                                                                                ))}
                                                                                <SelectGroup>
                                                                                    <SelectLabel className="pl-2 py-1 text-xs font-bold text-slate-900 bg-slate-100 sticky top-0">Other</SelectLabel>
                                                                                    <SelectItem value="general" className="text-xs">General</SelectItem>
                                                                                </SelectGroup>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    ) : (
                                                                        <Input
                                                                            placeholder={selectedSubject ? "Topic..." : "Subject first..."}
                                                                            value={q.topic_id}
                                                                            onChange={e => updateQuestion(idx, 'topic_id', e.target.value)}
                                                                            className="h-7 text-xs bg-white"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const newQ = [...questions];
                                                                newQ.splice(idx, 1);
                                                                setQuestions(newQ);
                                                            }}
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4 space-y-3">
                                                <Textarea
                                                    placeholder="Enter question text..."
                                                    className="resize-none min-h-[60px] text-base border-slate-200 focus-visible:ring-indigo-500"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                                />
                                                {/* Render Options based on Type */}
                                                {renderQuestionOptions(q, idx)}
                                            </CardContent>
                                        </Card>
                                    )))}
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t bg-white z-10 w-full">
                                <Button
                                    variant="outline"
                                    className="py-6 border-dashed border-2 border-slate-300 hover:border-indigo-500 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all"
                                    onClick={addQuestion}
                                >
                                    <Plus className="mr-2 h-5 w-5" /> Add New Question
                                </Button>
                                <Button
                                    variant="outline"
                                    className="py-6 border-2 border-slate-900 text-slate-900 hover:bg-slate-100 transition-all font-bold text-lg"
                                    onClick={() => {
                                        if (questions.length === 0) {
                                            toast.error("Add at least one question to review")
                                            return
                                        }
                                        setIsReviewMode(true)
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                    }}
                                >
                                    <Check className="mr-2 h-5 w-5" /> Review Exam
                                </Button>
                                <Button
                                    className="py-6 bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold text-lg shadow-lg"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? "Creating..." : "Create Exam"}
                                </Button>
                            </div>


                        </TabsContent>

                        <TabsContent value="ai" className="mt-0">
                            <Card className="border-indigo-100 shadow-sm overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                <CardHeader className="bg-gradient-to-b from-indigo-50/50 to-white pb-6 pt-8">
                                    <div className="mx-auto h-16 w-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 text-indigo-600 border border-indigo-100">
                                        <Sparkles className="h-8 w-8" />
                                    </div>
                                    <CardTitle className="text-center text-xl text-slate-900">AI Exam Generator</CardTitle>
                                    <CardDescription className="text-center max-w-md mx-auto">
                                        Automatically generate extensive exams based on your syllabus. Select your preferences and let our AI do the heavy lifting.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 max-w-2xl mx-auto space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-base">Subject</Label>
                                        <div className="p-4 rounded-xl border bg-slate-50 flex items-center justify-between">
                                            {selectedSubject ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {subjects.find(s => s._id === selectedSubject)?.name || "Unknown Subject"}
                                                        </div>
                                                        <div className="text-xs text-slate-500">Syllabus Loaded</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 opacity-50">
                                                    <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">No Subject Selected</div>
                                                        <div className="text-xs text-slate-500">Select a subject on the left</div>
                                                    </div>
                                                </div>
                                            )}
                                            {!selectedSubject && (
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    const el = document.getElementById("field-subject")
                                                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                                                }}>
                                                    Select Subject
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label>Question Count</Label>
                                            <div className="flex items-center gap-4">
                                                <Input
                                                    type="number"
                                                    value={aiQuestionCount[0]}
                                                    onChange={e => setAiQuestionCount([parseInt(e.target.value) || 0])}
                                                    min={1}
                                                    max={100}
                                                    className="h-12 text-lg font-medium text-center"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500">Recommended: 10-50 questions</p>
                                        </div>
                                        <div className="space-y-3">
                                            <Label>Difficulty</Label>
                                            <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Easy">Easy</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="Hard">Hard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200"
                                            onClick={handleAiGenerate}
                                            disabled={aiGenerating || !selectedSubject}
                                        >
                                            {aiGenerating ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Generating Exam...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-5 w-5" />
                                                    Generate {aiQuestionCount[0]} Questions
                                                </>
                                            )}
                                        </Button>
                                        <div className="text-center mt-3 text-xs text-slate-400">
                                            AI-generated content should be reviewed for accuracy.
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs >
                </div >
            </div >
        </div >
    )
}

export default function CreateExamPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateExamContent />
        </Suspense>
    )
}
