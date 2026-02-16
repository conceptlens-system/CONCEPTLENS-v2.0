"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Mail, Building, BookOpen, GraduationCap } from "lucide-react"

interface ProfessorProfileDialogProps {
    professor: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProfessorProfileDialog({ professor, open, onOpenChange }: ProfessorProfileDialogProps) {
    if (!professor) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-700">
                            {professor.full_name?.[0] || "P"}
                        </div>
                        <div>
                            <DialogTitle className="text-xl">{professor.full_name}</DialogTitle>
                            <DialogDescription className="text-base flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4" /> {professor.email}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Department & Institute */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 font-medium uppercase mb-1">Department</p>
                            <p className="font-medium flex items-center gap-2">
                                <Building className="h-4 w-4 text-slate-400" />
                                {professor.department || "--"}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 font-medium uppercase mb-1">Institute</p>
                            <p className="font-medium flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-slate-400" />
                                {professor.institute_name || "--"}
                            </p>
                        </div>
                    </div>

                    {/* Research Interests */}
                    {professor.research_interests && professor.research_interests.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-slate-500" />
                                Research Interests
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {professor.research_interests.map((interest: string, i: number) => (
                                    <Badge key={i} variant="secondary">{interest}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bio */}
                    {professor.bio && (
                        <div className="text-sm text-slate-600 border-t pt-4">
                            <p>{professor.bio}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
