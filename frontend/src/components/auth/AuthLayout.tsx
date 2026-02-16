"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Brain } from "lucide-react";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    heroTitle?: React.ReactNode;
    heroSubtitle?: string;
}

export function AuthLayout({ children, title, subtitle, heroTitle, heroSubtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Artistic/Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
                {/* Animated fluid background */}
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500/30 rounded-full blur-[120px] animate-pulse delay-1000" />

                <div className="relative z-10 text-white max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-8 shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
                            <Brain className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-5xl font-bold mb-6 tracking-tight leading-time">
                            {heroTitle || (
                                <>
                                    Master Your <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                        Academic Journey
                                    </span>
                                </>
                            )}
                        </h1>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            {heroSubtitle || "\"ConceptLens transforms the way you learn and teach. Get granular insights into performance and misconceptions instantly.\""}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white dark:bg-black">
                <div className="w-full max-w-md space-y-8">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors mb-8"
                    >
                        <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
                    </Link>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {subtitle}
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
