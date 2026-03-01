"use client"

import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { Database, Download, History, ArrowLeft, ServerCrash, Clock, CheckCircle2 } from "lucide-react"
import { triggerDatabaseBackup } from "@/lib/api"
import { toast } from "sonner"
import Link from "next/link"

export default function BackupRestorePage() {
    const { data: session } = useSession()
    const [generating, setGenerating] = useState(false)
    const [lastBackup, setLastBackup] = useState<string | null>(null)

    const handleGenerateBackup = async () => {
        setGenerating(true)
        try {
            const token = (session?.user as any).accessToken
            await triggerDatabaseBackup(token)

            setLastBackup(new Date().toLocaleString())
            toast.success("Backup package generated and downloaded!")
        } catch (error) {
            console.error(error)
            toast.error("Failed to generate database backup")
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <PageTransition>
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <Database className="h-8 w-8 text-blue-600" />
                            Backup & Restore
                        </h1>
                        <p className="mt-2 text-slate-500">Generate on-demand payload snapshots for disaster recovery.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Manual Snapshot */}
                    <Card className="border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <ServerCrash className="w-32 h-32" />
                        </div>
                        <CardHeader className="relative z-10">
                            <CardTitle className="text-xl">Manual Snapshot</CardTitle>
                            <CardDescription>
                                Compile a JSON package of all active Users, Institutions, and Exam banks.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-6">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                                <Clock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Last Generated Snapshot</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {lastBackup || "None generated in this session."}
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerateBackup}
                                disabled={generating}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                size="lg"
                            >
                                {generating ? (
                                    <>
                                        <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                        Bundling Data Payload...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-5 w-5" />
                                        Download System Snapshot
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Information / Future capabilities */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-slate-500" />
                                Retention Policy
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                    <p className="text-sm text-slate-600">Manual snapshots bypass rate limits and capture live production data instantly.</p>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                    <p className="text-sm text-slate-600">Passwords and sensitive authentication hashes are automatically scrubbed from the export.</p>
                                </div>
                                <div className="flex gap-3 opacity-60">
                                    <Clock className="h-5 w-5 text-slate-400 shrink-0" />
                                    <p className="text-sm text-slate-600 italic">Automated nightly physical backups are managed via external continuous deployment pipelines.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PageTransition>
        </div>
    )
}
