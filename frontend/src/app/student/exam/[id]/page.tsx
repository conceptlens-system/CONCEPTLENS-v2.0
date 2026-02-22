"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Timer, CheckCircle, Smartphone, AlertTriangle, Flag, ListChecks, PlayCircle } from "lucide-react"
import { fetchExam, ingestResponses } from "@/lib/api"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ConfirmModal"
import screenfull from "screenfull"

export default function TakeExamPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()

    // State
    const [exam, setExam] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [started, setStarted] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [currentQ, setCurrentQ] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [timeLeft, setTimeLeft] = useState(0)
    const [warnings, setWarnings] = useState(0)
    const [flagged, setFlagged] = useState<Set<number>>(new Set())
    const [isOverview, setIsOverview] = useState(false)
    const [isTimerPaused, setIsTimerPaused] = useState(false)

    // Refs for timer and anti-cheat
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const warningRef = useRef(0) // Sync warning count for event listeners

    const [startConfirmOpen, setStartConfirmOpen] = useState(false)
    const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)

    // Load Exam
    useEffect(() => {
        if (!params.id) return
        fetchExam(params.id as string)
            .then(data => {
                setExam(data)
                setTimeLeft(data.duration_minutes * 60)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [params.id])

    // Timer Logic
    useEffect(() => {
        if (started && !submitted && timeLeft > 0 && !isTimerPaused) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleSubmit() // Auto submit
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [started, submitted, timeLeft, isTimerPaused])

    // --- SECURITY IMPLEMENTATION ---
    const [returnTimer, setReturnTimer] = useState<number | null>(null)
    const returnTimerRef = useRef<NodeJS.Timeout | null>(null)

    const handleViolation = (reason: string) => {
        if (!started || submitted) return

        // 1. Increment Warning
        warningRef.current += 1
        setWarnings(warningRef.current)
        toast.error(`VIOLATION: ${reason}. Warning ${warningRef.current}/3.`)

        // 2. Check Max Warnings
        if (warningRef.current >= 3) {
            toast.error("Maximum violations reached. Exam auto-submitted.")
            handleSubmit()
            return
        }

        // 3. Start 10s Return Timer if NOT already running
        if (!returnTimerRef.current) {
            toast.warning(`You have 10 seconds to return to fullscreen/exam!`)
            setReturnTimer(10)

            returnTimerRef.current = setInterval(() => {
                setReturnTimer(prev => {
                    if (prev === null) return null
                    if (prev <= 1) {
                        // Timeout reached
                        if (returnTimerRef.current) clearInterval(returnTimerRef.current)
                        returnTimerRef.current = null
                        toast.error("Time limit exceeded. Exam auto-submitted.")
                        handleSubmit()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
    }

    const clearReturnTimer = () => {
        if (returnTimerRef.current) {
            clearInterval(returnTimerRef.current)
            returnTimerRef.current = null
            setReturnTimer(null)
            toast.success("Welcome back. Timer stopped.")
        }
    }

    // 1. Fullscreen Enforcement & Tab Switch
    useEffect(() => {
        if (!started || submitted) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation("Tab Switching / Window Focus Lost")
            } else {
                // Returned to tab
                // We verify fullscreen status separately, but generally this is the "return" action
                // IF we are also fullscreen
                if (!screenfull.isEnabled || screenfull.isFullscreen) {
                    clearReturnTimer()
                }
            }
        }

        const handleFullscreenChange = () => {
            if (screenfull.isEnabled) {
                if (!screenfull.isFullscreen) {
                    handleViolation("Exited Fullscreen")
                } else {
                    // Returned to fullscreen
                    // Check if tab is focused (not hidden)
                    if (!document.hidden) {
                        clearReturnTimer()
                    }
                }
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        if (screenfull.isEnabled) {
            screenfull.on('change', handleFullscreenChange)
        }

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            if (screenfull.isEnabled) {
                screenfull.off('change', handleFullscreenChange)
            }
            if (returnTimerRef.current) clearInterval(returnTimerRef.current)
        }
    }, [started, submitted])

    // 2. Block Copy/Paste/Context
    useEffect(() => {
        if (!started || submitted) return

        const preventAction = (e: Event) => {
            // Allow interaction with inputs, textareas, and buttons (like MCQ radios)
            const target = e.target as HTMLElement
            // Fix: ensure target has closest method (it might be a text node)
            const closestButton = typeof target.closest === 'function' ? target.closest('button') : null
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || closestButton

            // Only block if it's NOT an input interaction OR if it's a specific blocked action like paste
            if (e.type === 'contextmenu' || e.type === 'copy' || e.type === 'paste' || e.type === 'cut') {
                e.preventDefault()
                toast.warning("Action blocked: Copy/Paste/Right-Click are disabled.")
                return
            }

            // For selectstart, allow it inside inputs
            if (e.type === 'selectstart') {
                if (!isInput) {
                    e.preventDefault()
                }
            }
        }

        document.addEventListener("contextmenu", preventAction)
        document.addEventListener("copy", preventAction)
        document.addEventListener("paste", preventAction)
        document.addEventListener("cut", preventAction)
        document.addEventListener("selectstart", preventAction)

        return () => {
            document.removeEventListener("contextmenu", preventAction)
            document.removeEventListener("copy", preventAction)
            document.removeEventListener("paste", preventAction)
            document.removeEventListener("cut", preventAction)
            document.removeEventListener("selectstart", preventAction)
        }
    }, [started, submitted])

    // Only allow start if fullscreen succeeds
    const startExamValue = async () => {
        if (screenfull.isEnabled) {
            try {
                await screenfull.request()
                setStarted(true)
            } catch (e) {
                toast.error("Fullscreen required to start. Please allow fullscreen permission.")
            }
        } else {
            // Fallback if not supported
            setStarted(true)
        }
    }

    const startExamCheck = () => {
        setStartConfirmOpen(true)
    }

    const handleAnswer = (val: string) => {
        if (exam) {
            setAnswers(prev => ({
                ...prev,
                [exam.questions[currentQ].id]: val
            }))
        }
    }

    const toggleFlag = (idx: number) => {
        setFlagged(prev => {
            const next = new Set(prev)
            if (next.has(idx)) {
                next.delete(idx)
            } else {
                next.add(idx)
            }
            return next
        })
    }

    const enterOverview = () => {
        setIsTimerPaused(true)
        setIsOverview(true)
    }

    const resumeExam = (targetQ?: number) => {
        if (typeof targetQ === 'number') {
            setCurrentQ(targetQ)
        }
        setIsOverview(false)
        setIsTimerPaused(false)
    }

    const handleSubmit = async () => {
        if (submitted) return
        setSubmitted(true)
        if (screenfull.isEnabled && screenfull.isFullscreen) {
            screenfull.exit()
        }

        // Prepare Submission
        if (!exam || !session) return

        const studentId = session.user?.email || "unknown_student"

        const payload = exam.questions.map((q: any) => ({
            student_id: studentId,
            assessment_id: exam._id,
            question_id: q.id,
            response_text: answers[q.id] || "",
            submitted_at: new Date().toISOString()
        }))

        try {
            await ingestResponses(payload)
            setTimeout(() => router.push("/student/exams"), 3000)
        } catch (e) {
            toast.error("Submission failed, please contact admin.")
            console.error(e)
        }
    }

    // --- UI RENDERING ---

    if (loading) return <div className="p-8 text-center">Loading Exam...</div>
    if (!exam) return <div className="p-8 text-center text-red-500">Exam not found</div>

    // Format Time
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const timeColor = minutes < 5 ? "text-red-600" : "text-slate-900"

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 z-50 fixed inset-0">
                <Card className="max-w-md w-full text-center p-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900">Exam Submitted!</h1>
                    <p className="text-slate-500 mt-2">Your responses have been recorded successfully. Redirecting...</p>
                </Card>
            </div>
        )
    }

    // Access Control Check
    const now = new Date()
    const start = new Date(exam.schedule_start)
    const accessEnd = exam.exam_access_end_time ? new Date(exam.exam_access_end_time) : null

    if (!started && (now < start || (accessEnd && now > accessEnd))) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Card className="max-w-md w-full text-center p-8">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                    <p className="text-slate-500 mt-2 mb-6">
                        {now < start ? "This exam has not started yet." : "The access window for this exam has closed."}
                    </p>
                    <Button onClick={() => router.push("/student/exams")} variant="outline" className="w-full">
                        Return to Exams
                    </Button>
                </Card>
            </div>
        )
    }

    if (!started) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{exam.title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                            <Badge variant="outline"><Timer className="w-3 h-3 mr-1" /> {exam.duration_minutes} Minutes</Badge>
                            <Badge variant="outline">{exam.questions.length} Questions</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            <h3 className="font-bold flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> Exam Rules</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>The timer starts immediately after clicking Start.</li>
                                <li><strong>Fullscreen is MANDATORY.</strong> Exiting will cause a warning.</li>
                                <li><strong>Tab switching is DETECTED.</strong> It will be recorded as a violation.</li>
                                <li><strong>3 Violations = AUTO SUBMIT.</strong></li>
                                <li>Copy/Paste and Right-Click are disabled.</li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={startExamCheck} className="w-full" size="lg">Start Exam</Button>
                    </CardFooter>
                </Card>

                <ConfirmModal
                    open={startConfirmOpen}
                    onOpenChange={setStartConfirmOpen}
                    title="Ready to Start?"
                    description="This will enter Fullscreen mode. Ensure you have a stable connection and no distractions."
                    onConfirm={startExamValue}
                    confirmText="Enter Fullscreen & Start"
                />
            </div>
        )
    }

    // --- OVERVIEW / SUMMARY STATE ---
    if (isOverview) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-auto">
                <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="font-bold text-lg">{exam.title} - Review</div>
                    <div className="flex items-center gap-4">
                        <div className="text-amber-600 font-medium flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            <Timer className="w-4 h-4" /> Timer Paused
                        </div>
                        <Button variant="outline" onClick={() => resumeExam()} className="flex items-center gap-2">
                            <PlayCircle className="w-4 h-4" /> Resume Exam
                        </Button>
                    </div>
                </header>
                <div className="container max-w-4xl mx-auto p-6 flex-1 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle>Exam Summary</CardTitle>
                            <p className="text-sm text-slate-500">Review your answers before submitting. Click "Edit" to change an answer.</p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {exam.questions.map((q: any, idx: number) => {
                                    const userAnswer = answers[q.id];
                                    const isFlagged = flagged.has(idx);

                                    return (
                                        <div key={idx} className={`p-6 ${isFlagged ? 'bg-red-50/30' : 'bg-white'}`}>
                                            {/* Question Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-3">
                                                    <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-slate-900 leading-snug">{q.text}</h3>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {isFlagged && <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1"><Flag className="w-3 h-3" /> Flagged</Badge>}
                                                            {!userAnswer && <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-slate-500 border-slate-300">Unanswered</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => resumeExam(idx)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 text-xs font-medium">
                                                    Edit
                                                </Button>
                                            </div>

                                            {/* Answer Preview */}
                                            <div className="pl-9">
                                                {q.type === "mcq" && (
                                                    <div className="space-y-2">
                                                        {q.options.map((opt: string, oIdx: number) => {
                                                            const isSelected = userAnswer === opt;
                                                            return (
                                                                <div key={oIdx} className={`text-sm px-3 py-2 rounded-md border flex items-center gap-2 ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium' : 'border-transparent text-slate-500'}`}>
                                                                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                                                    </div>
                                                                    {opt}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {q.type === "true_false" && (
                                                    <div className="flex gap-2">
                                                        {["True", "False"].map((opt) => (
                                                            <div key={opt} className={`text-sm px-4 py-1.5 rounded-full border ${userAnswer === opt ? 'bg-indigo-100 border-indigo-200 text-indigo-800 font-medium' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {(q.type === "one_word" || q.type === "one_liner" || q.type === "short_answer" || q.type === "descriptive") && (
                                                    <div className={`text-sm p-3 rounded-md border ${userAnswer ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 italic'}`}>
                                                        {userAnswer || "No answer provided"}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t p-6 bg-slate-50">
                            <Button variant="outline" onClick={() => resumeExam()} size="lg" className="px-8">Back to Exam</Button>
                            <Button onClick={() => setSubmitConfirmOpen(true)} size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8 text-white shadow-md">Submit Exam</Button>
                        </CardFooter>
                    </Card>
                </div>
                <ConfirmModal
                    open={submitConfirmOpen}
                    onOpenChange={setSubmitConfirmOpen}
                    title="Submit Exam?"
                    description="Are you sure you want to submit? Ensure you have answered all questions. This action cannot be undone."
                    onConfirm={handleSubmit}
                    confirmText="Yes, Submit"
                />
            </div>
        )
    }

    const question = exam.questions[currentQ]
    const isQuestionFlagged = flagged.has(currentQ)

    return (
        // z-index-50 to cover sidebar/nav. Fixed positioning to ensure no scroll away.
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-auto">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="font-bold text-lg truncate max-w-[200px]">{exam.title}</div>
                <div className={`font-mono text-xl font-bold ${timeColor} flex items-center gap-2`}>
                    <Timer className="w-5 h-5" />
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={warnings > 0 ? "destructive" : "secondary"} className="animate-in fade-in">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Warnings: {warnings} / 3
                    </Badge>
                    {returnTimer !== null && (
                        <Badge variant="destructive" className="animate-pulse font-bold text-lg">
                            RETURN IN: {returnTimer}s
                        </Badge>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 container max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Question Section */}
                <div className="lg:col-span-3">
                    <Card className="min-h-[500px] flex flex-col h-full shadow-md">
                        <CardHeader className="bg-slate-50 border-b">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-sm text-slate-500 font-semibold text-indigo-600">
                                    Question {currentQ + 1} of {exam.questions.length}
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleFlag(currentQ)}
                                        className={isQuestionFlagged ? "text-red-600 hover:text-red-700 bg-red-50" : "text-slate-500 hover:text-slate-700"}
                                    >
                                        <Flag className={`w-4 h-4 mr-2 ${isQuestionFlagged ? "fill-red-600" : ""}`} />
                                        {isQuestionFlagged ? "Flagged" : "Flag"}
                                    </Button>
                                    <span className="text-sm font-semibold">{question.marks} Marks</span>
                                </div>
                            </div>
                            <CardTitle className="text-xl leading-relaxed text-slate-800">{question.text}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-6">
                            {/* INPUT REDERING LOGIC */}

                            {question.type === "mcq" && (
                                <RadioGroup value={answers[question.id] || ""} onValueChange={handleAnswer} className="space-y-3">
                                    {question.options.map((opt: string, idx: number) => (
                                        <div key={idx} className={`flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-all ${answers[question.id] === opt ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm' : 'hover:bg-slate-50 hover:border-slate-300'}`}>
                                            <RadioGroupItem value={opt} id={`opt-${idx}`} className="text-indigo-600 border-indigo-300" />
                                            <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-medium text-slate-700">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {question.type === "true_false" && (
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant={answers[question.id] === "True" ? "default" : "outline"}
                                        onClick={() => handleAnswer("True")}
                                        className={`w-36 h-12 text-lg ${answers[question.id] === "True" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                                    >
                                        True
                                    </Button>
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant={answers[question.id] === "False" ? "default" : "outline"}
                                        onClick={() => handleAnswer("False")}
                                        className={`w-36 h-12 text-lg ${answers[question.id] === "False" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                                    >
                                        False
                                    </Button>
                                </div>
                            )}

                            {(question.type === "one_word" || question.type === "one_liner") && (
                                <Input
                                    placeholder="Type your answer here..."
                                    value={answers[question.id] || ""}
                                    onChange={(e) => handleAnswer(e.target.value)}
                                    className="text-lg py-6 border-slate-300 focus:border-indigo-500"
                                />
                            )}

                            {(question.type === "short_answer" || question.type === "descriptive") && (
                                <Textarea
                                    placeholder="Type your detailed answer here..."
                                    className="min-h-[200px] text-lg border-slate-300 focus:border-indigo-500 resize-none"
                                    value={answers[question.id] || ""}
                                    onChange={(e) => handleAnswer(e.target.value)}
                                />
                            )}

                        </CardContent>
                        <CardFooter className="flex justify-between border-t pt-6 pb-6 px-6 bg-slate-50/50">
                            <Button
                                variant="outline"
                                disabled={currentQ === 0}
                                onClick={() => setCurrentQ(prev => prev - 1)}
                                className="px-6"
                            >
                                Previous
                            </Button>

                            {currentQ < exam.questions.length - 1 ? (
                                <Button onClick={() => setCurrentQ(prev => prev + 1)} className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white">
                                    Next Question
                                </Button>
                            ) : (
                                <Button onClick={enterOverview} className="bg-slate-800 hover:bg-slate-900 px-8 text-white shadow-md">
                                    Review & Submit
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>

                {/* Sidebar: Student Info & Navigation Grid */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Student Info Card */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-4 border-b bg-slate-50 rounded-t-lg">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                                    {(session?.user?.name || "S").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-slate-900">{session?.user?.name || "Student"}</span>
                                    <span className="text-xs text-slate-500 font-normal">{session?.user?.email}</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-xs text-slate-500 uppercase font-semibold">Question Navigator</div>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={enterOverview}>
                                    <ListChecks className="w-3 h-3 mr-1" /> Overview
                                </Button>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {exam.questions.map((q: any, idx: number) => {
                                    const isAttempted = !!answers[q.id];
                                    const isCurrent = currentQ === idx;
                                    const isFlagged = flagged.has(idx);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentQ(idx)}
                                            className={`
                                                h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all shadow-sm relative
                                                ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 z-10' : ''}
                                                ${isFlagged
                                                    ? 'bg-red-50 text-red-600 border border-red-300 font-bold'
                                                    : isAttempted
                                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600'
                                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                }
                                            `}
                                            title={`Question ${idx + 1}`}
                                        >
                                            {idx + 1}
                                            {isFlagged && <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-600 -mt-0.5 -mr-0.5" />}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span>Done</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-400"></div>
                                    <span>Flagged</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-white border border-slate-300"></div>
                                    <span>Open</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <ConfirmModal
                open={submitConfirmOpen}
                onOpenChange={setSubmitConfirmOpen}
                title="Submit Exam?"
                description="Are you sure you want to submit? Ensure you have answered all questions. This action cannot be undone."
                onConfirm={handleSubmit}
                confirmText="Yes, Submit"
            />
        </div>
    )
}
