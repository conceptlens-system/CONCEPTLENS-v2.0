"use client"

import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { fetchGlobalSettings, updateGlobalSettings } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Settings, Save, Loader2, AlertTriangle, Shield, HardDrive, Bell } from "lucide-react"
import { toast } from "sonner"

export default function AdminSettingsPage() {
    const { data: session } = useSession()
    const [settings, setSettings] = useState({
        ai_features_enabled: true,
        maintenance_mode: false,
        max_upload_size_mb: 10,
        system_notification: ""
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        async function loadSettings() {
            if (!session?.user) return
            try {
                // @ts-ignore
                const data = await fetchGlobalSettings((session.user as any).accessToken)
                setSettings({
                    ai_features_enabled: data.ai_features_enabled ?? true,
                    maintenance_mode: data.maintenance_mode ?? false,
                    max_upload_size_mb: data.max_upload_size_mb ?? 10,
                    system_notification: data.system_notification ?? ""
                })
            } catch (err: any) {
                console.error(err)
                setError("Failed to load global configurations")
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [session])

    const handleSave = async () => {
        setSaving(true)
        try {
            // @ts-ignore
            await updateGlobalSettings((session.user as any).accessToken, settings)
            toast.success("Platform settings updated successfully")
        } catch (err: any) {
            console.error(err)
            toast.error("Failed to save settings")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageTransition>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <Settings className="h-8 w-8 text-indigo-600" />
                            Global Configurations
                        </h1>
                        <p className="mt-2 text-slate-500">Manage platform-wide settings and maintenance controls.</p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 animate-pulse">
                        Loading preferences...
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                ) : (
                    <div className="space-y-6 mt-8">

                        {/* Feature Toggles Card */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Shield className="h-5 w-5 text-indigo-500" />
                                    Platform Features
                                </CardTitle>
                                <CardDescription>Enable or disable core system capabilities globally.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-row items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Gemini AI Features</Label>
                                        <p className="text-sm text-slate-500">
                                            Allow professors to auto-generate AI exams and summaries. Disable if API quota is reached.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.ai_features_enabled}
                                        onCheckedChange={(c) => setSettings({ ...settings, ai_features_enabled: c })}
                                    />
                                </div>

                                <div className="flex flex-row items-center justify-between rounded-lg border border-red-100 bg-red-50/30 p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base text-red-900 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            Maintenance Mode
                                        </Label>
                                        <p className="text-sm text-red-600/80">
                                            Restricts login for all non-admin users. Use only during active major upgrades.
                                        </p>
                                        {settings.maintenance_mode && (
                                            <span className="inline-block mt-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded">WARNING: PLATFORM IS OFFLINE FOR USERS</span>
                                        )}
                                    </div>
                                    <Switch
                                        checked={settings.maintenance_mode}
                                        onCheckedChange={(c) => setSettings({ ...settings, maintenance_mode: c })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* System Limits Card */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <HardDrive className="h-5 w-5 text-blue-500" />
                                    Resource Limits
                                </CardTitle>
                                <CardDescription>Configure file sizes and storage quotas.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="maxUpload">Max Upload Size (MB)</Label>
                                    <div className="flex items-center gap-2 max-w-sm">
                                        <Input
                                            id="maxUpload"
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={settings.max_upload_size_mb}
                                            onChange={(e) => setSettings({ ...settings, max_upload_size_mb: parseInt(e.target.value) || 10 })}
                                        />
                                        <span className="text-sm text-slate-500 font-medium">Megabytes</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Limits the size of PDF syllabus uploads for all professors.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Announcements Card */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Bell className="h-5 w-5 text-amber-500" />
                                    Global Announcements
                                </CardTitle>
                                <CardDescription>Display a universal banner at the top of every user's dashboard.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sysNotif">Banner Message (Leave blank to disable)</Label>
                                    <Input
                                        id="sysNotif"
                                        placeholder="e.g. Scheduled maintenance on Sunday at 2 AM EST..."
                                        value={settings.system_notification}
                                        onChange={(e) => setSettings({ ...settings, system_notification: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                )}
            </PageTransition>
        </div>
    )
}
