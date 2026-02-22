'use client'

import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Something went wrong in this section!</h2>
            <p className="text-sm text-slate-500 text-center max-w-sm">
                You can try reloading this specific component without refreshing the whole page.
            </p>
            <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Try again
            </Button>
        </div>
    )
}
