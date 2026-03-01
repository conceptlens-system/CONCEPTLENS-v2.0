"use client"

import { Button } from "@/components/ui/button"
import { Activity, AlertCircle, BookOpen, CheckCircle2, Building, Users, User, GraduationCap, ClipboardList, BarChart3, LogOut, Mail, FileText, LayoutDashboard, Settings, Menu, X, Bell } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
// @ts-ignore
import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchNotifications } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NavLink {
    href: string
    label: string
    icon: any
}

export function DashboardNavbar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const isAdmin = pathname?.startsWith("/admin")
    const [unreadCount, setUnreadCount] = useState(0)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (!session?.user) return

        const load = async () => {
            try {
                const token = (session.user as any).accessToken
                if (!token) return
                const notes = await fetchNotifications(token)
                const unread = notes.filter((n: any) => !n.is_read).length
                setUnreadCount(unread)
            } catch (e) { }
        }

        load()
        const interval = setInterval(load, 60000)
        return () => clearInterval(interval)
    }, [session])

    const adminLinks = [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/institutions", label: "Institutions", icon: Building },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ]

    const professorLinks = [
        { href: "/professor/curriculum", label: "Curriculum", icon: BookOpen },
        { href: "/professor/classes", label: "Classes", icon: Users },
        { href: "/professor/exams", label: "Exams", icon: ClipboardList },
        { href: "/professor/misconceptions", label: "Misconceptions", icon: AlertCircle },
        { href: "/professor/reports", label: "Reports", icon: BarChart3 },
    ]

    const studentLinks = [
        { href: "/student/classes", label: "My Classes", icon: BookOpen },
        { href: "/student/exams", label: "My Exams", icon: ClipboardList },
    ]

    // ... (rest of the code untill Quick Actions)


    const isStudent = pathname?.startsWith("/student")
    const isProfessor = pathname?.startsWith("/professor")

    let mainLinks: NavLink[] = []
    let moreLinks: NavLink[] = []

    if (isAdmin) {
        mainLinks = adminLinks
    } else if (isStudent) {
        mainLinks = studentLinks
    } else {
        mainLinks = professorLinks
    }

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-xl">
            <div className="container flex h-16 items-center justify-between px-4 md:px-8">
                {/* Logo Section */}
                <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white mr-8">
                    <Link href={isAdmin ? "/admin" : isProfessor ? "/professor" : isStudent ? "/student" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="relative h-8 w-8">
                            <Image
                                src="/Conceptlens_logo.png"
                                alt="ConceptLens Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 hidden sm:inline-block">
                            ConceptLens
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-1 flex-1">
                    {mainLinks.map((link) => {
                        const isActive = pathname === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                            >
                                <div className={cn(
                                    "relative flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium whitespace-nowrap",
                                    isActive
                                        ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400"
                                        : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}>
                                    <link.icon className="h-4 w-4" />
                                    <span>{link.label}</span>
                                </div>
                            </Link>
                        )
                    })}


                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 ml-auto">


                    {/* Inbox Action (Professor/Student) */}
                    {(isProfessor || isStudent) && (
                        <Link href={isProfessor ? "/professor/inbox" : "/student/inbox"}>
                            <Button size="icon" variant="ghost" className="relative text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-black">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    </span>
                                )}
                            </Button>
                        </Link>
                    )}



                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8 border border-slate-200">
                                    <AvatarImage src={(session?.user as any)?.image} alt={session?.user?.name || "User"} />
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">
                                        {session?.user?.name?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {session?.user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={isStudent ? "/student/profile" : "/professor/profile"}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile Menu Toggle */}
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="lg:hidden border-t bg-white dark:bg-slate-950 overflow-hidden"
                    >
                        <div className="p-4 space-y-2">
                            {mainLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                                        pathname === link.href
                                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <link.icon className="h-5 w-5" />
                                    {link.label}
                                </Link>
                            ))}

                            {/* Mobile specific extra links if needed */}
                            {moreLinks.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">Resources</div>
                                    {moreLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            <link.icon className="h-5 w-5" />
                                            {link.label}
                                        </Link>
                                    ))}
                                </>
                            )}

                            <div className="border-t pt-2 mt-2">
                                <Link
                                    href="/"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    <LayoutDashboard className="h-5 w-5" />
                                    Go to Website
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
