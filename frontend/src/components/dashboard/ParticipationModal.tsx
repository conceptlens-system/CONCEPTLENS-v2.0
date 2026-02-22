import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Users, AlertTriangle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Student {
    id: string;
    name: string;
    email: string;
}

interface ParticipationModalProps {
    open: boolean;
    onClose: () => void;
    data: {
        total_assigned: number;
        total_attempted: number;
        non_attempted: Student[];
    };
    examTitle: string;
}

export function ParticipationModal({ open, onClose, data, examTitle }: ParticipationModalProps) {
    const participationRate = data.total_assigned > 0
        ? Math.round((data.total_attempted / data.total_assigned) * 100)
        : 0;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        Participation Details
                    </DialogTitle>
                    <DialogDescription>
                        Overview for <strong>{examTitle}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="bg-slate-50 p-3 rounded-lg border text-center">
                        <span className="text-sm text-slate-500 block mb-1">Participation Rate</span>
                        <span className="text-2xl font-bold text-slate-800">{participationRate}%</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border text-center">
                        <span className="text-sm text-slate-500 block mb-1">Missing Submissions</span>
                        <span className="text-2xl font-bold text-rose-600">{data.non_attempted.length}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Students Yet to Attempt
                    </h4>

                    <ScrollArea className="h-[200px] w-full rounded-md border p-1">
                        {data.non_attempted.length > 0 ? (
                            <div className="space-y-1">
                                {data.non_attempted.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md group">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800">{student.name}</span>
                                            <span className="text-xs text-slate-400">{student.email}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" title="Send Email">
                                            <Mail className="h-3 w-3 text-slate-400 hover:text-indigo-600" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                                <p>All assigned students have attempted!</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    )
}
