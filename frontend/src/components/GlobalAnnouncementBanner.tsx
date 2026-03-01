"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { fetchGlobalAnnouncements } from "@/lib/api"
import { AlertTriangle, Info, AlertOctagon, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function GlobalAnnouncementBanner() {
    const { data: session } = useSession()
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

    useEffect(() => {
        async function loadAnnouncements() {
            try {
                // Fetch only active announcements
                const data = await fetchGlobalAnnouncements(undefined, true)
                // Filter out dismissed announcements
                const savedDismissed = JSON.parse(localStorage.getItem("dismissedAnnouncements") || "{}")
                setDismissed(savedDismissed)
                setAnnouncements(data)
            } catch (error) {
                console.error("Failed to load announcements", error)
            }
        }
        loadAnnouncements()
    }, [])

    const handleDismiss = (id: string) => {
        const newDismissed = { ...dismissed, [id]: true }
        setDismissed(newDismissed)
        localStorage.setItem("dismissedAnnouncements", JSON.stringify(newDismissed))
    }

    const activeAnnouncements = announcements.filter(a => !dismissed[a._id])

    if (activeAnnouncements.length === 0) return null;

    return (
        <div className="w-full flex justify-center p-4 z-50 fixed bottom-0 left-0 space-y-2 flex-col items-center pointer-events-none">
            {activeAnnouncements.map((announcement) => {
                let Icon = Info
                let alertColor = "bg-blue-50 border-blue-200 text-blue-900"
                let iconColor = "text-blue-600"

                if (announcement.type === "warning") {
                    Icon = AlertTriangle
                    alertColor = "bg-amber-50 border-amber-200 text-amber-900"
                    iconColor = "text-amber-600"
                } else if (announcement.type === "critical") {
                    Icon = AlertOctagon
                    alertColor = "bg-red-50 border-red-200 text-red-900"
                    iconColor = "text-red-600"
                }

                return (
                    <Alert key={announcement._id} className={`max-w-3xl shadow-lg pointer-events-auto flex items-start flex-row gap-3 relative animate-in slide-in-from-bottom-5 fade-in duration-300 ${alertColor}`}>
                        <Icon className={`h-5 w-5 mt-0.5 ${iconColor}`} />
                        <div className="flex-1 pr-8">
                            <AlertTitle className="font-semibold">{announcement.title}</AlertTitle>
                            <AlertDescription className="mt-1 text-sm opacity-90">
                                {announcement.message}
                            </AlertDescription>
                        </div>
                        <button
                            onClick={() => handleDismiss(announcement._id)}
                            className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 transition-colors"
                        >
                            <X className="h-4 w-4 opacity-70 hover:opacity-100" />
                        </button>
                    </Alert>
                )
            })}
        </div>
    )
}
