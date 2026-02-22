"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { fetchClasses } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageTransition } from "@/components/PageTransition"
import { BookOpen, User, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function StudentClassesPage() {
    const { data: session } = useSession()
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!session) return
        loadClasses()
    }, [session])

    const loadClasses = async () => {
        try {
            const token = (session?.user as any)?.accessToken
            if (!token) return
            const data = await fetchClasses(token)
            setClasses(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Loading classes...</div>

    return (
        <PageTransition className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Classes</h1>
                <p className="text-slate-500 mt-2">Classes you are currently enrolled in.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.length === 0 ? (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
                        <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>You haven't joined any classes yet.</p>
                        <Button variant="link" asChild className="mt-2 text-indigo-600">
                            <Link href="/student/profile">Join a Class</Link>
                        </Button>
                    </div>
                ) : (
                    classes.map((cls) => (
                        <Card key={cls._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                        {cls.class_code}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl mt-2">{cls.name}</CardTitle>
                                <CardDescription className="flex items-center gap-1 mt-1">
                                    <User className="h-3 w-3" /> Professor {cls.professor_id ? "(View Details)" : ""}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center text-sm text-slate-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Joined: {new Date(cls.created_at).toLocaleDateString()}
                                        {/* Ideally joined_at from enrollment but fetching class returns class created_at */}
                                    </span>
                                </div>
                                <Button className="w-full bg-slate-900 hover:bg-slate-800" asChild>
                                    <Link href={`/student/classes/${cls._id}`}>
                                        Go to Class <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </PageTransition>
    )
}
