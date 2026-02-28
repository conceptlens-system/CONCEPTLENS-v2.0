"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { cn } from "@/lib/utils"

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry"
]

export default function RequestAccessPage() {
    const router = useRouter()
    const [institutes, setInstitutes] = useState<any[]>([])
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        institution_id: "",
        new_institution_name: "",
        state: "",
        city: "",
        department: "",
        designation: "",
        employee_id: "",
        linkedin_url: "",
        subject_expertise: ""
    })
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [isNewInstitution, setIsNewInstitution] = useState(false)
    const [instOpen, setInstOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredInstitutes = institutes.filter(inst => {
        let matchesState = true;
        let matchesCity = true;

        if (formData.state) {
            const stateQuery = formData.state.toLowerCase();
            const instState = (inst.state || "").toLowerCase();
            const instLoc = (inst.location || "").toLowerCase();
            matchesState = instState.includes(stateQuery) || instLoc.includes(stateQuery);
        }
        if (formData.city) {
            const cityQuery = formData.city.toLowerCase().trim();
            const instCity = (inst.city || "").toLowerCase();
            const instLoc = (inst.location || "").toLowerCase();
            // A city match is true if the institution's city or location string contains the city name
            matchesCity = instCity.includes(cityQuery) || instLoc.includes(cityQuery);
        }

        return matchesState && matchesCity;
    })

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
                            <p className="text-[10px] text-slate-500 mt-1">Please use your official .edu or institutional email if possible.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="state">State</Label>
                                <Select
                                    value={formData.state}
                                    onValueChange={(val) => setFormData({ ...formData, state: val })}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INDIAN_STATES.map(state => (
                                            <SelectItem key={state} value={state}>{state}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="e.g. Mumbai"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    disabled={isLoading}
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center text-sm">
                                <Label>Institute</Label>
                                <button
                                    type="button"
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                    onClick={() => {
                                        setIsNewInstitution(!isNewInstitution)
                                        setFormData({ ...formData, institution_id: "", new_institution_name: "" })
                                    }}
                                >
                                    {isNewInstitution ? "Select Existing Instead" : "+ Add My Institution"}
                                </button>
                            </div>

                            {isNewInstitution ? (
                                <Input
                                    placeholder="Enter full institution name..."
                                    value={formData.new_institution_name}
                                    onChange={(e) => setFormData({ ...formData, new_institution_name: e.target.value })}
                                    disabled={isLoading}
                                    className="h-11"
                                    required
                                />
                            ) : (
                                <Popover open={instOpen} onOpenChange={setInstOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={instOpen}
                                            className="w-full h-11 justify-between font-normal text-slate-700 bg-white"
                                            disabled={isLoading}
                                        >
                                            {formData.institution_id
                                                ? filteredInstitutes.find((inst: any) => inst._id === formData.institution_id)?.name
                                                : formData.new_institution_name
                                                    ? formData.new_institution_name
                                                    : "Search institution..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Search institutes..."
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                            />
                                            <CommandList>
                                                {filteredInstitutes.length === 0 || (!filteredInstitutes.some(inst => inst.name.toLowerCase().includes(searchQuery.toLowerCase()))) ? (
                                                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                                        <p className="text-sm text-slate-500 mb-2">No matching institution found.</p>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="w-full bg-slate-100 hover:bg-slate-200 text-indigo-600 font-medium"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setIsNewInstitution(true);
                                                                setFormData({ ...formData, institution_id: "", new_institution_name: searchQuery });
                                                                setInstOpen(false);
                                                            }}
                                                        >
                                                            + Add My Institution Manually
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <CommandGroup heading="In Our Database">
                                                        {filteredInstitutes
                                                            .filter(inst => !searchQuery || inst.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                            .map((inst: any) => (
                                                                <CommandItem
                                                                    key={inst._id}
                                                                    value={inst.name}
                                                                    onSelect={() => {
                                                                        setFormData({ ...formData, institution_id: inst._id, new_institution_name: "" })
                                                                        setInstOpen(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.institution_id === inst._id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {inst.name}
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    placeholder="e.g. Computer Science"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                    disabled={isLoading}
                                    className="h-11"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="designation">Designation</Label>
                                <Select
                                    value={formData.designation}
                                    onValueChange={(val) => setFormData({ ...formData, designation: val })}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select Designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Head of Department">Head of Department (HOD)</SelectItem>
                                        <SelectItem value="Professor">Professor</SelectItem>
                                        <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                                        <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                                        <SelectItem value="Lecturer">Lecturer / Teaching Staff</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject Expertise</Label>
                            <Input
                                id="subject"
                                placeholder="Algorithms, Data Structures..."
                                value={formData.subject_expertise}
                                onChange={(e) => setFormData({ ...formData, subject_expertise: e.target.value })}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="employee_id">Employee / Faculty ID <span className="text-slate-400 font-normal">(Optional)</span></Label>
                                <Input
                                    id="employee_id"
                                    placeholder="e.g. FAC-12345"
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                    disabled={isLoading}
                                    className="h-11"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="linkedin_url">LinkedIn / Profile URL <span className="text-slate-400 font-normal">(Optional)</span></Label>
                                <Input
                                    id="linkedin_url"
                                    type="url"
                                    placeholder="https://linkedin.com/..."
                                    value={formData.linkedin_url}
                                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                    disabled={isLoading}
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit Request
                        </Button>
                    </div >
                </form >

                <p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Link
                        href="/login"
                        className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    >
                        Cancel and Return to Login
                    </Link>
                </p>
            </div >
        </AuthLayout >
    )
}
