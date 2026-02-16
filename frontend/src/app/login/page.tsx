"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Chrome, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/AuthLayout"
import Link from "next/link"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const result = await signIn("credentials", {
                username: email,
                password: password,
                redirect: false,
            })

            if (result?.ok) {
                const sessionRes = await fetch("/api/auth/session")
                const session = await sessionRes.json()

                toast.success("Welcome back!")

                if (session?.user?.role === "admin") {
                    router.push("/admin")
                } else if (session?.user?.role === "student") {
                    router.push("/student")
                } else {
                    router.push("/professor")
                }
            } else {
                toast.error("Login Failed. Please check your credentials.")
            }
        } catch (err) {
            console.error(err)
            toast.error("An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = () => {
        signIn("google", { callbackUrl: "/professor" })
    }

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Enter your credentials to access your account."
            heroTitle={
                <>
                    Unlock Potential <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        With Analytics
                    </span>
                </>
            }
            heroSubtitle="Gain deep insights into student performance and learning gaps. Log in to access your dashboard."
        >
            <div className="grid gap-6">
                <form onSubmit={handleLogin}>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Forgot password?
                                </Link>
                            </div>
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
                            Sign In
                        </Button>
                    </div>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-black px-2 text-slate-500">
                            Or continue with
                        </span>
                    </div>
                </div>

                <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleLogin} className="h-11">
                    <Chrome className="mr-2 h-4 w-4" />
                    Google
                </Button>

                <div className="text-center text-xs text-slate-400 mt-2">
                    Are you a professor?{" "}
                    <Link
                        href="/request-access"
                        className="underline hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        Request Access
                    </Link>
                </div>

                <p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}
