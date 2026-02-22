"use client"

import { Button } from "@/components/ui/button"
import { Activity, AlertCircle, BookOpen, CheckCircle2, Building, Users, User, GraduationCap, ClipboardList, BarChart3, LogOut, Mail, FileText, LayoutDashboard, Settings, Brain } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
// @ts-ignore
import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchNotifications } from "@/lib/api"
import { motion } from "framer-motion"

interface SidebarProps {
    className?: string
    onLinkClick?: () => void
}

export function Sidebar({ className, onLinkClick }: SidebarProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const isAdmin = pathname?.startsWith("/admin")
    const [unreadCount, setUnreadCount] = useState(0)

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
        { href: "/admin/professors", label: "Professors", icon: Users },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ]

    const professorLinks = [
        { href: "/professor", label: "Home", icon: LayoutDashboard },
        { href: "/professor/curriculum", label: "Curriculum", icon: BookOpen },
        { href: "/professor/exams", label: "Exams", icon: ClipboardList },
        { href: "/professor/misconceptions", label: "Misconceptions", icon: AlertCircle },
        { href: "/professor/inbox", label: "Inbox", icon: Mail, badge: unreadCount },
        { href: "/professor/classes", label: "My Classes", icon: Users },
        { href: "/professor/reports", label: "Reports", icon: BarChart3 },
        { href: "/professor/profile", label: "Profile", icon: User },
    ]

    const studentLinks = [
        { href: "/student", label: "Home", icon: LayoutDashboard },
        { href: "/student/classes", label: "My Classes", icon: BookOpen },
        { href: "/student/exams", label: "My Exams", icon: ClipboardList },
        { href: "/student/inbox", label: "Inbox", icon: Mail, badge: unreadCount },
        { href: "/student/profile", label: "Profile", icon: User },
    ]

    const isStudent = pathname?.startsWith("/student")
    const links = isAdmin ? adminLinks : isStudent ? studentLinks : professorLinks

    return (
        <div className={cn("hidden md:flex flex-col w-72 h-screen sticky top-0 p-4 shrink-0", className)}>
            <div className="h-full flex flex-col bg-white/50 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl rounded-3xl overflow-hidden relative">
                {/* Gradient Blob Overlay */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 font-bold text-xl text-slate-900 dark:text-white mb-2">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Brain className="text-white w-6 h-6" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            ConceptLens
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 px-1 font-medium tracking-wide uppercase opacity-70">
                        {isAdmin ? "Admin Workspace" : isStudent ? "Student Portal" : "Professor Portal"}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
                    {links.map((link) => {
                        const isActive = pathname === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => {
                                    if (link.href.includes("inbox")) setUnreadCount(0);
                                    onLinkClick?.();
                                }}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                        isActive
                                            ? "text-white shadow-md shadow-indigo-500/25"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}

                                    <link.icon className={cn("h-5 w-5 relative z-10", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400")} />
                                    <span className="relative z-10">{link.label}</span>

                                    {(link as any).badge > 0 && (
                                        <span className={cn(
                                            "ml-auto text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full relative z-10",
                                            isActive
                                                ? "bg-white text-indigo-600"
                                                : "bg-red-500 text-white shadow-sm"
                                        )}>
                                            {(link as any).badge}
                                        </span>
                                    )}
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl h-10 px-4"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span className="font-medium">Sign Out</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
