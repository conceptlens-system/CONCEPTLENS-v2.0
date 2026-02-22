"use client"

import { DashboardNavbar } from "@/components/DashboardNavbar"

import { Footer } from "@/components/landing/Footer"

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden flex flex-col">
            {/* Animated Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            <DashboardNavbar />

            <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </main>
            <Footer />
        </div>
    )
}
