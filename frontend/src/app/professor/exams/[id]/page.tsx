"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { fetchSubjects, fetchExam, updateExam, fetchClasses } from "@/lib/api"
import { Plus, Trash2, Users, Upload, Copy, HelpCircle, Check, ChevronLeft, Search, ChevronsUpDown, X, Sparkles } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

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

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session } = useSession()
    const router = useRouter()

    const [examId, setExamId] = useState<string>("")
    const [subjects, setSubjects] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Search States
    const [subjectOpen, setSubjectOpen] = useState(false)
    const [subjectSearch, setSubjectSearch] = useState("")
    const [classSearch, setClassSearch] = useState("")

    const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
    const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()))

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

    const [errors, setErrors] = useState<Record<string, boolean>>({})

    const DURATION_PRESETS = [
        { label: "30m", value: 30 },
        { label: "45m", value: 45 },
        { label: "1h", value: 60 },
    ]

    useEffect(() => {
        params.then(p => {
            setExamId(p.id)
            if (session?.user) {
                loadData(p.id)
            }
        })
    }, [params, session])

    // Load Data
    const loadData = async (id: string) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return

        try {
            const [examData, subjectsData, classesData] = await Promise.all([
                fetchExam(id),
                fetchSubjects(token),
                fetchClasses(token)
            ])
            setSubjects(subjectsData)
            setClasses(classesData)

            // Check for Local Draft First
            const localDraft = localStorage.getItem(`editExamDraft_${id}`)
            if (localDraft) {
                try {
                    const parsed = JSON.parse(localDraft)
                    toast.info("Restored unsaved changes from this device")

                    setTitle(parsed.title || examData.title)
                    setSelectedSubject(parsed.selectedSubject || examData.subject_id)
                    setSelectedClasses(parsed.selectedClasses || examData.class_ids || [])
                    setDuration(parsed.duration || examData.duration_minutes.toString())

                    if (parsed.questions && Array.isArray(parsed.questions)) {
                        setQuestions(parsed.questions)
                    } else {
                        setQuestions(examData.questions || [])
                    }

                    setStartTime(parsed.startTime ? new Date(parsed.startTime) : (examData.schedule_start ? new Date(examData.schedule_start) : undefined))
                    setAccessEndTime(parsed.accessEndTime ? new Date(parsed.accessEndTime) : (examData.exam_access_end_time ? new Date(examData.exam_access_end_time) : undefined))

                    if (parsed.antiCheat) setAntiCheatConfig(parsed.antiCheat)
                    else if (examData.anti_cheat_config) setAntiCheatConfig(examData.anti_cheat_config)

                    // Duration Logic
                    const dur = parsed.duration ? parseInt(parsed.duration) : examData.duration_minutes
                    const isPreset = DURATION_PRESETS.some(p => p.value === dur)
                    setIsCustomDuration(!isPreset)

                    setLoading(false)
                    return // Stop here if draft loaded
                } catch (e) {
                    console.error("Draft parse error", e)
                }
            }

            // Normal Hydration
            setTitle(examData.title)
            setSelectedSubject(examData.subject_id)
            setSelectedClasses(examData.class_ids || [])
            setDuration(examData.duration_minutes.toString())
            setQuestions(examData.questions || [])
            setStartTime(examData.schedule_start ? new Date(examData.schedule_start) : undefined)
            setAccessEndTime(examData.exam_access_end_time ? new Date(examData.exam_access_end_time) : undefined)
            if (examData.anti_cheat_config) setAntiCheatConfig(examData.anti_cheat_config)

            const isPreset = DURATION_PRESETS.some(p => p.value === examData.duration_minutes)
            setIsCustomDuration(!isPreset)

        } catch (e) {
            toast.error("Failed to load exam data")
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // Auto-Save Effect
    useEffect(() => {
        if (!examId || loading) return

        const draft = {
            title,
            selectedSubject,
            selectedClasses,
            duration,
            questions,
            startTime: startTime ? startTime.toISOString() : null,
            accessEndTime: accessEndTime ? accessEndTime.toISOString() : null,
            antiCheat: antiCheatConfig
        }
        localStorage.setItem(`editExamDraft_${examId}`, JSON.stringify(draft))
    }, [title, selectedSubject, selectedClasses, duration, questions, startTime, accessEndTime, antiCheatConfig, examId, loading])


    const handleDurationPreset = (value: number) => {
        setDuration(value.toString())
        setIsCustomDuration(false)
    }

    // Auto-scroll container
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
        // Classes might be empty if editing and not changing, but we should check if they are empty effectively.
        // The original code didn't check classes length for edit, but let's be consistent if it's required.
        // Actually, the original code DID check validation in a previous step, let's see. 
        // Original code: if (!title || !selectedSubject || !startTime || !accessEndTime) ...
        // It did NOT check classes length in the original edit page code I viewed?
        // Let's re-read the original ViewFile output for [id]/page.tsx lines 343-381 from step 2857.
        // It says: if (!title || !selectedSubject || !startTime || !accessEndTime) ... verify classes?
        // Wait, step 2857 snippet shows line 366: class_ids: selectedClasses. 
        // But the validation block lines 343-347 only checked title, subject, start, end. It missed class validation in Edit?
        // The user wants validation. I should add it for consistency.
        if (selectedClasses.length === 0) { newErrors.classes = true; if (!firstError) firstError = "field-classes" }

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please fill in all required fields marked in red.")

            if (firstError) {
                const el = document.getElementById(firstError)
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" })
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

        const token = (session?.user as any)?.accessToken
        if (!token) return

        try {
            const payload = {
                title,
                subject_id: selectedSubject,
                professor_id: (session?.user as any)?.id || "prof_1",
                questions,
                duration_minutes: parseInt(duration),
                schedule_start: startTime!.toISOString(),
                exam_access_end_time: accessEndTime!.toISOString(),
                class_ids: selectedClasses,
                anti_cheat_config: antiCheatConfig
            }

            await updateExam(examId, payload, token)

            // Clear draft on success
            localStorage.removeItem(`editExamDraft_${examId}`)

            toast.success("Exam Updated Successfully")
            router.push("/professor/exams")
        } catch (e: any) {
            toast.error("Failed to update exam: " + (e.message || "Unknown error"))
            console.error(e)
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
                            Save Changes
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
                            Save Changes
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
                    <h1 className="text-2xl font-bold tracking-tight">Edit Exam</h1>
                    <p className="text-slate-500">Update assessment details and questions.</p>
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
                <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
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
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".txt"
                                    className="hidden"
                                    id="question-upload-edit"
                                    onChange={handleFileUpload}
                                />
                                <Button variant="outline" size="sm" onClick={() => document.getElementById('question-upload-edit')?.click()}>
                                    <Upload className="mr-2 h-4 w-4" /> Import
                                </Button>
                            </div>
                        </div>
                    </div>

                    {questions.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center space-y-4">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <HelpCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No questions yet</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Get started by adding questions manually or importing a text file generated by AI.
                            </p>
                            <div className="flex justify-center gap-4 pt-4">
                                <Button variant="outline" onClick={() => document.getElementById('question-upload-edit')?.click()}>
                                    Import File
                                </Button>
                                <Button onClick={addQuestion}>
                                    Add Question manually
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col max-h-[850px]">
                            <div
                                ref={questionListRef}
                                className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                            >
                                {questions.map((q, idx) => (
                                    <Card key={idx} id={`question-card-${idx}`} className="group hover:border-slate-400 transition-colors">
                                        <CardContent className="py-6 space-y-4">
                                            <div className="flex gap-4">
                                                <div className="font-bold text-slate-300 text-xl pt-1 select-none">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex gap-4 items-start">
                                                        <div className="flex-1">
                                                            <Textarea
                                                                placeholder="Enter question text here..."
                                                                value={q.text}
                                                                onChange={e => updateQuestion(idx, 'text', e.target.value)}
                                                                className="min-h-[80px] text-base resize-y font-medium"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100 items-center">
                                                        <div className="w-40">
                                                            <Label className="mb-1 text-xs font-semibold text-slate-500 uppercase">Type</Label>
                                                            <Select value={q.type} onValueChange={(val) => updateQuestion(idx, 'type', val)}>
                                                                <SelectTrigger className="h-8 bg-white">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                                                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                                                    <SelectItem value="true_false">True / False</SelectItem>
                                                                    <SelectItem value="one_word">One Word</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="w-24">
                                                            <Label className="mb-1 text-xs font-semibold text-slate-500 uppercase">Marks</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={q.marks}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || 0
                                                                    updateQuestion(idx, 'marks', val < 0 ? 0 : val)
                                                                }}
                                                                className="h-8 bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-[200px]">
                                                            <Label className="mb-1 text-xs font-semibold text-slate-500 uppercase">Topic Tag</Label>
                                                            {subjects.find(s => s._id === selectedSubject)?.syllabus?.length > 0 ? (
                                                                <Select value={q.topic_id} onValueChange={(val) => updateQuestion(idx, 'topic_id', val)}>
                                                                    <SelectTrigger className="h-8 bg-white">
                                                                        <SelectValue placeholder="Select Topic" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="max-h-[300px]">
                                                                        {subjects.find(s => s._id === selectedSubject)?.syllabus.map((unit: any, uIdx: number) => (
                                                                            <SelectGroup key={uIdx}>
                                                                                <SelectLabel className="pl-2 py-1 text-xs font-bold text-slate-900 bg-slate-100 sticky top-0">
                                                                                    Unit {unit.unit}: {unit.title || `Unit ${unit.unit}`}
                                                                                </SelectLabel>
                                                                                {unit.topics.map((topic: string, tIdx: number) => (
                                                                                    <SelectItem key={`${uIdx}-${tIdx}`} value={topic}>
                                                                                        {topic}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectGroup>
                                                                        ))}
                                                                        <SelectGroup>
                                                                            <SelectLabel className="pl-2 py-1 text-xs font-bold text-slate-900 bg-slate-100 sticky top-0">Other</SelectLabel>
                                                                            <SelectItem value="general">General</SelectItem>
                                                                        </SelectGroup>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <Input
                                                                    placeholder={selectedSubject ? "No syllabus found. Type topic..." : "Select Subject first..."}
                                                                    value={q.topic_id}
                                                                    onChange={e => updateQuestion(idx, 'topic_id', e.target.value)}
                                                                    className="h-8 bg-white"
                                                                />
                                                            )}
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 h-8 w-8 ml-auto" onClick={() => {
                                                            const newQ = [...questions];
                                                            newQ.splice(idx, 1);
                                                            setQuestions(newQ);
                                                        }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    {/* Question Type Specific Inputs */}
                                                    {q.type === 'mcq' && (
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
                                                    )}

                                                    {q.type === 'true_false' && (
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
                                                    )}

                                                    {(q.type === 'short_answer' || q.type === 'one_word') && (
                                                        <div className="pt-2">
                                                            <Label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Expected Answer Key</Label>
                                                            <Input
                                                                placeholder="Enter the expected answer for auto-grading..."
                                                                value={q.correct_answer}
                                                                onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                                                                className="bg-emerald-50/50 border-emerald-200 focus-visible:ring-emerald-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
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
                                >
                                    <Check className="mr-2 h-5 w-5" /> Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )


}
