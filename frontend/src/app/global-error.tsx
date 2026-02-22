'use client'

import { Button } from "@/components/ui/button"
import { useEffect } from "react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center p-4">
                    <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
                    <p className="text-slate-600 max-w-md">
                        We encountered an unexpected error. Don't worry, the rest of the application is likely fine.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => reset()} variant="default">
                            Try again
                        </Button>
                        <Button onClick={() => window.location.href = '/'} variant="outline">
                            Go Home
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-slate-200 rounded text-left overflow-auto max-w-2xl max-h-64 text-xs font-mono">
                            {error.message}
                            <br />
                            {error.stack}
                        </div>
                    )}
                </div>
            </body>
        </html>
    )
}
