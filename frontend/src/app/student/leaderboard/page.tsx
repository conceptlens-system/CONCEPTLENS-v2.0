"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Medal, Star, Crown, Globe, Users, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchGlobalLeaderboard, fetchClassLeaderboard, fetchClasses } from "@/lib/api"
import { toast } from "sonner"

export default function LeaderboardPage() {
    const { data: session, status } = useSession()

    const [globalLeaders, setGlobalLeaders] = useState<any[]>([])
    const [classLeaders, setClassLeaders] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClass, setSelectedClass] = useState<string>("")
    const [loading, setLoading] = useState(true)

    const currentUserEmail = session?.user?.email
    const currentUserName = session?.user?.name

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadInitialData = async () => {
            try {
                // Fetch Global + Enrolled Classes parallel
                const [globalData, classesData] = await Promise.all([
                    fetchGlobalLeaderboard(token).catch(() => []),
                    fetchClasses(token).catch(() => [])
                ])
                setGlobalLeaders(globalData)
                setClasses(classesData)

                if (classesData.length > 0) {
                    setSelectedClass(classesData[0]._id)
                }
            } catch (e) {
                console.error("Leaderboard load error:", e)
                toast.error("Failed to load leaderboards")
            } finally {
                setLoading(false)
            }
        }

        loadInitialData()
    }, [session, status])

    useEffect(() => {
        if (!selectedClass) return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadClassLeaders = async () => {
            try {
                const classData = await fetchClassLeaderboard(selectedClass, token)
                setClassLeaders(classData)
            } catch (e) {
                console.error("Class leaderboard error", e)
            }
        }

        loadClassLeaders()
    }, [selectedClass, session])

    const renderLeaderboard = (data: any[], title: string, subtitle: string, icon: React.ReactNode) => {
        if (loading) return (
            <div className="space-y-4 pt-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
            </div>
        )

        if (data.length === 0) return (
            <Card className="border-dashed bg-slate-50/50 mt-4">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Trophy className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium text-lg">No champions yet!</p>
                    <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                        Complete practice quizzes to earn XP and climb the ranks.
                    </p>
                </CardContent>
            </Card>
        )

        return (
            <div className="mt-6 space-y-4">
                {/* Top 3 Podium (Optional, but looks premium) */}
                <div className="flex justify-center items-end gap-2 sm:gap-6 mb-12 mt-8 px-2">
                    {/* 2nd Place */}
                    {data.length > 1 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-100 mb-2">
                            <div className="relative">
                                <div className="absolute -top-3 -right-3 bg-slate-200 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs ring-2 ring-white z-10">2</div>
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-400 shadow-md">
                                    {data[1].full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1 max-w-[80px] sm:max-w-[100px]">{data[1].full_name}</div>
                                <div className="text-indigo-600 font-bold text-xs sm:text-sm">{data[1].points} XP</div>
                            </div>
                            <div className="w-20 sm:w-24 h-16 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-lg mt-3 shadow-inner"></div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {data.length > 0 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 z-10">
                            <div className="relative">
                                <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 w-8 h-8 drop-shadow-md z-10" />
                                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-amber-50 border-4 border-amber-300 flex items-center justify-center text-3xl font-bold text-amber-600 shadow-xl">
                                    {data[0].full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div className="font-black text-slate-900 text-base sm:text-lg">{data[0].full_name}</div>
                                <div className="text-amber-600 font-bold text-sm sm:text-base flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 fill-amber-500" /> {data[0].points} XP
                                </div>
                            </div>
                            <div className="w-24 sm:w-32 h-24 bg-gradient-to-t from-amber-300 to-amber-100 rounded-t-xl mt-3 shadow-[inset_0_2px_10px_rgba(251,191,36,0.3)]"></div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {data.length > 2 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-200 mb-4">
                            <div className="relative">
                                <div className="absolute -top-3 -right-3 bg-orange-200 text-orange-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs ring-2 ring-white z-10">3</div>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-50 border-4 border-orange-200 flex items-center justify-center text-lg sm:text-xl font-bold text-orange-400 shadow-sm">
                                    {data[2].full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1 max-w-[80px] sm:max-w-[100px]">{data[2].full_name}</div>
                                <div className="text-indigo-600 font-bold text-xs sm:text-sm">{data[2].points} XP</div>
                            </div>
                            <div className="w-16 sm:w-20 h-12 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-lg mt-3 shadow-inner"></div>
                        </div>
                    )}
                </div>

                {/* List View */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center gap-12 sm:gap-16">
                            <span className="w-8 text-center">Rank</span>
                            <span>Student</span>
                        </div>
                        <span>Score</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {data.map((student, idx) => {
                            const isMe = student.full_name === currentUserName;
                            return (
                                <div
                                    key={student._id}
                                    className={`p-4 flex items-center justify-between transition-colors ${isMe ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-6 sm:gap-10">
                                        <div className="w-8 flex justify-center">
                                            {idx === 0 ? <Medal className="w-6 h-6 text-amber-500" /> :
                                                idx === 1 ? <Medal className="w-6 h-6 text-slate-400" /> :
                                                    idx === 2 ? <Medal className="w-6 h-6 text-orange-400" /> :
                                                        <span className="font-bold text-slate-400">#{idx + 1}</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {student.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                    {student.full_name}
                                                    {isMe && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-1.5 py-0">You</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-indigo-600 text-lg flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full">
                                        {student.points} <span className="text-xs text-indigo-400">XP</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <PageTransition className="space-y-8 pb-12 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                            <Trophy className="w-8 h-8" />
                        </div>
                        Hall of Fame
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Compare your progress with peers. Earn XP by completing exams and practice quizzes.</p>
                </div>
            </div>

            <Tabs defaultValue="global" className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2 p-1 bg-slate-100/80 rounded-xl">
                    <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all font-semibold">
                        <Globe className="w-4 h-4 mr-2" /> Global
                    </TabsTrigger>
                    <TabsTrigger value="class" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all font-semibold">
                        <Users className="w-4 h-4 mr-2" /> My Classes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="global" className="mt-6 animate-in fade-in duration-500">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-2xl flex items-center gap-2 text-slate-800">
                                <Globe className="w-5 h-5 text-indigo-500" /> Platform Leaders
                            </CardTitle>
                            <CardDescription className="text-base text-slate-500">
                                The absolute best performers across all courses on the platform.
                            </CardDescription>
                        </CardHeader>
                        {renderLeaderboard(globalLeaders, "Global", "All Students", <Globe className="w-5 h-5" />)}
                    </Card>
                </TabsContent>

                <TabsContent value="class" className="mt-6 animate-in fade-in duration-500">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl flex items-center gap-2 text-slate-800">
                                    <Users className="w-5 h-5 text-indigo-500" /> Class Standings
                                </CardTitle>
                                <CardDescription className="text-base text-slate-500">
                                    See how you rank against your classmates.
                                </CardDescription>
                            </div>
                            {classes.length > 0 && (
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="w-[240px] bg-white border-slate-200">
                                        <SelectValue placeholder="Select a class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c._id} value={c._id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardHeader>

                        {classes.length === 0 && !loading ? (
                            <Card className="border-dashed bg-slate-50/50 mt-4">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <Users className="h-12 w-12 mb-4 text-slate-300" />
                                    <p className="font-medium text-lg">Not in any classes</p>
                                    <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                                        Join a class to see how you stack up against classmates.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            renderLeaderboard(classLeaders, "Class", "Your Peers", <Users className="w-5 h-5" />)
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </PageTransition>
    )
}
