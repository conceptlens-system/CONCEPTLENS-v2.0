"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl -z-10" />
            <div className="absolute top-20 right-0 w-[600px] h-[500px] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl -z-10" />

            <div className="container px-4 mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full dark:bg-indigo-900/30 dark:text-indigo-300"
                >
                    <Sparkles className="w-3 h-3" />
                    <span>New: AI-Powered Exam Analysis</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6"
                >
                    Understand Learning <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        Like Never Before
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-300 mb-10"
                >
                    ConceptLens uses advanced AI to detect student misconceptions,
                    analyze exam performance, and provide actionable insights for educators.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Button size="lg" className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700 text-white" asChild>
                        <Link href="/signup">
                            Start for Free <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                        <Link href="mailto:contact@conceptlens.com">
                            Book a Demo
                        </Link>
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
