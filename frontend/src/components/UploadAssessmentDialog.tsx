"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { toast } from "sonner"
import { ingestResponses } from "@/lib/api"
import { Plus, Trash2 } from "lucide-react"

export function UploadAssessmentDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Manual Entry State
    const [assessmentName, setAssessmentName] = useState("Math-101-Quiz-1")
    const [manualEntries, setManualEntries] = useState([
        { student_id: "", question_id: "", response_text: "" }
    ])

    const addRow = () => {
        setManualEntries([...manualEntries, { student_id: "", question_id: "", response_text: "" }])
    }

    const removeRow = (index: number) => {
        const newEntries = [...manualEntries]
        newEntries.splice(index, 1)
        setManualEntries(newEntries)
    }

    const updateEntry = (index: number, field: string, value: string) => {
        const newEntries = [...manualEntries]
        newEntries[index] = { ...newEntries[index], [field]: value }
        setManualEntries(newEntries)
    }

    const handleUpload = async () => {
        // Validate
        const validEntries = manualEntries.filter(e => e.student_id && e.question_id && e.response_text)
        if (validEntries.length === 0) {
            toast.error("No data", { description: "Please add at least one student response." })
            return
        }

        setLoading(true)
        try {
            const payload = validEntries.map(e => ({
                assessment_id: assessmentName,
                student_id: e.student_id,
                question_id: e.question_id,
                response_text: e.response_text,
                is_correct: false // Assume teacher is inputting incorrect answers for analysis
            }))

            await ingestResponses(payload)

            toast.success("Analysis Started", {
                description: `Processing ${payload.length} student responses...`,
            })
            setOpen(false)
            // Reset form
            setManualEntries([{ student_id: "", question_id: "", response_text: "" }])
        } catch (e) {
            toast.error("Upload Failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 text-white hover:bg-slate-800">Upload Data</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Input Student Responses</DialogTitle>
                    <DialogDescription>
                        Enter incorrect student answers below. The AI will analyze them for shared misconceptions.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Assessment ID</Label>
                        <Input
                            id="name"
                            value={assessmentName}
                            onChange={(e) => setAssessmentName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <div className="border rounded-md p-4 bg-slate-50 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-slate-700">Student Responses (Incorrect Only)</h3>
                            <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add Row</Button>
                        </div>

                        {manualEntries.map((entry, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <div className="w-24">
                                    <Input
                                        placeholder="Ques ID"
                                        value={entry.question_id}
                                        onChange={(e) => updateEntry(idx, 'question_id', e.target.value)}
                                    />
                                </div>
                                <div className="w-32">
                                    <Input
                                        placeholder="Student ID"
                                        value={entry.student_id}
                                        onChange={(e) => updateEntry(idx, 'student_id', e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        placeholder="Student's incorrect Answer..."
                                        value={entry.response_text}
                                        onChange={(e) => updateEntry(idx, 'response_text', e.target.value)}
                                    />
                                </div>
                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeRow(idx)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="submit" onClick={handleUpload} disabled={loading}>
                        {loading ? "Analyzing..." : "Run AI Analysis"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
