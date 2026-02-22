"use client"

import { Sidebar } from "@/components/Sidebar"

export default function ValidationsPage() {
    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar />
            <div className="flex-1 p-8">
                <h1 className="text-3xl font-bold text-slate-900">Validations</h1>
                <p className="text-slate-500 mt-2">History of your approved and rejected insights.</p>
                <div className="mt-8 p-12 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400">
                    No validation history available yet.
                </div>
            </div>
        </div>
    )
}
