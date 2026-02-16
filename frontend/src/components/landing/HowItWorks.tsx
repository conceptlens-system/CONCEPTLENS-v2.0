"use client";

import { motion } from "framer-motion";
import { Search, BrainCircuit, Lightbulb } from "lucide-react";

const steps = [
    {
        number: "01",
        title: "Upload & Create",
        description: "Professors create exams or upload existing question banks. ConceptLens parses content automatically.",
        icon: Search,
        color: "bg-blue-500",
    },
    {
        number: "02",
        title: "Analyze Responses",
        description: "Students take exams, and our AI analyzes every answer to identify patterns and logic gaps.",
        icon: BrainCircuit,
        color: "bg-purple-500",
    },
    {
        number: "03",
        title: "Unlock Insights",
        description: "Receive detailed reports on misconceptions, helping you tailor instruction to student needs.",
        icon: Lightbulb,
        color: "bg-indigo-500",
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 bg-white dark:bg-black relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50/50 dark:bg-indigo-950/20 rounded-full blur-3xl -z-10" />

            <div className="container px-4 mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        A simple process for powerful educational transformation.
                    </p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 dark:bg-slate-800 -z-10" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            viewport={{ once: true }}
                            className="relative flex flex-col items-center text-center"
                        >
                            <div className={`w-24 h-24 rounded-2xl ${step.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center mb-6 shadow-sm`}>
                                <div className={`w-12 h-12 rounded-lg ${step.color} flex items-center justify-center text-white shadow-lg`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                {step.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
