"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Target, Briefcase, Zap, Compass, ChevronRight, Activity, Cpu } from "lucide-react"
import { fetchStudentCareerMapping } from "@/lib/api"

export default function CareerMappingPage() {
    const { data: session, status } = useSession()

    const [roles, setRoles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadCareerMap = async () => {
            try {
                const res = await fetchStudentCareerMapping(token)
                setRoles(res.data || [])
            } catch (e) {
                console.error("Career Mapping error:", e)
            } finally {
                setLoading(false)
            }
        }

        loadCareerMap()
    }, [session, status])

    return (
        <PageTransition className="space-y-8 pb-12 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                        <div className="bg-sky-100 p-2 rounded-xl text-sky-600">
                            <Compass className="w-8 h-8" />
                        </div>
                        Career & Skill Mapping
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        See how your academic strengths align with real-world industry roles.
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm bg-gradient-to-r from-sky-50 to-indigo-50 overflow-hidden relative">
                        <div className="absolute right-0 top-0 opacity-10 pointer-events-none text-sky-500 translate-x-1/4 -translate-y-1/4">
                            <Cpu className="w-64 h-64" />
                        </div>
                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-sky-500 fill-sky-200" /> AI Career Analysis
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                                Powered by Gemini AI. We analyze your performance across all exams and practice quizzes to find your perfect industry match.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="space-y-4">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                            ))
                        ) : roles.length === 0 ? (
                            <Card className="border-dashed bg-slate-50/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <Target className="h-12 w-12 mb-4 text-sky-300" />
                                    <p className="font-medium text-lg">Gathering Data...</p>
                                    <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                                        We need more exam data to accurately map your skills. Keep taking exams and practice quizzes!
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            roles.map((role, idx) => (
                                <Card key={idx} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Left Match Score */}
                                        <div className="bg-slate-50 p-6 md:w-48 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100">
                                            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle className="text-slate-200" strokeWidth="6" stroke="currentColor" fill="transparent" r="42" cx="48" cy="48" />
                                                    <circle
                                                        className={`transition-all duration-1000 ease-out ${role.match_percentage >= 85 ? 'text-emerald-500' :
                                                                role.match_percentage >= 70 ? 'text-sky-500' : 'text-amber-500'
                                                            }`}
                                                        strokeWidth="6"
                                                        strokeDasharray={264}
                                                        strokeDashoffset={264 - (264 * role.match_percentage) / 100}
                                                        strokeLinecap="round"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="42" cx="48" cy="48"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-black text-slate-800">{role.match_percentage}%</span>
                                                </div>
                                            </div>
                                            <div className="text-xs uppercase tracking-wider font-bold text-slate-400">Match Score</div>
                                        </div>

                                        {/* Right Content */}
                                        <div className="p-6 flex-1 bg-white">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-2xl font-bold text-slate-900">{role.role}</h3>
                                                </div>
                                                <div className="bg-sky-50 p-2 rounded-lg text-sky-600 shrink-0">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <p className="text-slate-600 mb-6 leading-relaxed">
                                                {role.reason}
                                            </p>

                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 uppercase tracking-wider mb-2">
                                                    <Activity className="w-4 h-4" /> Recommended Next Step
                                                </div>
                                                <div className="text-slate-700 font-medium">
                                                    {role.next_skill}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="bg-slate-900 border-none text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Target className="w-32 h-32 text-sky-400" />
                        </div>
                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                How it works
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 text-slate-300 space-y-4 text-sm leading-relaxed">
                            <p>
                                As you complete assessments, our system tracks your mastery across different micro-concepts (e.g., SQL Joins, Binary Trees).
                            </p>
                            <p>
                                We then map these proven skills against open job descriptions and industry standards to calculate your match percentage for various roles.
                            </p>
                            <div className="pt-4 border-t border-slate-800">
                                <span className="text-sky-400 font-medium flex items-center gap-1">
                                    <ChevronRight className="w-4 h-4" /> Want better matches?
                                </span>
                                <span className="block mt-1">Keep improving your weakest areas in the Challenge Area.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    )
}
