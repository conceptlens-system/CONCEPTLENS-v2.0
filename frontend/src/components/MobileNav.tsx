"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div className="md:hidden border-b bg-white p-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <div className="h-6 w-6 rounded bg-black text-white flex items-center justify-center text-xs">C</div>
                    CONCEPTLENS
                </div>
                <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                </Button>
            </div>
        )
    }

    const studentLinks = [
        { href: "/student", label: "Home" },
        { href: "/student/classes", label: "My Classes" },
        { href: "/student/exams", label: "My Exams" },
        { href: "/student/profile", label: "Profile" },
    ]
    return (
        <div className="md:hidden border-b bg-white p-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-2 font-bold text-lg">
                <div className="h-6 w-6 rounded bg-black text-white flex items-center justify-center text-xs">C</div>
                CONCEPTLENS
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <Sidebar className="flex w-full h-full border-none" onLinkClick={() => setOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    )
}
