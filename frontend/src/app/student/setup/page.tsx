"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Loader2, GraduationCap } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { fetchUserProfile, updateUserProfile } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function StudentSetupPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        institute_name: "",
        degree: "",
        branch: "",
        current_semester: "",
        contact_number: ""
    })

    useEffect(() => {
        if (status === "loading") return
        if (status === "unauthenticated" || !session) {
            router.push("/login")
            return
        }

        const loadProfile = async () => {
            try {
                const token = (session?.user as any)?.accessToken
                const data = await fetchUserProfile(token)
                setFormData({
                    institute_name: data.institute_name || "",
                    degree: data.degree || "",
                    branch: data.branch || "",
                    current_semester: data.current_semester?.toString() || "",
                    contact_number: data.contact_number || data.phone || ""
                })
            } catch (e) {
                console.error("Failed to load profile", e)
            } finally {
                setLoading(false)
            }
        }

        loadProfile()
    }, [session, status, router])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) return

        const missingFields = []
        if (!formData.institute_name) missingFields.push("Institute Name")
        if (!formData.degree) missingFields.push("Degree")
        if (!formData.branch) missingFields.push("Branch")
        if (!formData.current_semester) missingFields.push("Current Semester")
        if (!formData.contact_number) missingFields.push("Contact Number")

        if (missingFields.length > 0) {
            toast.error(`Please fill all required fields: ${missingFields.join(", ")}`)
            return
        }

        if (!/^\d{10}$/.test(formData.contact_number)) {
            toast.error("Contact number must be exactly 10 digits")
            return
        }

        const token = (session?.user as any)?.accessToken

        try {
            setSaving(true)
            await updateUserProfile({
                ...formData,
                current_semester: parseInt(formData.current_semester, 10)
            }, token)

            toast.success("Profile completed successfully!")

            // Give toast time to show, then redirect to dashboard which will now bypass setup
            setTimeout(() => {
                window.location.href = "/student"
            }, 1000)

        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Failed to save profile details")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
    }

    return (
        <div className="w-full max-w-2xl mx-auto py-12 px-4 animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mb-4">
                    <GraduationCap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                    Welcome to ConceptLens, {session?.user?.name}!
                </h1>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                    Before you can start analyzing texts and tracking your performance, we need a few academic details.
                </p>
            </div>

            <Card className="border-indigo-100 dark:border-indigo-900/30 shadow-lg shadow-indigo-100/50 dark:shadow-none">
                <CardHeader>
                    <CardTitle>Complete Your Academic Profile</CardTitle>
                    <CardDescription>This information ensures you are aligned with the correct tracking curriculum.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="institute" className="font-semibold">Institute / College Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="institute"
                                placeholder="e.g. Indian Institute of Technology Bombay"
                                value={formData.institute_name}
                                onChange={(e) => setFormData({ ...formData, institute_name: e.target.value })}
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="degree" className="font-semibold">Degree <span className="text-red-500">*</span></Label>
                                <Input
                                    id="degree"
                                    placeholder="e.g. B.Tech, M.Tech, BCA"
                                    value={formData.degree}
                                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                    className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="branch" className="font-semibold">Branch / Specialization <span className="text-red-500">*</span></Label>
                                <Input
                                    id="branch"
                                    placeholder="e.g. Computer Science Engineering"
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="semester" className="font-semibold">Current Semester <span className="text-red-500">*</span></Label>
                                <Input
                                    id="semester"
                                    type="number"
                                    min="1"
                                    max="20"
                                    placeholder="e.g. 1"
                                    value={formData.current_semester}
                                    onChange={(e) => setFormData({ ...formData, current_semester: e.target.value.replace(/\D/g, '') })}
                                    className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact" className="font-semibold">Contact Number <span className="text-red-500">*</span></Label>
                                <Input
                                    id="contact"
                                    placeholder="10-digit mobile number"
                                    value={formData.contact_number}
                                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={saving}
                                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Setup...</>
                                ) : (
                                    <>Save & Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
