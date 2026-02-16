"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LogOut, User, Save, Edit2, School, BookOpen, Lock } from "lucide-react"
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog"
import { signOut, useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { joinClass, fetchUserProfile, updateUserProfile } from "@/lib/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/PageTransition"

export default function StudentProfilePage() {
    const { data: session, status } = useSession()
    const [classCode, setClassCode] = useState("")
    const [joining, setJoining] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [passwordOpen, setPasswordOpen] = useState(false)

    // User Data State
    const [profile, setProfile] = useState<any>({})
    const [formData, setFormData] = useState({
        full_name: "",
        contact_number: "",
        department: "",
        branch: "",
        institute_name: "",
        linkedin_url: "",
        academic_history: ""
    })

    useEffect(() => {
        if (status === "loading") return

        if (status === "unauthenticated" || !session) {
            setLoading(false)
            return
        }

        if ((session?.user as any)?.accessToken) {
            loadProfile()
        } else {
            setLoading(false)
        }
    }, [session, status])

    const loadProfile = async () => {
        try {
            const token = (session?.user as any)?.accessToken
            const data = await fetchUserProfile(token)
            setProfile(data)
            setFormData({
                full_name: data.full_name || "",
                contact_number: data.contact_number || data.phone || "",
                department: data.department || "",
                branch: data.branch || "",
                institute_name: data.institute_name || "",
                linkedin_url: data.linkedin_url || "",
                academic_history: data.academic_history || ""
            })
        } catch (e) {
            console.error(e)
            toast.error("Failed to load profile")
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async () => {
        // Mandatory Profile Check
        const missingFields = []
        if (!profile.contact_number) missingFields.push("Contact Number")
        if (!profile.department) missingFields.push("Department")
        if (!profile.branch) missingFields.push("Branch")
        if (!profile.institute_name) missingFields.push("Institute Name")
        if (!profile.academic_history) missingFields.push("Academic History")

        if (missingFields.length > 0) {
            toast.error(`Please complete your profile first! Missing: ${missingFields.join(", ")}`)
            setIsEditing(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        if (!classCode || !session) return
        const token = (session?.user as any)?.accessToken
        setJoining(true)
        try {
            const res = await joinClass(classCode, token)
            toast.success(res.message || "Request sent")
            setClassCode("")
        } catch (e: any) {
            toast.error(e.message || "Failed to join")
        } finally {
            setJoining(false)
        }
    }

    const handleSave = async () => {
        if (!session) return
        const token = (session?.user as any)?.accessToken

        try {
            if (!/^\d{10}$/.test(formData.contact_number)) {
                toast.error("Contact number must be exactly 10 digits")
                return
            }

            const payload = {
                ...formData
            }

            setSaving(true)
            const updated = await updateUserProfile(payload, token)
            setProfile(updated)
            setIsEditing(false)
            toast.success("Profile updated successfully")
        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Failed to update profile")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>

    return (
        <PageTransition className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-500 mt-2">Manage your academic identity and class enrollments.</p>
                </div>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => signOut({ callbackUrl: "/login" })}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Core Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium flex items-center gap-2">
                                <User className="h-5 w-5 text-indigo-600" />
                                Personal & Academic Details
                            </CardTitle>
                            {!isEditing ? (
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving}>
                                        {saving ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save</>}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Number</Label>
                                    <Input
                                        placeholder="10-digit mobile number"
                                        value={formData.contact_number}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                                            setFormData({ ...formData, contact_number: val })
                                        }}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Institute Name</Label>
                                    <Input
                                        placeholder="e.g. IIT Bombay"
                                        value={formData.institute_name}
                                        onChange={(e) => setFormData({ ...formData, institute_name: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Input
                                        placeholder="e.g. Computer Science"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Branch</Label>
                                    <Input
                                        placeholder="e.g. B.Tech"
                                        value={formData.branch}
                                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>LinkedIn URL</Label>
                                <Input
                                    value={formData.linkedin_url}
                                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Academic History</Label>
                                <Textarea
                                    placeholder="Previous schools, degrees..."
                                    value={formData.academic_history}
                                    onChange={(e) => setFormData({ ...formData, academic_history: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Account Info & Join Class */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-700">Account Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {session?.user?.name?.[0] || "S"}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{session?.user?.name}</p>
                                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Role</p>
                                <Badge>Student</Badge>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => setPasswordOpen(true)}>
                                <Lock className="mr-2 h-4 w-4" /> Change Password
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <School className="h-4 w-4 text-indigo-600" />
                                Join a Class
                            </CardTitle>
                            <CardDescription>Enter code provided by professor.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="CODE123"
                                    className="font-mono uppercase tracking-widest text-center text-lg"
                                    maxLength={6}
                                    value={classCode}
                                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            <Button onClick={handleJoin} disabled={joining} className="w-full bg-blue-600 hover:bg-blue-700">
                                {joining ? "Joining..." : "Join Class"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ChangePasswordDialog
                isOpen={passwordOpen}
                onClose={() => setPasswordOpen(false)}
                token={(session?.user as any)?.accessToken}
            />
        </PageTransition>
    )
}
