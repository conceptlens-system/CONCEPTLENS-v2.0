"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LogOut, User, School, Save, Edit2, MapPin, Briefcase, GraduationCap, Clock, BookOpen, Lock } from "lucide-react"
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog"
import { signOut, useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { fetchUserProfile, updateUserProfile } from "@/lib/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/PageTransition"

export default function ProfessorProfilePage() {
    const { data: session, status } = useSession()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [passwordOpen, setPasswordOpen] = useState(false)

    const [profile, setProfile] = useState<any>(null)
    const [formData, setFormData] = useState({
        full_name: "",
        bio: "",
        phone: "",
        skills: "", // Used for Research Interests
        office_hours: "",
        linkedin_url: "",
        academic_history: "",
        research_interests: "",
        department: "",
        designation: "",
        employee_id: ""
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

            // Map skills -> research_interests for professor if desired, or keep separate?
            // Schema has both. Let's use research_interests.
            const interests = data.research_interests ? data.research_interests.join(", ") : ""

            setFormData({
                full_name: data.full_name || "",
                bio: data.bio || "",
                phone: data.phone || "",
                skills: data.skills ? data.skills.join(", ") : "",
                office_hours: data.office_hours || "",
                linkedin_url: data.linkedin_url || "",
                academic_history: data.academic_history || "",
                research_interests: interests,
                department: data.department || "",
                designation: data.designation || "",
                employee_id: data.employee_id || ""
            })
        } catch (e) {
            console.error(e)
            toast.error("Failed to load profile")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!session) return
        const token = (session?.user as any)?.accessToken

        try {
            const payload = {
                full_name: formData.full_name,
                bio: formData.bio,
                phone: formData.phone,
                // Split strings to array
                research_interests: formData.research_interests.split(",").map(s => s.trim()).filter(Boolean),
                office_hours: formData.office_hours,
                linkedin_url: formData.linkedin_url,
                academic_history: formData.academic_history,
                department: formData.department,
                designation: formData.designation,
                employee_id: formData.employee_id
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
                    <h1 className="text-3xl font-bold text-slate-900">Professor Profile</h1>
                    <p className="text-slate-500 mt-2">Manage your academic identity and office details.</p>
                </div>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => signOut()}>
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
                                    <Label>Department</Label>
                                    <Input
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="e.g. Computer Science"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Designation</Label>
                                    <Input
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="e.g. Associate Professor"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Employee / Faculty ID</Label>
                                <Input
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="e.g. FAC-12345"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Bio / About Me</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    placeholder="Tell students about your expertise..."
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Research Interests (Comma separated)</Label>
                                <Input
                                    placeholder="e.g. AI, Machine Learning, Data Science"
                                    value={formData.research_interests}
                                    onChange={(e) => setFormData({ ...formData, research_interests: e.target.value })}
                                    disabled={!isEditing}
                                />
                                {!isEditing && profile?.research_interests && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {profile.research_interests.map((s: string) => (
                                            <Badge key={s} variant="secondary">{s}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Office Hours</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-9"
                                            placeholder="e.g. Mon/Wed 2-4 PM"
                                            value={formData.office_hours}
                                            onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
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
                            </div>

                            <div className="space-y-2">
                                <Label>Academic History</Label>
                                <Textarea
                                    placeholder="PhD from..., MSc from..."
                                    value={formData.academic_history}
                                    onChange={(e) => setFormData({ ...formData, academic_history: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Account Info */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-700">Account Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {session?.user?.name?.[0] || "P"}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{session?.user?.name}</p>
                                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Role</p>
                                <Badge>Professor</Badge>
                            </div>
                            <Button variant="outline" className="w-full bg-white justify-start mt-4" onClick={() => setPasswordOpen(true)}>
                                <Lock className="mr-2 h-4 w-4" /> Change Password
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-100">
                        <CardHeader>
                            <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" /> Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full bg-white justify-start" onClick={() => window.location.href = '/professor/classes'}>
                                Manage Classes
                            </Button>
                            <Button variant="outline" className="w-full bg-white justify-start" onClick={() => window.location.href = '/professor/misconceptions'}>
                                View Misconceptions
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
