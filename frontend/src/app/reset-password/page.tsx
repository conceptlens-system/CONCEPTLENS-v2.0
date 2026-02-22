"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

    if (!token) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Card className="w-[400px]">
                    <CardHeader>
                        <CardTitle className="text-red-500 flex items-center gap-2">
                            <AlertCircle /> Invalid Link
                        </CardTitle>
                        <CardDescription>This password reset link is invalid or missing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/login">Return to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirm) {
            toast.error("Passwords do not match")
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password })
            })

            if (res.ok) {
                setStatus("success")
            } else {
                setStatus("error")
            }
        } catch (e) {
            setStatus("error")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle className="text-xl">Set New Password</CardTitle>
                    <CardDescription>Create a strong password for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {status === "success" ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                            </div>
                            <h3 className="font-medium text-slate-900">Password Updated!</h3>
                            <p className="text-sm text-slate-500">
                                Your password has been reset successfully.
                            </p>
                            <Button asChild className="w-full mt-4">
                                <Link href="/login">Login with New Password</Link>
                            </Button>
                        </div>
                    ) : status === "error" ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <AlertCircle className="h-12 w-12 text-red-500" />
                            </div>
                            <h3 className="font-medium text-slate-900">Reset Failed</h3>
                            <p className="text-sm text-slate-500">
                                This link may be expired or invalid. Please try again.
                            </p>
                            <Button asChild className="w-full mt-4" variant="outline">
                                <Link href="/forgot-password">Try Again</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pass">New Password</Label>
                                <Input
                                    id="pass"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirm Password</Label>
                                <Input
                                    id="confirm"
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}
