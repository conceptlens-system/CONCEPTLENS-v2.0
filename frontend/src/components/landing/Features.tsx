"use client";

import { Brain, BarChart3, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
    {
        title: "AI Misconception Detection",
        description: "Identify exactly where students are struggling with concept-level analysis.",
        icon: Brain,
        color: "bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
    },
    {
        title: "Real-time Analytics",
        description: "Get instant feedback on exam performance and class trends.",
        icon: BarChart3,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    },
    {
        title: "Student Profiling",
        description: "Build comprehensive learning profiles for every student.",
        icon: Users,
        color: "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    },
    {
        title: "Instant Insights",
        description: "Turn raw data into actionable teaching strategies in seconds.",
        icon: Zap,
        color: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
                        Powerful Features for Modern Educators
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Everything you need to understand your students and improve learning outcomes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
