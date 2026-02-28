"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Trophy, ArrowRight } from "lucide-react"
import { fetchMyResult } from "@/lib/api"
import { toast } from "sonner"
import { PageTransition } from "@/components/PageTransition"
import Link from "next/link"

export default function StudentExamResultPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session, status } = useSession()

    const [resultSummary, setResultSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const examId = params.id as string

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken

        if (!token) {
            router.push("/login")
            return
        }

        const loadResult = async () => {
            try {
                // The API returns an object {score, total_questions, questions, ...}
                const data = await fetchMyResult(examId, token)
                setResultSummary(data)
            } catch (e: any) {
                toast.error(e.message || "Failed to load exam results")
                router.push("/student/exams")
            } finally {
                setLoading(false)
            }
        }

        loadResult()
    }, [examId, session, status, router])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-500 font-medium">Loading your results...</p>
            </div>
        )
    }

    if (!resultSummary || !resultSummary.questions || resultSummary.questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">No Results Found</h2>
                <p className="text-slate-500 mb-6">
                    We couldn't find any results for this exam. Either you haven't taken it yet, or the professor hasn't published the results.
                </p>
                <Button asChild>
                    <Link href="/student/exams">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Exams
                    </Link>
                </Button>
            </div>
        )
    }

    // Calculate score
    const totalQuestions = resultSummary.total_questions || 0
    const correctAnswers = resultSummary.correct_questions || 0
    const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    let scoreColor = "text-rose-500"
    let scoreBg = "bg-rose-50"
    if (scorePercentage >= 80) {
        scoreColor = "text-emerald-500"
        scoreBg = "bg-emerald-50"
    } else if (scorePercentage >= 60) {
        scoreColor = "text-amber-500"
        scoreBg = "bg-amber-50"
    }

    return (
        <PageTransition className="space-y-8 pb-12 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                        <Link href="/student/exams" className="flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back to Exams
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Exam Results</h1>
                    <p className="text-slate-500 mt-2">Detailed breakdown of your performance.</p>
                </div>

                <Button asChild variant="outline" className="hidden sm:flex border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
                    <Link href="/student">
                        Command Center <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            {/* Score Summary Card */}
            <Card className="overflow-hidden border-2 border-indigo-50 shadow-sm">
                <CardContent className="p-0 sm:flex items-center">
                    <div className={`p-8 sm:w-1/3 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r ${scoreBg}`}>
                        <Trophy className={`h-12 w-12 mb-3 ${scoreColor}`} />
                        <h2 className={`text-5xl font-extrabold ${scoreColor}`}>{scorePercentage}%</h2>
                        <p className={`mt-2 font-medium ${scoreColor} opacity-80`}>Final Score</p>
                    </div>
                    <div className="p-8 sm:w-2/3 flex flex-col justify-center gap-6 bg-white">
                        <div className="flex justify-between items-end border-b pb-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Total Questions</p>
                                <p className="text-2xl font-bold text-slate-800">{totalQuestions}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-500 mb-1">Correct Answers</p>
                                <p className="text-2xl font-bold text-emerald-600">{correctAnswers} <span className="text-slate-400 text-lg font-normal">/ {totalQuestions}</span></p>
                            </div>
                        </div>
                        <p className="text-slate-600 text-sm">
                            {scorePercentage >= 80 ? "Excellent work! You have a strong grasp of these concepts." :
                                scorePercentage >= 60 ? "Good effort! Review your mistakes to master the topic." :
                                    "You struggled with this exam. Don't worry, check your AI Focus Areas on the dashboard to build a study plan."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Questions Breakdown */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Question Breakdown</h3>

                {resultSummary.questions.map((question: any, idx: number) => {
                    const isCorrect = question.is_correct

                    return (
                        <Card key={question.id || idx} className={`border-l-4 ${isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <Badge variant="outline" className="h-6 shrink-0 bg-slate-50">Q{idx + 1}</Badge>
                                        <CardTitle className="text-base leading-relaxed text-slate-800 font-medium">
                                            {question.text || "Question Text Unavailable"}
                                        </CardTitle>
                                    </div>
                                    <Badge className={`shrink-0 ${isCorrect ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                                        {isCorrect ? 'Correct' : 'Incorrect'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Answer</p>
                                        <div className="flex items-start gap-2">
                                            {!isCorrect && <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                                            <p className="text-sm font-medium text-slate-700">{question.user_answer || "No Answer Provided"}</p>
                                        </div>
                                    </div>

                                    {!isCorrect && question.correct_answer && (
                                        <div className="bg-emerald-50/50 p-3 rounded-md border border-emerald-100">
                                            <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider mb-1">Correct Answer</p>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                                <p className="text-sm font-medium text-emerald-800">{question.correct_answer}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {question.explanation && (
                                    <div className="mt-4 p-3 bg-indigo-50/50 rounded-md border border-indigo-100 text-sm text-indigo-900">
                                        <span className="font-semibold text-indigo-700">Explanation: </span>
                                        {question.explanation}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="flex justify-center pt-8">
                <Button asChild size="lg" className="px-8 bg-slate-900 hover:bg-slate-800">
                    <Link href="/student/exams">Return to My Exams</Link>
                </Button>
            </div>
        </PageTransition>
    )
}
