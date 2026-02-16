"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSession } from "next-auth/react";

export function LandingNavbar() {
    const { data: session } = useSession();
    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/70 border-b border-white/20 dark:bg-black/70 dark:border-white/10"
        >
            <div className="flex items-center gap-2">
                <div className="relative h-10 w-10">
                    <Image
                        src="/Conceptlens_logo.png"
                        alt="ConceptLens Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                    CONCEPTLENS
                </span>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Link
                    href="#features"
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    Features
                </Link>
                <Link
                    href="#how-it-works"
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    How it Works
                </Link>
                <Link
                    href="#pricing"
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    Pricing
                </Link>
            </div>

            <div className="flex items-center gap-3">
                {session ? (
                    <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20">
                        <Link href={(session.user as any)?.role === 'student' ? '/student' : '/professor'}>
                            {(session.user as any)?.role === 'student' ? 'My Dashboard' : 'Professor Dashboard'}
                        </Link>
                    </Button>
                ) : (
                    <>
                        <Button variant="ghost" asChild>
                            <Link href="/login">Log in</Link>
                        </Button>
                        <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0">
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </>
                )}
            </div>
        </motion.nav>
    );
}
