"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Building, MapPin } from "lucide-react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"

interface Institution {
    _id: string
    name: string
    type: string
    location: string
    subscription_status: string
    joined_at: string
}

export default function InstitutionsPage() {
    const [institutions, setInstitutions] = useState<Institution[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [type, setType] = useState("University")
    const [location, setLocation] = useState("")

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })

    const fetchInstitutions = async () => {
        try {
            const res = await fetch("/api/v1/institutions/")
            if (res.ok) {
                const data = await res.json()
                setInstitutions(data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to load institutions")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchInstitutions()
    }, [])

    const handleCreate = async () => {
        if (!name || !location) return toast.error("Please fill all fields")

        try {
            const res = await fetch("/api/v1/institutions/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, type, location })
            })
            if (res.ok) {
                toast.success("Institution created")
                setIsDialogOpen(false)
                setName("")
                setLocation("")
                fetchInstitutions()
            } else {
                toast.error("Failed to create institution")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error creating institution")
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmAction(() => async () => {
            try {
                const res = await fetch(`/api/v1/institutions/${id}`, { method: "DELETE" })
                if (res.ok) {
                    toast.success("Institution deleted")
                    fetchInstitutions()
                }
            } catch (error) {
                console.error(error)
                toast.error("Error deleting institution")
            }
        })
        setConfirmOpen(true)
    }

    return (
        <PageTransition className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Institutions</h1>
                    <p className="text-slate-500 mt-2">Manage universities, schools, and colleges.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Institution</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Institution</DialogTitle>
                            <DialogDescription>Enter the details of the new institution.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Institution Name</Label>
                                <Input placeholder="e.g. Indian Institute of Technology" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="University">University</SelectItem>
                                        <SelectItem value="College">College</SelectItem>
                                        <SelectItem value="School">School</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input placeholder="e.g. Mumbai, India" value={location} onChange={(e) => setLocation(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Create Institution</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {institutions.length === 0 && !isLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    No institutions found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        {institutions.map((inst) => (
                            <TableRow key={inst._id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Building className="h-4 w-4 text-slate-400" />
                                    {inst.name}
                                </TableCell>
                                <TableCell>{inst.type}</TableCell>
                                <TableCell className="flex items-center gap-1 text-slate-500">
                                    <MapPin className="h-3 w-3" /> {inst.location}
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                        {inst.subscription_status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(inst._id)}>
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
                title="Delete Institution?"
                description="Are you sure? This cannot be undone."
                onConfirm={confirmAction}
                variant="destructive"
            />
        </PageTransition>
    )
}
