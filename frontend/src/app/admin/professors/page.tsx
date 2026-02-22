"use client"

import { useEffect, useState } from "react"
import { fetchProfessors, fetchInstitutes, createProfessor, deleteProfessor } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, User, Mail, Building } from "lucide-react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"

interface Professor {
    _id: string
    full_name: string
    email: string
    department: string
    institution_id: string
}

interface Institution {
    _id: string
    name: string
}

export default function ProfessorsPage() {
    const [professors, setProfessors] = useState<Professor[]>([])
    const [institutions, setInstitutions] = useState<Institution[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        department: "",
        institution_id: ""
    })

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })

    const fetchData = async () => {
        try {
            const [profRes, instRes] = await Promise.all([
                fetchProfessors(),
                fetchInstitutes()
            ])

            setProfessors(profRes)
            setInstitutions(instRes)

        } catch (error) {
            console.error(error)
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = async () => {
        // Simple validation
        if (!formData.full_name || !formData.email || !formData.password || !formData.institution_id) {
            return toast.error("Please fill all required fields")
        }

        try {
            await createProfessor(formData)
            toast.success("Professor created")
            setIsDialogOpen(false)
            setFormData({ full_name: "", email: "", password: "", department: "", institution_id: "" })
            fetchData()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error creating professor")
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmAction(() => async () => {
            try {
                await deleteProfessor(id)
                toast.success("Professor deleted")
                fetchData()
            } catch (error) {
                console.error(error)
                toast.error("Error deleting professor")
            }
        })
        setConfirmOpen(true)
    }

    const getInstitutionName = (id: string) => {
        return institutions.find(i => i._id === id)?.name || "Unknown"
    }

    return (
        <PageTransition className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Professors</h1>
                    <p className="text-slate-500 mt-2">Manage professor accounts and assignments.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Professor</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Professor</DialogTitle>
                            <DialogDescription>Create a new professor account.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    placeholder="Dr. John Doe"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Login ID)</Label>
                                <Input
                                    placeholder="john@university.edu"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Institution</Label>
                                <Select
                                    value={formData.institution_id}
                                    onValueChange={(val) => setFormData({ ...formData, institution_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Institution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutions.map(inst => (
                                            <SelectItem key={inst._id} value={inst._id}>{inst.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Department (Optional)</Label>
                                <Input
                                    placeholder="e.g. Computer Science"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Create Account</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Institution</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {professors.length === 0 && !isLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    No professors found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        {professors.map((prof) => (
                            <TableRow key={prof._id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-400" />
                                    {prof.full_name}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <Mail className="h-3 w-3" /> {prof.email}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Building className="h-3 w-3 text-slate-400" />
                                        {getInstitutionName(prof.institution_id)}
                                    </div>
                                </TableCell>
                                <TableCell>{prof.department}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(prof._id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete Professor?"
                description="Are you sure? This will also delete their login account."
                onConfirm={confirmAction}
                variant="destructive"
            />
        </PageTransition>
    )
}
