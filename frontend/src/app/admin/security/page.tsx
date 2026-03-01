"use client"

import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { ShieldCheck, ShieldAlert, Save, Ban, AlertTriangle, ArrowLeft } from "lucide-react"
import { fetchSecurityConfig, updateSecurityConfig } from "@/lib/api"
import { toast } from "sonner"
import Link from "next/link"

export default function SecurityConfigPage() {
    const { data: session } = useSession()
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form state
    const [rateLimitRequests, setRateLimitRequests] = useState(100)
    const [rateLimitWindow, setRateLimitWindow] = useState(15)
    const [maintenanceMode, setMaintenanceMode] = useState(false)
    const [bannedIps, setBannedIps] = useState<string>("")

    useEffect(() => {
        async function loadConfig() {
            if (!session?.user) return
            try {
                const token = (session.user as any).accessToken
                const data = await fetchSecurityConfig(token)
                setConfig(data)
                setRateLimitRequests(data.rate_limit_requests)
                setRateLimitWindow(data.rate_limit_window_minutes)
                setMaintenanceMode(data.maintenance_mode)
                setBannedIps(data.banned_ips?.join("\n") || "")
            } catch (err: any) {
                console.error(err)
                toast.error("Failed to load security configuration")
            } finally {
                setLoading(false)
            }
        }
        loadConfig()
    }, [session])

    const handleSave = async () => {
        setSaving(true)
        try {
            const token = (session?.user as any).accessToken

            // Parse IPs from textarea
            const ipsList = bannedIps
                .split("\n")
                .map(ip => ip.trim())
                .filter(ip => ip.length > 0)

            const payload = {
                rate_limit_requests: Number(rateLimitRequests),
                rate_limit_window_minutes: Number(rateLimitWindow),
                maintenance_mode: maintenanceMode,
                banned_ips: ipsList
            }

            await updateSecurityConfig(token, payload)
            toast.success("Security configuration updated")
        } catch (error) {
            console.error(error)
            toast.error("Failed to save configuration")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="h-[400px] flex items-center justify-center text-slate-400 animate-pulse">
                Loading security policies...
            </div>
        )
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
                            <ShieldCheck className="h-8 w-8 text-emerald-600" />
                            Security Configuration
                        </h1>
                        <p className="mt-2 text-slate-500">Manage API rate limits, IP bans, and global platform security.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rate Limiting */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-blue-500" />
                                API Rate Limiting
                            </CardTitle>
                            <CardDescription>Protect the API against DDoS and rapid request scraping.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="requests">Max Requests</Label>
                                <Input
                                    id="requests"
                                    type="number"
                                    value={rateLimitRequests}
                                    onChange={(e) => setRateLimitRequests(e.target.value as any)}
                                />
                                <p className="text-xs text-slate-500">Maximum allowed API requests per time window.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="window">Time Window (Minutes)</Label>
                                <Input
                                    id="window"
                                    type="number"
                                    value={rateLimitWindow}
                                    onChange={(e) => setRateLimitWindow(e.target.value as any)}
                                />
                                <p className="text-xs text-slate-500">Duration before request count resets.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Access Control */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Ban className="h-5 w-5 text-red-500" />
                                    IP Blocklist
                                </CardTitle>
                                <CardDescription>Deny access to specific IP addresses.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="ips">Banned IP Addresses (One per line)</Label>
                                    <textarea
                                        id="ips"
                                        rows={4}
                                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                        placeholder="192.168.1.1&#10;10.0.0.5"
                                        value={bannedIps}
                                        onChange={(e) => setBannedIps(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={maintenanceMode ? "border-amber-300 bg-amber-50" : ""}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className={maintenanceMode ? "text-amber-600 h-5 w-5" : "text-amber-500 h-5 w-5"} />
                                    Maintenance Override
                                </CardTitle>
                                <CardDescription>Immediately lock out all non-admin users.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Maintenance Mode</Label>
                                    <p className="text-sm text-slate-500">
                                        Suspend platform access
                                    </p>
                                </div>
                                <Switch
                                    checked={maintenanceMode}
                                    onCheckedChange={setMaintenanceMode}
                                    className={maintenanceMode ? "data-[state=checked]:bg-amber-600" : ""}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-50 border-t-transparent animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? "Deploying Policy..." : "Save Policies"}
                    </Button>
                </div>
            </PageTransition>
        </div>
    )
}
