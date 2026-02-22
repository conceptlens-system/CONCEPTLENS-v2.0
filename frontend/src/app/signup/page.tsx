"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/AuthLayout"
import Link from "next/link"

export default function SignupPage() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: name,
                }),
            })

            if (res.ok) {
                toast.success("Account created successfully! Please login.")
                router.push("/login")
            } else {
                const data = await res.json()
                toast.error(data.detail || "Signup failed")
            }
        } catch (err) {
            console.error(err)
            toast.error("Failed to connect to server")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Start your journey with ConceptLens today."
            heroTitle={
                <>
                    Join the Future <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        of Education
                    </span>
                </>
            }
            heroSubtitle="Create an account to start tracking progress, identifying misconceptions, and improving learning outcomes."
        >
            <div className="grid gap-6">
                <form onSubmit={handleSignup}>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                type="text"
                                autoCapitalize="words"
                                autoComplete="name"
                                disabled={isLoading}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <Button disabled={isLoading} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create Account
                        </Button>
                    </div>
                </form>

                <p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    >
                        Sign In
                    </Link>
                </p>

                <div className="text-center text-xs text-slate-400 mt-2">
                    By clicking continue, you agree to our{" "}
                    <a href="/terms" className="underline hover:text-slate-500">Terms of Service</a>{" "}
                    and{" "}
                    <a href="/privacy" className="underline hover:text-slate-500">Privacy Policy</a>.
                </div>
            </div>
        </AuthLayout>
    )
}
