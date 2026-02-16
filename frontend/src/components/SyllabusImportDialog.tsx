"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"

interface SyllabusImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImportSuccess: (data: any) => void
}

export function SyllabusImportDialog({ open, onOpenChange, onImportSuccess }: SyllabusImportDialogProps) {
    const { data: session } = useSession()
    const token = (session?.user as any)?.accessToken

    const [file, setFile] = useState<File | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scanProgress, setScanProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0]
            if (selected.type !== "application/pdf") {
                toast.error("Please upload a PDF file")
                return
            }
            setFile(selected)
            setError(null)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selected = e.dataTransfer.files[0]
            if (selected.type !== "application/pdf") {
                toast.error("Please upload a PDF file")
                return
            }
            setFile(selected)
            setError(null)
        }
    }

    const startImport = async () => {
        if (!file || !token) return

        setIsScanning(true)
        setScanProgress(10)
        setError(null)

        const formData = new FormData()
        formData.append("file", file)

        // Mock progress animation
        const progressInterval = setInterval(() => {
            setScanProgress(prev => Math.min(prev + 5, 90))
        }, 500)

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
            const res = await fetch(`${API_URL}/syllabus/parse`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            clearInterval(progressInterval)
            setScanProgress(100)

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to parse syllabus")
            }

            const data = await res.json()
            toast.success("Syllabus Scanned Successfully!")

            // Clean close
            setTimeout(() => {
                onImportSuccess(data)
                onOpenChange(false)
                resetState()
            }, 800)

        } catch (e: any) {
            clearInterval(progressInterval)
            setError(e.message)
            setIsScanning(false)
        }
    }

    const resetState = () => {
        setFile(null)
        setIsScanning(false)
        setScanProgress(0)
        setError(null)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!isScanning) { onOpenChange(val); if (!val) resetState(); } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Syllabus from PDF</DialogTitle>
                    <DialogDescription>
                        Upload your university syllabus PDF. AI will automatically extract Units and Topics.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!isScanning ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${file ? 'border-primary/20 bg-primary/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="application/pdf"
                                onChange={handleFileChange}
                            />

                            <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                {file ? (
                                    <FileText className="h-6 w-6 text-primary" />
                                ) : (
                                    <Upload className="h-6 w-6 text-slate-400" />
                                )}
                            </div>

                            {file ? (
                                <div>
                                    <p className="font-medium text-slate-900">{file.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-medium text-slate-900">Click to upload or drag and drop</p>
                                    <p className="text-xs text-slate-500 mt-1">PDF files only (max 10MB)</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative h-16 w-16">
                                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                                    {/* Background Circle */}
                                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    {/* Progress Circle */}
                                    <motion.path
                                        className="text-primary"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeDasharray={`${scanProgress}, 100`}
                                        initial={{ strokeDasharray: "0, 100" }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Analyzing Syllabus...</h3>
                                <p className="text-xs text-slate-500 mt-1">Extracting units and topics with AI</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isScanning}>Cancel</Button>
                        <Button
                            onClick={startImport}
                            disabled={!file || isScanning}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isScanning ? "Processing..." : "Import PDF"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
