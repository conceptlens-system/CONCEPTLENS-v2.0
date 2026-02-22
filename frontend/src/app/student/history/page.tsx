"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileClock } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"

export default function ExamHistoryPage() {
    const history: any[] = []

    return (
        <PageTransition className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Exam History</h1>
                <p className="text-slate-500 mt-2">Past attempts and submissions.</p>
            </div>

            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg text-slate-400">
                    <FileClock className="h-12 w-12 mb-4 text-slate-300" />
                    <p>You haven't completed any exams yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* History Items */}
                </div>
            )}
        </PageTransition>
    )
}
