"use client"

import { useEffect, useState } from "react"
import { fetchUsers, fetchInstitutes, createUser, deleteUser } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, User, Mail, Building } from "lucide-react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"

interface UserData {
    _id: string
    full_name: string
    email: string
    department?: string
    institution_id?: string
    role: string
    degree?: string
    current_semester?: string
}

interface Institution {
    _id: string
    name: string
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([])
    const [institutions, setInstitutions] = useState<Institution[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("professor")

    // Form State
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        department: "",
        institution_id: "",
        role: "professor"
    })

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })

    const fetchData = async () => {
        try {
            setIsLoading(true)
            const [usersRes, instRes] = await Promise.all([
                fetchUsers(),
                fetchInstitutes()
            ])

            setUsers(usersRes)
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
        if (!formData.full_name || !formData.email || !formData.password || (formData.role === "professor" && !formData.institution_id)) {
            return toast.error("Please fill all required fields")
        }

        try {
            await createUser(formData)
            toast.success("User created")
            setIsDialogOpen(false)
            setFormData({ full_name: "", email: "", password: "", department: "", institution_id: "", role: activeTab })
            fetchData()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error creating user")
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmAction(() => async () => {
            try {
                await deleteUser(id)
                toast.success("User deleted")
                fetchData()
            } catch (error) {
                console.error(error)
                toast.error("Error deleting user")
            }
        })
        setConfirmOpen(true)
    }

    const getInstitutionName = (id: string) => {
        return institutions.find(i => i._id === id)?.name || "Unknown"
    }

    return (
        <PageTransition className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users Management</h1>
                    <p className="text-slate-500 mt-2">Manage all system users including professors and students.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (open) setFormData({ ...formData, role: activeTab })
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200">
                                <Plus className="mr-2 h-4 w-4" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New {formData.role === "professor" ? "Professor" : "Student"}</DialogTitle>
                                <DialogDescription>Create a new {formData.role} account.</DialogDescription>
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
                                    <Label>Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(val) => setFormData({ ...formData, role: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="professor">Professor</SelectItem>
                                            <SelectItem value="student">Student</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.role === "professor" && (
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
                                )}

                                {formData.role === "professor" && (
                                    <div className="space-y-2">
                                        <Label>Department (Optional)</Label>
                                        <Input
                                            placeholder="e.g. Computer Science"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate}>Create Account</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex items-center overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-lg">
                        <TabsTrigger value="professor" className="rounded-md">Professors</TabsTrigger>
                        <TabsTrigger value="student" className="rounded-md">Students</TabsTrigger>
                        <TabsTrigger value="admin" className="rounded-md">Admins</TabsTrigger>
                    </TabsList>
                </div>

                {["professor", "student", "admin"].map((tabRole) => {
                    const filteredUsers = users.filter(u => u.role === tabRole)
                    return (
                        <TabsContent key={tabRole} value={tabRole} className="space-y-4 animate-in fade-in duration-300">
                            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-slate-600">Name</TableHead>
                                            <TableHead className="font-semibold text-slate-600">Email</TableHead>
                                            {tabRole === "professor" && <TableHead className="font-semibold text-slate-600">Institution</TableHead>}
                                            {tabRole === "professor" && <TableHead className="font-semibold text-slate-600">Department</TableHead>}
                                            {tabRole === "student" && <TableHead className="font-semibold text-slate-600">Degree</TableHead>}
                                            {tabRole === "student" && <TableHead className="font-semibold text-slate-600">Semester</TableHead>}
                                            <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.length === 0 && !isLoading && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <User className="h-8 w-8 text-slate-200" />
                                                        <p>No {tabRole}s found. Add one to get started.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {filteredUsers.map((user) => (
                                            <TableRow key={user._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                                                            {user.full_name[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-slate-900">{user.full_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}
                                                    </div>
                                                </TableCell>
                                                {tabRole === "professor" && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5 text-slate-600">
                                                            <Building className="h-3.5 w-3.5 text-slate-400" />
                                                            {user.institution_id ? getInstitutionName(user.institution_id) : "N/A"}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {tabRole === "professor" && (
                                                    <TableCell className="text-slate-600 flex items-center gap-1.5 mt-2">
                                                        {user.department || "N/A"}
                                                    </TableCell>
                                                )}
                                                {tabRole === "student" && (
                                                    <TableCell className="text-slate-600">{user.degree || "N/A"}</TableCell>
                                                )}
                                                {tabRole === "student" && (
                                                    <TableCell className="text-slate-600">Sem {user.current_semester || "N/A"}</TableCell>
                                                )}

                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(user._id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    )
                })}
            </Tabs>
            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete User?"
                description="Are you sure? This will permanently delete their account and associated data."
                onConfirm={confirmAction}
                variant="destructive"
            />
        </PageTransition>
    )
}
