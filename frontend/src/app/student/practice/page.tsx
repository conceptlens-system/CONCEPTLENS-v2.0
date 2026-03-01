"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BrainCircuit, Trophy, Target, ArrowRight, Play, CheckCircle2, XCircle, ChevronRight, Award, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fetchStudentFocusAreas, generatePracticeQuiz, submitPracticeResult } from "@/lib/api"

type ViewState = "dashboard" | "loading_quiz" | "quiz" | "results"

export default function PracticeAreaPage() {
    return (
        <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <PracticeContent />
        </Suspense>
    )
}

function PracticeContent() {
    const { data: session, status } = useSession()
    const searchParams = useSearchParams()
    const router = useRouter()

    const initSubject = searchParams.get('subject')
    const initTopic = searchParams.get('topic')

    const [view, setViewState] = useState<ViewState>("dashboard")
    const [focusAreas, setFocusAreas] = useState<any[]>([])
    const [loadingAreas, setLoadingAreas] = useState(true)

    // Quiz State
    const [questions, setQuestions] = useState<any[]>([])
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [score, setScore] = useState(0)
    const [pointsEarned, setPointsEarned] = useState(0)
    const [activeTopic, setActiveTopic] = useState<{ subject_id: string, topic: string } | null>(null)

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        // Auto-start practice if query params exist and we are strictly in the "dashboard" state (not already loading or practicing)
        if (initSubject && initTopic && view === "dashboard" && questions.length === 0) {
            startPractice(initSubject, initTopic)
        } else if (view === "dashboard" && focusAreas.length === 0) {
            const load = async () => {
                try {
                    const faRes = await fetchStudentFocusAreas(token)
                    setFocusAreas(faRes.data || [])
                } catch (e) {
                    console.error("Failed to load focus areas", e)
                } finally {
                    setLoadingAreas(false)
                }
            }
            load()
        }
    }, [session, status, initSubject, initTopic, view, questions.length])

    const startPractice = async (subjectId: string, topic: string) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return

        setViewState("loading_quiz")
        setActiveTopic({ subject_id: subjectId, topic })

        try {
            const data = await generatePracticeQuiz(subjectId, topic, token)
            setQuestions(data)
            setCurrentQIndex(0)
            setSelectedAnswers({})
            setIsSubmitted(false)
            setViewState("quiz")
        } catch (e) {
            toast.error("Failed to generate practice quiz. Try again later.")
            setViewState("dashboard")
        }
    }

    const handleOptionSelect = (ans: string) => {
        if (isSubmitted) return
        setSelectedAnswers(prev => ({ ...prev, [currentQIndex]: ans }))
    }

    const submitQuiz = async () => {
        const token = (session?.user as any)?.accessToken
        if (!token || !activeTopic) return

        // Calculate score client side first to show UI instantly
        let calcScore = 0
        questions.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.correct_answer) {
                calcScore += 1
            }
        })
        setScore(calcScore)
        setIsSubmitted(true)

        try {
            const res = await submitPracticeResult(
                activeTopic.subject_id,
                activeTopic.topic,
                calcScore,
                questions.length,
                "Medium",
                token
            )
            setPointsEarned(res.points_earned || 0)
            toast.success(`Quiz completed! You earned ${res.points_earned || 0} XP.`)
        } catch (e) {
            console.error("Error saving result", e)
        }

        setViewState("results")
    }

    // --- RENDER DASHBOARD ---
    if (view === "dashboard") {
        return (
            <PageTransition className="space-y-8 pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                                <BrainCircuit className="w-8 h-8" />
                            </div>
                            Challenge Area
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg">Master your weak points with AI-generated practice quizzes.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Target className="w-5 h-5 text-rose-500" /> Targeted Practice Areas
                        </h2>

                        {loadingAreas ? (
                            <div className="space-y-4">
                                <Skeleton className="h-32 w-full rounded-xl" />
                                <Skeleton className="h-32 w-full rounded-xl" />
                            </div>
                        ) : focusAreas.length === 0 ? (
                            <Card className="border-dashed bg-slate-50/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <BrainCircuit className="h-12 w-12 mb-4 text-emerald-400 opacity-50" />
                                    <p className="font-medium text-lg">No weaknesses detected!</p>
                                    <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                                        You are currently doing great across all your subjects. Keep it up! Check back here if you start missing questions in your exams.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {focusAreas.map((area, idx) => (
                                    <Card key={idx} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-rose-500">
                                        <div className="p-6 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center bg-white">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-200">Needs Focus</Badge>
                                                    <span className="text-sm font-medium text-slate-400">Concept</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900">{area.topic}</h3>
                                                <p className="text-slate-500 text-sm line-clamp-2">{area.struggle}</p>
                                            </div>
                                            <Button
                                                onClick={() => startPractice(area.subject_id, area.topic)}
                                                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md hover:shadow-lg transition-all"
                                                size="lg"
                                            >
                                                <Play className="w-5 h-5 mr-2 fill-current" /> Initialize Training
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-none shadow-xl overflow-hidden relative">
                            <div className="absolute -right-10 -bottom-10 opacity-20 transform rotate-12">
                                <Trophy className="w-48 h-48" />
                            </div>
                            <CardHeader className="relative z-10 pb-2">
                                <CardTitle className="text-lg font-bold text-white/90 uppercase tracking-wider">Total XP Earned</CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10 pb-6">
                                <div className="text-5xl font-black drop-shadow-md flex items-end gap-2">
                                    {(session?.user as any)?.points || 0}
                                    <span className="text-2xl text-indigo-300 font-bold mb-1">XP</span>
                                </div>
                                <p className="text-indigo-200 text-sm mt-2 font-medium">Earn XP by completing practice quizzes.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageTransition>
        )
    }

    // --- RENDER LOADING QUIZ ---
    if (view === "loading_quiz") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/30 animate-pulse"></div>
                    <BrainCircuit className="w-20 h-20 text-indigo-600 animate-bounce relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">Generating Neural Training Scenario...</h2>
                    <p className="text-slate-500">Gemini AI is crafting a custom {activeTopic?.topic} quiz based on your profile.</p>
                </div>
            </div>
        )
    }

    const currentQ = questions[currentQIndex]

    // --- RENDER QUIZ UI ---
    if (view === "quiz") {
        return (
            <PageTransition className="max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 mb-2 border-none">
                            Training Topic: {activeTopic?.topic}
                        </Badge>
                        <h1 className="text-2xl font-bold text-slate-900">Question {currentQIndex + 1} of {questions.length}</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-slate-500 mb-1">Progress</div>
                        <div className="flex gap-1">
                            {questions.map((_, i) => (
                                <div key={i} className={`h-2 w-8 rounded-full ${i === currentQIndex ? 'bg-indigo-600' : i < currentQIndex ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 p-6 sm:p-8">
                        <h2 className="text-xl sm:text-2xl font-medium text-slate-900 leading-relaxed">
                            {currentQ?.text}
                        </h2>
                    </div>
                    <CardContent className="p-6 sm:p-8">
                        <div className="space-y-3">
                            {currentQ?.type === 'true_false' ? (
                                ['True', 'False'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleOptionSelect(opt)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedAnswers[currentQIndex] === opt
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-medium shadow-sm'
                                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAnswers[currentQIndex] === opt ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                {selectedAnswers[currentQIndex] === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                            </div>
                                            {opt}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                currentQ?.options.map((opt: string, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => handleOptionSelect(opt)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedAnswers[currentQIndex] === opt
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-medium shadow-sm'
                                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center font-bold text-xs ${selectedAnswers[currentQIndex] === opt ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-500'}`}>
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            {opt}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </CardContent>
                    <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            disabled={currentQIndex === 0}
                            onClick={() => setCurrentQIndex(prev => prev - 1)}
                            className="text-slate-500"
                        >
                            Previous
                        </Button>

                        {currentQIndex === questions.length - 1 ? (
                            <Button
                                onClick={submitQuiz}
                                disabled={!selectedAnswers[currentQIndex]}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md px-8 rounded-full"
                            >
                                Submit Training <CheckCircle2 className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setCurrentQIndex(prev => prev + 1)}
                                disabled={!selectedAnswers[currentQIndex]}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md px-8 rounded-full"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </Card>
            </PageTransition>
        )
    }

    // --- RENDER RESULTS ---
    if (view === "results") {
        const percentage = Math.round((score / questions.length) * 100)

        return (
            <PageTransition className="max-w-4xl mx-auto py-8 space-y-8 pb-20">
                <div className="text-center space-y-6 py-8">
                    <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full shadow-xl shadow-indigo-500/20 mb-4 animate-in zoom-in duration-500">
                        <Award className="w-16 h-16 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Training Complete!</h1>
                    <p className="text-xl text-slate-500 max-w-lg mx-auto">
                        You scored <strong className="text-indigo-600">{score} out of {questions.length}</strong> ({percentage}%) on {activeTopic?.topic}.
                    </p>

                    <div className="flex justify-center gap-4 mt-8">
                        <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 border border-emerald-100 text-lg">
                            <Trophy className="w-5 h-5" /> +{pointsEarned} XP Earned
                        </div>
                    </div>

                    <Button onClick={() => {
                        router.replace("/student/practice")
                        setViewState("dashboard")
                    }} className="mt-8 rounded-full" variant="outline" size="lg">
                        Return to Dashboard
                    </Button>
                </div>

                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-slate-800 border-b pb-4">AI Explanations & Review</h3>
                    {questions.map((q, idx) => {
                        const isCorrect = selectedAnswers[idx] === q.correct_answer
                        return (
                            <Card key={idx} className={`border-l-4 ${isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'} overflow-hidden shadow-sm`}>
                                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-4">
                                    <div className="mt-1 shrink-0">
                                        {isCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 leading-relaxed text-lg">{q.text}</h4>
                                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Your Answer</div>
                                                <div className={`font-medium ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                    {selectedAnswers[idx] || "No Answer"}
                                                </div>
                                            </div>
                                            {!isCorrect && (
                                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                                    <div className="text-xs uppercase tracking-wider text-emerald-600/70 font-bold mb-1">Correct Answer</div>
                                                    <div className="font-medium text-emerald-800">
                                                        {q.correct_answer}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-white">
                                    <div className="flex gap-3">
                                        <BrainCircuit className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
                                        <div>
                                            <span className="font-bold text-indigo-900 block mb-1">AI Explanation</span>
                                            <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </PageTransition>
        )
    }

    return null
}
