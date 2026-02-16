"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { fetchExam, fetchExamStudentsScores, publishResults } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/PageTransition"
import { Loader2, Send } from "lucide-react"

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session } = useSession()
    const router = useRouter()
    const [exam, setExam] = useState<any>(null)
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [examId, setExamId] = useState<string>("")
    const [publishDialogOpen, setPublishDialogOpen] = useState(false)

    useEffect(() => {
        params.then(p => {
            setExamId(p.id)
            if (session?.user) loadData(p.id)
        })
    }, [params, session])

    const loadData = async (id: string) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return
        try {
            const [examData, studentsData] = await Promise.all([
                fetchExam(id),
                fetchExamStudentsScores(id, token)
            ])
            setExam(examData)
            setResults(studentsData)
        } catch (e) {
            toast.error("Failed to load results")
        } finally {
            setLoading(false)
        }
    }

    const handlePublish = () => {
        setPublishDialogOpen(true)
    }

    const confirmPublish = async () => {
        const token = (session?.user as any)?.accessToken
        setPublishing(true)
        try {
            await publishResults(examId, token)
            setExam({ ...exam, results_published: true })
            toast.success("Results published successfully!")
            setPublishDialogOpen(false)
        } catch (e) {
            toast.error("Failed to publish results")
        } finally {
            setPublishing(false)
        }
    }

    if (loading) return <div className="p-8">Loading Results...</div>
    if (!exam) return <div className="p-8">Exam not found</div>

    return (
        <PageTransition className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{exam.title} - Results</h1>
                    <p className="text-slate-500 mt-2">Manage grading and result publication.</p>
                </div>
                <div className="space-x-4">
                    <Button variant="outline" onClick={() => router.push("/professor/exams")}>
                        Back to Exams
                    </Button>
                    <Button
                        disabled={exam.results_published || publishing}
                        onClick={handlePublish}
                        className={exam.results_published ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {exam.results_published ? "Results Published" : "Publish Results"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{results.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Average Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {results.length > 0
                                ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(1)
                                : "0"
                            }
                            <span className="text-sm text-slate-400 font-normal ml-1">/ {results[0]?.total_marks || "0"}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {exam.results_published ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Published</Badge>
                        ) : (
                            <Badge variant="secondary">Draft</Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Student Scores</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        No students have submitted this exam yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.name}</TableCell>
                                        <TableCell>{r.email}</TableCell>
                                        <TableCell>
                                            <span className="font-bold">{r.score}</span>
                                            <span className="text-slate-400 text-xs ml-1">/ {r.total_marks}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Submitted</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


            <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publish Results?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to publish the results?
                            <br />
                            All students who took this exam will receive a notification with their scores.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmPublish} className="bg-green-600 hover:bg-green-700 text-white">
                            Publish Now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageTransition >
    )
}
