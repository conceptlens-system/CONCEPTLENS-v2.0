"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, Suspense, useRef } from "react"
import { toast } from "sonner"
import { fetchSubjects, fetchExam, updateExam, fetchClasses, generateExam } from "@/lib/api"
import { Plus, Trash2, Users, Upload, Copy, HelpCircle, Check, ChevronLeft, Search, ChevronsUpDown, X, Sparkles, Save } from "lucide-react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmModal } from "@/components/ConfirmModal"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Shield, CalendarIcon } from "lucide-react"


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
    const [loading, setLoading] = useState(false)
    const [openSubject, setOpenSubject] = useState(false)
    const [openClass, setOpenClass] = useState(false)
    const [aiMode, setAiMode] = useState("manual")
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

    // Confirmation State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })
    const [confirmTitle, setConfirmTitle] = useState("")
    const isDiscarding = useRef(false)

    // Search States
    const [subjectOpen, setSubjectOpen] = useState(false)
    const [subjectSearch, setSubjectSearch] = useState("")
    const [classSearch, setClassSearch] = useState("")

    const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
    const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()))

    // AI Generation State
    const [aiQuestionCount, setAiQuestionCount] = useState([10])
    const [aiDifficulty, setAiDifficulty] = useState("Medium")
    const [aiGenerating, setAiGenerating] = useState(false)
    const [loadingText, setLoadingText] = useState("Generating Exam...")

    // Dynamic Loading Text Effect
    useEffect(() => {
        if (!aiGenerating) return

        const messages = [
            "Analyzing Syllabus...",
            "Identifying Key Topics...",
            "Drafting Questions...",
            "Reviewing Difficulty...",
            "Finalizing Exam..."
        ]
        let index = 0
        setLoadingText(messages[0])

        const interval = setInterval(() => {
            index = (index + 1) % messages.length
            setLoadingText(messages[index])
        }, 2500)

        return () => clearInterval(interval)
    }, [aiGenerating])

    const handleAiGenerate = async () => {
        if (!selectedSubject) {
            toast.error("Please select a subject first")
            return
        }

        setAiGenerating(true)
        try {
            const token = (session?.user as any)?.accessToken
            // Pass selectedUnits to the API
            const generated = await generateExam(
                selectedSubject,
                aiQuestionCount[0],
                aiDifficulty,
                token,
                selectedUnits
            )

            // Map generated questions to editor format
            const mapping = generated.map((q: any) => ({
                id: q.id || `ai_${Date.now()}_${Math.random()}`,
                text: q.text,
                type: q.type, // types now match: mcq, true_false, short_answer, one_word
                options: q.options || [],
                correct_answer: q.correct_answer || "",
                marks: q.marks || 1,
                explanation: q.explanation,
                topic_id: q.topic || "general",
                unit: q.unit
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
            setSubjects(subjectsData || [])
            setClasses(classesData || [])

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

                    setIsLoaded(true)
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

            setIsLoaded(true)

        } catch (e) {
            toast.error("Failed to load exam data")
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // Auto-Save Effect
    useEffect(() => {
        if (!examId || loading || !isLoaded || isDiscarding.current) return

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
    }, [title, selectedSubject, selectedClasses, duration, questions, startTime, accessEndTime, antiCheatConfig, examId, loading, isLoaded])

    const handleDurationPreset = (value: number) => {
        setDuration(value.toString())
        setIsCustomDuration(false)
    }

    // Helper for strings
    const str = (val: any) => String(val)

    const [selectedUnits, setSelectedUnits] = useState<string[]>([])

    // Reset selected units when subject changes
    useEffect(() => {
        if (selectedSubject) {
            const subject = subjects.find(s => s._id === selectedSubject)
            if (subject?.syllabus) {
                // Select all units by default
                const allUnits = subject.syllabus.map((u: any) => str(u.unit))
                setSelectedUnits(allUnits)
            } else {
                setSelectedUnits([])
            }
        }
    }, [selectedSubject, subjects])

    // Auto-scroll to new question
    const questionListRef = useRef<HTMLDivElement>(null)
    const [shouldScroll, setShouldScroll] = useState(false)

    useEffect(() => {
        if (shouldScroll && questionListRef.current) {
            const container = questionListRef.current
            setTimeout(() => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth"
                })
            }, 100)
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
            topic_id: "general",
            unit: undefined
        }])
        setShouldScroll(true)
    }

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQ = [...questions]
        newQ[index] = { ...newQ[index], [field]: value }
        setQuestions(newQ)
    }

    const handleTopicChange = (index: number, topicId: string) => {
        const newQ = [...questions]
        let unit = undefined

        // Find unit for this topic
        if (selectedSubject) {
            const subject = subjects.find(s => s._id === selectedSubject)
            if (subject?.syllabus) {
                for (const u of subject.syllabus) {
                    if (u.topics.includes(topicId)) {
                        unit = u.unit
                        break
                    }
                }
            }
        }

        newQ[index] = {
            ...newQ[index],
            topic_id: topicId,
            unit: unit
        }
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
        reader.readAsText(file)
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
            const errorMessages = []
            if (newErrors.title) errorMessages.push("Exam Title")
            if (newErrors.subject) errorMessages.push("Subject")
            if (newErrors.classes) errorMessages.push("Class Selection")
            if (newErrors.startTime) errorMessages.push("Start Time")
            if (newErrors.accessEndTime) errorMessages.push("End Time")

            toast.error(`Please fill in the following required fields: ${errorMessages.join(", ")}`)

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

            // Update call
            await updateExam(examId, payload, token)

            toast.success("Exam Updated Successfully")
            // Cleanup draft
            localStorage.removeItem(`editExamDraft_${examId}`)

            router.push("/professor/exams")
        } catch (e: any) {
            toast.error("Failed to update exam: " + (e.message || "Unknown error"))
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setConfirmTitle("Discard Changes?")
        setConfirmAction(() => async () => {
            isDiscarding.current = true
            localStorage.removeItem(`editExamDraft_${examId}`)
            toast.info("Changes discarded")
            router.push("/professor/exams")
        })
        setConfirmOpen(true)
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

                <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto px-1">
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
        <div className="h-screen flex flex-col bg-slate-50/50 overflow-hidden">
            {/* 1. STICKY HEADER */}
            <header className="flex-none z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 h-auto md:h-16 py-2 md:py-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancel}
                            className="text-slate-500 hover:text-slate-900 -ml-2 shrink-0"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="h-6 w-px bg-slate-200 mx-2 shrink-0"></div>
                        <Input
                            value={title}
                            onChange={e => {
                                setTitle(e.target.value)
                                if (errors.title) setErrors({ ...errors, title: false })
                            }}
                            placeholder="Untitled Exam"
                            className="border-transparent text-lg md:text-xl font-bold px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300 w-full md:max-w-[400px]"
                        />
                    </div>
                    {/* Top Right Actions - Still keeping them but now redundant with footer for convenience */}
                    <div className="flex items-center gap-2 justify-end w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0">
                        <Button variant="ghost" onClick={handleCancel} className="text-slate-500 flex-1 md:flex-none">Discard</Button>
                        <Button className="bg-slate-900 text-white min-w-[120px] flex-1 md:flex-none" onClick={handleSubmit}>
                            Save
                        </Button>
                    </div>
                </div>

                {/* 2. HORIZONTAL SETTINGS TOOLBAR - RESPONSIVE */}
                <div className="border-t border-slate-100 bg-white px-6 py-4 flex flex-wrap items-center gap-6 w-full">
                    {/* Subject Selector */}
                    <Popover open={openSubject} onOpenChange={setOpenSubject}>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-colors w-full md:w-auto justify-between md:justify-start",
                                !selectedSubject && "text-slate-400",
                                errors.subject && "text-red-500 bg-red-50"
                            )}>
                                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">Subject:</span>
                                <span className="font-medium truncate max-w-[200px] md:max-w-[150px] text-left">
                                    {subjects.find(s => s._id === selectedSubject)?.name || selectedSubject || "Select Subject..."}
                                </span>
                                <ChevronsUpDown className="h-3 w-3 opacity-50 ml-auto md:ml-0" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[280px] p-0">
                            <Command>
                                <CommandInput
                                    placeholder="Search or type custom subject..."
                                    value={subjectSearch}
                                    onValueChange={setSubjectSearch}
                                />
                                <CommandList>
                                    <CommandEmpty>
                                        {subjectSearch ? (
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-slate-50 hover:text-indigo-700 font-medium"
                                                onClick={() => {
                                                    if (!subjects.find(s => s._id === subjectSearch)) {
                                                        setSubjects([...subjects, { _id: subjectSearch, name: subjectSearch }]);
                                                    }
                                                    setSelectedSubject(subjectSearch)
                                                    if (errors.subject) setErrors({ ...errors, subject: false })
                                                    setOpenSubject(false)
                                                    setSubjectSearch("")
                                                }}
                                            >
                                                Use custom: "{subjectSearch}"
                                            </button>
                                        ) : "No subject found."}
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {subjects.map(subject => (
                                            <CommandItem
                                                key={subject._id}
                                                value={subject.name}
                                                onSelect={() => {
                                                    setSelectedSubject(subject._id)
                                                    if (errors.subject) setErrors({ ...errors, subject: false })
                                                    setOpenSubject(false)
                                                    setSubjectSearch("")
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedSubject === subject._id ? "opacity-100" : "opacity-0")} />
                                                {subject.name}
                                            </CommandItem>
                                        ))}
                                        {subjectSearch && !subjects.find(s => s.name.toLowerCase() === subjectSearch.toLowerCase()) && (
                                            <CommandItem
                                                value={`custom_${subjectSearch}`}
                                                onSelect={() => {
                                                    if (!subjects.find(s => s._id === subjectSearch)) {
                                                        setSubjects([...subjects, { _id: subjectSearch, name: subjectSearch }]);
                                                    }
                                                    setSelectedSubject(subjectSearch)
                                                    if (errors.subject) setErrors({ ...errors, subject: false })
                                                    setOpenSubject(false)
                                                    setSubjectSearch("")
                                                }}
                                                className="text-indigo-600 font-medium cursor-pointer"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Use "{subjectSearch}"
                                            </CommandItem>
                                        )}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Class Selector */}
                    <Popover open={openClass} onOpenChange={setOpenClass}>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-colors w-full md:w-auto justify-between md:justify-start",
                                selectedClasses.length === 0 && "text-slate-400",
                                errors.classes && "text-red-500 bg-red-50"
                            )}>
                                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">Class:</span>
                                <span className="font-medium truncate max-w-[200px] md:max-w-[150px] text-left">
                                    {selectedClasses.length === 0
                                        ? "Select Class..."
                                        : `${selectedClasses.length} Selected`}
                                </span>
                                <ChevronsUpDown className="h-3 w-3 opacity-50 ml-auto md:ml-0" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[280px] p-2">
                            <Command>
                                <CommandInput
                                    placeholder="Search or type custom class..."
                                    value={classSearch}
                                    onValueChange={setClassSearch}
                                />
                                <CommandList>
                                    <CommandEmpty>
                                        {classSearch ? (
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-slate-50 hover:text-indigo-700 font-medium"
                                                onClick={() => {
                                                    if (!classes.find(c => c._id === classSearch)) {
                                                        setClasses([...classes, { _id: classSearch, name: classSearch }]);
                                                    }
                                                    toggleClass(classSearch);
                                                    if (errors.classes) setErrors({ ...errors, classes: false });
                                                    setClassSearch("");
                                                }}
                                            >
                                                Use custom: "{classSearch}"
                                            </button>
                                        ) : "No class found."}
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {classes.map((cls) => (
                                            <CommandItem
                                                key={cls._id}
                                                value={cls.name}
                                                onSelect={() => {
                                                    toggleClass(cls._id)
                                                    if (errors.classes) setErrors({ ...errors, classes: false })
                                                }}
                                            >
                                                <Checkbox checked={selectedClasses.includes(cls._id)} className="mr-2" />
                                                {cls.name}
                                            </CommandItem>
                                        ))}
                                        {classSearch && !classes.find(c => c.name.toLowerCase() === classSearch.toLowerCase()) && (
                                            <CommandItem
                                                value={`custom_${classSearch}`}
                                                onSelect={() => {
                                                    if (!classes.find(c => c._id === classSearch)) {
                                                        setClasses([...classes, { _id: classSearch, name: classSearch }]);
                                                    }
                                                    toggleClass(classSearch)
                                                    if (errors.classes) setErrors({ ...errors, classes: false })
                                                    setClassSearch("")
                                                }}
                                                className="text-indigo-600 font-medium cursor-pointer"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Use "{classSearch}"
                                            </CommandItem>
                                        )}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Start Time */}
                    <div className={cn("w-full md:w-auto flex flex-col gap-1", errors.startTime && "ring-2 ring-red-500 rounded-md")}>
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Start Time</Label>
                        <Input
                            type="datetime-local"
                            value={startTime ? new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : undefined
                                setStartTime(date)
                                if (errors.startTime) setErrors({ ...errors, startTime: false })
                            }}
                            className="w-full md:w-[200px] h-9 text-sm"
                        />
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* End Time */}
                    <div className={cn("w-full md:w-auto flex flex-col gap-1", errors.accessEndTime && "ring-2 ring-red-500 rounded-md")}>
                        <Label className="text-[10px] uppercase font-bold text-slate-500">End Time</Label>
                        <Input
                            type="datetime-local"
                            value={accessEndTime ? new Date(accessEndTime.getTime() - (accessEndTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : undefined
                                setAccessEndTime(date)
                                if (errors.accessEndTime) setErrors({ ...errors, accessEndTime: false })
                            }}
                            className="w-full md:w-[200px] h-9 text-sm"
                        />
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Duration */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-colors w-full md:w-auto justify-between md:justify-start">
                                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">Duration:</span>
                                <span className="font-medium">{duration} min</span>
                                <ChevronsUpDown className="h-3 w-3 opacity-50 ml-auto md:ml-0" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4">
                            <div className="space-y-4">
                                <h4 className="font-medium leading-none">Exam Duration</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {DURATION_PRESETS.map((preset) => (
                                        <Button
                                            key={preset.value}
                                            variant={duration === preset.value.toString() && !isCustomDuration ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handleDurationPreset(preset.value)}
                                            className="h-8"
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 pt-2 border-t mt-2">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Hours</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={Math.floor(parseInt(duration || "0") / 60)}
                                            onChange={(e) => {
                                                const h = parseInt(e.target.value) || 0
                                                const m = parseInt(duration || "0") % 60
                                                const newDuration = (h * 60) + m
                                                setDuration(newDuration.toString())
                                                setIsCustomDuration(true)
                                            }}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Minutes</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={59}
                                            value={parseInt(duration || "0") % 60}
                                            onChange={(e) => {
                                                const m = parseInt(e.target.value) || 0
                                                const h = Math.floor(parseInt(duration || "0") / 60)
                                                const newDuration = (h * 60) + m
                                                setDuration(newDuration.toString())
                                                setIsCustomDuration(true)
                                            }}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 text-center">
                                    Total Duration: <span className="font-medium text-slate-900">{duration} minutes</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Anti-Cheat */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-colors w-full md:w-auto justify-between md:justify-start">
                                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">Security:</span>
                                <span className="font-medium text-indigo-600 flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Configure
                                </span>
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Anti-Cheat Configuration</DialogTitle>
                                <DialogDescription>Configure proctoring settings for this exam.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {Object.entries(antiCheatConfig).map(([key, enabled]) => (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                                        <div className="space-y-0.5">
                                            <Label className="text-base capitalize">{key.replace('_', ' ')}</Label>
                                            <p className="text-xs text-slate-500">
                                                {key === 'fullscreen' ? "Force fullscreen mode during exam" :
                                                    key === 'tab_switch' ? "Detect and block tab switching" :
                                                        key === 'copy_paste' ? "Disable copy/paste functionality" :
                                                            "Disable right-click context menu"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(checked) => setAntiCheatConfig(prev => ({ ...prev, [key]: checked }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* 3. MAIN EDITOR AREA (Fluid and Scrollable) */}
            <main className="flex-1 overflow-hidden flex flex-col max-w-[1000px] mx-auto w-full px-6 pt-6 pb-6">
                <Tabs defaultValue="manual" value={aiMode} onValueChange={setAiMode} className="flex flex-col h-full w-full">

                    {/* Tabs Header - Pinned at top of main area */}
                    <div className="flex-none mb-6 flex items-center gap-4">
                        <TabsList className="grid flex-1 max-w-none grid-cols-2 gap-4 bg-transparent p-0 h-auto">
                            <TabsTrigger
                                value="manual"
                                className="h-16 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:border-slate-900 hover:bg-slate-50 transition-all font-medium text-base"
                            >
                                Manual Editor
                            </TabsTrigger>
                            <TabsTrigger
                                value="ai"
                                className="h-16 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 hover:bg-slate-50 transition-all group font-medium text-base"
                            >
                                <Sparkles className="h-4 w-4 mr-2 group-data-[state=active]:text-indigo-200 text-indigo-500" />
                                AI Generator
                            </TabsTrigger>
                        </TabsList>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-16 px-6 gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-xl shadow-sm border">
                                    <HelpCircle className="h-5 w-5" />
                                    <span className="hidden sm:inline">AI Prompt Format</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>AI Generation Prompt Format</DialogTitle>
                                    <DialogDescription>
                                        Copy this format and paste it into ChatGPT, Claude, or Gemini to generate questions for import.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="relative mt-4 rounded-md border bg-slate-50 p-4">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute right-2 top-2 h-8 w-8 text-slate-500 hover:text-slate-900"
                                        onClick={copyToClipboard}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <pre className="text-sm font-mono whitespace-pre-wrap text-slate-700 select-all p-2">
                                        {formatExample}
                                    </pre>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button onClick={copyToClipboard} className="gap-2">
                                        <Copy className="h-4 w-4" /> Copy to Clipboard
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <TabsContent value="manual" className="flex-1 overflow-hidden flex flex-col mt-0 h-full">
                        {/* SCROLLABLE Question List */}
                        <div ref={questionListRef} className="flex-1 overflow-y-auto pb-4 space-y-6">
                            {questions.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-6">
                                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                        <Plus className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Start Adding Questions</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto mb-8">
                                        Manually add questions, import from a file, or use AI to generate new ones.
                                    </p>
                                    <div className="flex flex-col md:flex-row justify-center gap-4 w-full md:w-auto">
                                        <Button onClick={() => setAiMode("ai")} variant="outline" className="h-12 px-6 gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 w-full md:w-auto">
                                            <Sparkles className="h-5 w-5" /> Use AI Generator
                                        </Button>
                                        <div className="relative w-full md:w-auto">
                                            <input
                                                type="file"
                                                accept=".txt"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                            />
                                            <Button variant="outline" className="h-12 px-6 gap-2 w-full md:w-auto">
                                                <Upload className="h-5 w-5" /> Import File
                                            </Button>
                                        </div>

                                        <Button onClick={addQuestion} className="h-12 px-6 gap-2 bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 w-full md:w-auto">
                                            <Plus className="h-5 w-5" /> Add Question
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                questions.map((q, idx) => (
                                    <Card key={idx} id={`question-card-${idx}`} className="group transition-all duration-300 border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 bg-white">
                                        <CardHeader className="pb-3 pt-5 px-6">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex items-center gap-4 w-full">
                                                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm border">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 items-center flex-1">
                                                            <div className="flex items-center relative group/marks">
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">PTS</span>
                                                                <input
                                                                    type="number"
                                                                    className="h-8 w-16 text-sm bg-slate-50 border-slate-200 rounded pl-3 pr-6 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                                                                    value={q.marks}
                                                                    onChange={(e) => updateQuestion(idx, 'marks', parseInt(e.target.value) || 1)}
                                                                    min={1}
                                                                />
                                                            </div>

                                                            <select
                                                                className="h-8 text-sm bg-slate-50 border-slate-200 rounded px-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-700 cursor-pointer hover:bg-slate-100"
                                                                value={q.type}
                                                                onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                                                            >
                                                                <option value="mcq">Multiple Choice</option>
                                                                <option value="true_false">True / False</option>
                                                                <option value="one_word">One Word</option>
                                                            </select>

                                                            {/* Topic Selector */}
                                                            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                                                                {q.unit && (
                                                                    <div className="h-8 px-3 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 uppercase tracking-wide whitespace-nowrap shadow-sm">
                                                                        Unit {q.unit}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1">
                                                                    {subjects.find(s => s._id === selectedSubject)?.syllabus?.length > 0 ? (
                                                                        <Select value={q.topic_id} onValueChange={(val) => handleTopicChange(idx, val)}>
                                                                            <SelectTrigger className="h-8 text-xs bg-white border-slate-200 w-full hover:border-indigo-300 transition-colors">
                                                                                <SelectValue placeholder="Select Topic" />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="max-h-[300px]">
                                                                                {subjects.find(s => s._id === selectedSubject)?.syllabus.map((unit: any, uIdx: number) => (
                                                                                    <SelectGroup key={uIdx}>
                                                                                        <SelectLabel className="pl-2 py-1 text-xs font-bold text-slate-900 bg-slate-100 sticky top-0 border-b">
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
                                                                            placeholder={selectedSubject ? "Topic..." : "Select Subject first..."}
                                                                            value={q.topic_id}
                                                                            onChange={e => updateQuestion(idx, 'topic_id', e.target.value)}
                                                                            className="h-8 text-xs bg-white w-full"
                                                                            disabled={!selectedSubject}
                                                                        />
                                                                    )}
                                                                </div>
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
                                                        className="h-8 w-8 p-0 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="px-6 pb-6 space-y-4">
                                            <div className="relative">
                                                <Textarea
                                                    placeholder="Enter question text here..."
                                                    className="resize-none min-h-[80px] text-base border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 bg-slate-50/50 focus:bg-white transition-all p-3"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                                />
                                            </div>
                                            {renderQuestionOptions(q, idx)}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                        {/* Sticky Footer Actions for Manual Mode */}
                        <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 -mx-6 mt-auto">
                            <div className="flex items-center justify-between gap-4 max-w-[1000px] mx-auto">
                                <Button
                                    onClick={addQuestion}
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-2 shadow-sm"
                                >
                                    <Plus className="h-5 w-5" /> Add New Question
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (questions.length === 0) {
                                            toast.error("Add at least one question to review")
                                            return
                                        }
                                        setIsReviewMode(true)
                                    }}
                                    variant="secondary"
                                    className="flex-1 h-12 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 gap-2 shadow-sm"
                                    disabled={questions.length === 0}
                                >
                                    <Check className="h-5 w-5" /> Review
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-lg shadow-slate-200"
                                    disabled={loading || questions.length === 0}
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>

                    </TabsContent>

                    {/* Keep AI Generator Content Here (Using existing structure but cleaner) */}
                    <TabsContent value="ai" className="mt-0 overflow-y-auto pb-12">
                        {/* ... Existing AI Content Logic ... */}
                        <Card className="border-indigo-100 shadow-md">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-lg"></div>
                            <CardContent className="p-8 max-w-2xl mx-auto space-y-8">
                                <div className="space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-full mb-4 ring-1 ring-indigo-100">
                                            <Sparkles className="h-8 w-8 text-indigo-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                                            AI Exam Generator
                                        </h2>
                                        <p className="text-slate-500 max-w-sm mx-auto">
                                            Let our AI analyze the syllabus and generate a balanced exam for you in seconds.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <Sparkles className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    Generating for: <span className="text-indigo-600">{subjects.find(s => s._id === selectedSubject)?.name || "Select a Subject via Toolbar"}</span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Ensure you have selected the correct subject in the top toolbar.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Unit Selection Reuse */}
                                        {selectedSubject && subjects.find(s => s._id === selectedSubject)?.syllabus?.length > 0 && (
                                            <div className="md:col-span-2 space-y-3">
                                                <Label>Select Units to Focus On</Label>
                                                <div className="p-4 rounded-xl border bg-white grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">
                                                    {subjects.find(s => s._id === selectedSubject)?.syllabus.map((unit: any, idx: number) => {
                                                        const uId = str(unit.unit)
                                                        const isSelected = selectedUnits.includes(uId)
                                                        return (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`unit-ai-${uId}`}
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedUnits([...selectedUnits, uId])
                                                                        else setSelectedUnits(selectedUnits.filter(u => u !== uId))
                                                                    }}
                                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <label htmlFor={`unit-ai-${uId}`} className="text-sm cursor-pointer select-none">
                                                                    <span className="font-semibold text-slate-700">Unit {unit.unit}</span>
                                                                    <span className="text-xs text-slate-500 block truncate">{unit.title}</span>
                                                                </label>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <Label>Number of Questions</Label>
                                            <Input
                                                type="number"
                                                value={aiQuestionCount[0]}
                                                onChange={e => setAiQuestionCount([parseInt(e.target.value) || 0])}
                                                min={1} max={100}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label>Difficulty Level</Label>
                                            <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                                                <SelectTrigger className="h-11">
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

                                    <Button
                                        className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-xl shadow-indigo-100 transition-all duration-500"
                                        onClick={handleAiGenerate}
                                        disabled={aiGenerating || !selectedSubject}
                                    >
                                        {aiGenerating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                <span className="animate-pulse">{loadingText}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="h-5 w-5" />
                                                Generate {aiQuestionCount[0]} Questions
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description="This will discard all unsaved changes. This action cannot be undone."
                onConfirm={confirmAction}
                variant="default"
            />
        </div >
    )
}
