import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { fetchPublicProfile } from "@/lib/api"
import { User, Briefcase, GraduationCap, Mail, Phone, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface UserProfileDialogProps {
    userId: string | null
    isOpen: boolean
    onClose: () => void
    token: string
}

export function UserProfileDialog({ userId, isOpen, onClose, token }: UserProfileDialogProps) {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && userId) {
            loadData()
        } else {
            setProfile(null)
        }
    }, [isOpen, userId])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchPublicProfile(userId!, token)
            setProfile(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Student Profile</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-slate-500">Loading profile details...</div>
                ) : profile ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border">
                                <User className="h-8 w-8 text-slate-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
                                <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                                    <Mail className="h-3 w-3" /> {profile.email}
                                </div>
                            </div>
                        </div>

                        {profile.bio && (
                            <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-600 leading-relaxed border">
                                {profile.bio}
                            </div>
                        )}

                        <div className="space-y-3">
                            {profile.skills && profile.skills.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2 flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" /> Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {profile.skills.map((s: string) => (
                                            <Badge key={s} variant="outline" className="bg-white">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profile.academic_history && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2 flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" /> Education
                                    </h4>
                                    <p className="text-sm text-slate-700">{profile.academic_history}</p>
                                </div>
                            )}

                            <div className="flex justify-between pt-2">
                                {profile.phone && (
                                    <div className="text-sm">
                                        <span className="text-slate-500 block text-xs uppercase font-semibold">Phone</span>
                                        {profile.phone}
                                    </div>
                                )}
                                {profile.linkedin_url && (
                                    <div className="text-sm text-right">
                                        <span className="text-slate-500 block text-xs uppercase font-semibold">LinkedIn</span>
                                        <a href={profile.linkedin_url} target="_blank" className="text-blue-600 hover:underline">
                                            View Profile
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-red-500">Failed to load profile.</div>
                )}
            </DialogContent>
        </Dialog>
    )
}
