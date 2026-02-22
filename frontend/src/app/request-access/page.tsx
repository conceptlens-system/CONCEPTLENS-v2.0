"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/AuthLayout"

export default function RequestAccessPage() {
    const router = useRouter()
    const [institutes, setInstitutes] = useState<any[]>([])
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        institution_id: "",
        subject_expertise: ""
    })
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        setIsLoading(true)
        fetch("http://localhost:8000/api/v1/institutes/")
            .then(res => res.json())
            .then(data => setInstitutes(data))
            .catch(err => {
                console.error("Failed to fetch institutes")
                toast.error("Failed to load institutions")
            })
            .finally(() => setIsLoading(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const res = await fetch("http://localhost:8000/api/v1/professors/request-access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || "Request failed")
            }

            setSubmitted(true)
            toast.success("Request submitted successfully!")
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (submitted) {
        return (
            <AuthLayout
                title="Request Submitted"
                subtitle="We have received your application."
                heroTitle={
                    <>
                        Empower Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Teaching
                        </span>
                    </>
                }
                heroSubtitle="Request access to join your institution. Collaborate with colleagues and manage student success effectively."
            >
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 max-w-xs">
                        Your request for professor access has been sent for administrative approval. You will receive an email once approved.
                    </p>
                    <Button asChild className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Link href="/login">Return to Login</Link>
                    </Button>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Professor Access"
            subtitle="Join an institution to manage classes and exams."
            heroTitle={
                <>
                    Empower Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        Teaching
                    </span>
                </>
            }
            heroSubtitle="Request access to join your institution. Collaborate with colleagues and manage student success effectively."
        >
            <div className="grid gap-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="Dr. Jane Smith"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="professor@university.edu"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="institute">Institution</Label>
                            <Select
                                value={formData.institution_id}
                                onValueChange={(val) => setFormData({ ...formData, institution_id: val })}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select Institution" />
                                </SelectTrigger>
                                <SelectContent>
                                    {institutes.map(inst => (
                                        <SelectItem key={inst._id} value={inst._id}>
                                            {inst.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject Expertise</Label>
                            <Input
                                id="subject"
                                placeholder="Computer Science, Physics..."
                                value={formData.subject_expertise}
                                onChange={(e) => setFormData({ ...formData, subject_expertise: e.target.value })}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>

                        <Button type="submit" className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit Request
                        </Button>
                    </div>
                </form>

                <p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Link
                        href="/login"
                        className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    >
                        Cancel and Return to Login
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}
