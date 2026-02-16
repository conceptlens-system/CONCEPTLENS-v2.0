"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { fetchExam, fetchMyResult } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/PageTransition"
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"

export default function StudentExamResultPage() {
    const params = useParams()
    const { data: session, status } = useSession()
    const router = useRouter()

    // Safety check for params.id
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''

    const [exam, setExam] = useState<any>(null)
    const [myResult, setMyResult] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === "loading" || !id) return
        const token = (session?.user as any)?.accessToken
        if (!token) return
        loadData(token)
    }, [id, status, session])

    const loadData = async (token: string) => {
        try {
            const eData = await fetchExam(id)
            setExam(eData)

            const rData = await fetchMyResult(id, token)
            setMyResult(rData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (!exam) return <div>Exam not found</div>

    return (
        <PageTransition className="space-y-6 max-w-3xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <Card className="border-t-4 border-t-green-600">
                <CardHeader className="text-center pb-2">
                    <Badge className="mx-auto mb-4 bg-green-100 text-green-700 hover:bg-green-100">Result Published</Badge>
                    <CardTitle className="text-3xl">{exam.title}</CardTitle>
                    <CardDescription>
                        {exam.subject_id} • {new Date(exam.schedule_start).toLocaleDateString()}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-8 pt-6">
                    <div className="flex justify-center items-center gap-2">
                        <div className="text-6xl font-bold text-slate-900">
                            {myResult?.score ?? "--"}
                        </div>
                        <div className="text-2xl text-slate-400 font-medium self-end mb-2">/ {myResult?.total_marks ?? "--"}</div>
                    </div>

                    <div className="text-left mt-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                            Question Breakdown
                        </h3>

                        <div className="space-y-6">
                            {myResult?.questions?.map((q: any, i: number) => (
                                <Card key={q.id} className={`overflow-hidden transition-all ${q.is_correct ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                                    <div className={`px-6 py-4 border-b flex justify-between items-center ${q.is_correct ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={q.is_correct ? "default" : "destructive"} className="h-6">
                                                {q.is_correct ? "Correct" : "Incorrect"}
                                            </Badge>
                                            <span className="font-medium text-slate-500 text-sm">Question {i + 1}</span>
                                        </div>
                                        <div className="font-bold text-slate-700">
                                            {q.is_correct ? q.marks : 0} / {q.marks} Marks
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <h4 className="text-lg font-medium text-slate-900 mb-4">{q.text}</h4>

                                        {q.type === "mcq" ? (
                                            <div className="space-y-2">
                                                {q.options.map((opt: string) => {
                                                    const isSelected = q.user_answer === opt
                                                    const isCorrect = q.correct_answer === opt

                                                    let style = "bg-white border-slate-200 hover:bg-slate-50"
                                                    if (isCorrect) style = "bg-green-50 border-green-500 text-green-700 font-medium ring-1 ring-green-500"
                                                    else if (isSelected && !isCorrect) style = "bg-red-50 border-red-300 text-red-700 ring-1 ring-red-300"

                                                    return (
                                                        <div key={opt} className={`p-3 rounded-lg border text-sm flex items-center justify-between transition-colors ${style}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isCorrect ? "border-green-600 bg-green-600" :
                                                                        (isSelected ? "border-red-500 bg-red-500" : "border-slate-300")
                                                                    }`}>
                                                                    {(isCorrect || isSelected) && <div className="h-2 w-2 bg-white rounded-full" />}
                                                                </div>
                                                                <span>{opt}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isCorrect && <span className="text-xs font-bold text-green-600">Correct Answer</span>}
                                                                {isSelected && !isCorrect && <span className="text-xs font-bold text-red-600">Your Answer</span>}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-50 rounded-lg border">
                                                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Your Answer</p>
                                                    <p className={`font-medium ${q.is_correct ? "text-green-700" : "text-red-700"}`}>
                                                        {q.user_answer || <span className="italic text-slate-400">No answer</span>}
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                    <p className="text-xs text-green-600 uppercase font-bold mb-2">Correct Answer</p>
                                                    <p className="font-medium text-green-800">{q.correct_answer}</p>
                                                </div>
                                            </div>
                                        )}

                                        {q.explanation && (
                                            <div className="mt-6 flex gap-3 bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                                                <div className="shrink-0 mt-0.5">💡</div>
                                                <div>
                                                    <span className="font-bold block mb-1">Explanation</span>
                                                    {q.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageTransition>
    )
}
