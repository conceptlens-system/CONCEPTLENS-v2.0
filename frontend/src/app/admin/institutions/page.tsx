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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Search } from "lucide-react"
import { fetchInstitutes, createInstitute, deleteInstitute } from "@/lib/api"

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
    const [searchQuery, setSearchQuery] = useState("")

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })

    const fetchInstitutions = async () => {
        try {
            const data = await fetchInstitutes()
            setInstitutions(data)
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
            await createInstitute({ name, type, location })
            toast.success("Institution created")
            setIsDialogOpen(false)
            setName("")
            setLocation("")
            fetchInstitutions()
        } catch (error) {
            console.error(error)
            toast.error("Error creating institution")
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmAction(() => async () => {
            try {
                await deleteInstitute(id)
                toast.success("Institution deleted")
                fetchInstitutions()
            } catch (error) {
                console.error(error)
                toast.error("Error deleting institution")
            }
        })
        setConfirmOpen(true)
    }

    const filteredInstitutions = institutions.filter(inst =>
        (inst.name && inst.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inst.location && inst.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inst.type && inst.type.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <PageTransition className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Institutions</h1>
                    <p className="text-slate-500 mt-2">Manage universities, schools, and colleges on the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search institutions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full md:w-[300px]"
                        />
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200">
                                <Plus className="mr-2 h-4 w-4" /> Add Institution
                            </Button>
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
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate}>Create Institution</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>All Institutions</CardTitle>
                    <CardDescription>A complete list of registered institutions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Institution Name</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Type</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Location</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInstitutions.length === 0 && !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Building className="h-8 w-8 text-slate-200" />
                                                <p>{searchQuery ? "No institutions match your search." : "No institutions found. Add one to get started."}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredInstitutions.map((inst) => (
                                    <TableRow key={inst._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                    <Building className="h-5 w-5 text-indigo-500" />
                                                </div>
                                                <span className="text-slate-900">{inst.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{inst.type || "N/A"}</TableCell>
                                        <TableCell className="text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {inst.location || "N/A"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm">
                                                {inst.subscription_status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(inst._id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
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
