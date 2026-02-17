"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
    {
        id: 1,
        content: "ConceptLens has completely transformed how I track my students' progress. The AI detection of misconceptions is spot-on and saves me hours of analysis.",
        author: "Dr. Sarah Mitchell",
        role: "Physics Professor, Stanford University",
        avatar: "SM",
        rating: 5
    },
    {
        id: 2,
        content: "Finally, a platform that gives me personalized feedback! I used to struggle with understanding *why* I got a question wrong, but now I get instant clarity.",
        author: "James Chen",
        role: "Computer Science Student",
        avatar: "JC",
        rating: 5
    },
    {
        id: 3,
        content: "The analytics dashboard is a game-changer for our department. We can identify curriculum gaps in real-time and adjust our teaching strategies immediately.",
        author: "Prof. Robert Alistair",
        role: "Department Head, MIT",
        avatar: "RA",
        rating: 5
    },
    {
        id: 4,
        content: "I love the interactive exam format. It feels less like a test and more like a learning experience. The interface is clean, modern, and super easy to use.",
        author: "Emily Watson",
        role: "Engineering Student",
        avatar: "EW",
        rating: 4
    }
];

export function Testimonials() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [isPaused]);

    const next = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prev = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    return (
        <section className="py-24 bg-white dark:bg-black relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-x-1/2" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl translate-x-1/3" />
            </div>

            <div className="container px-4 mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
                        Trusted by Educators & Students
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        See how ConceptLens is reshaping the educational landscape.
                    </p>
                </div>

                <div
                    className="max-w-4xl mx-auto relative group"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-8 md:p-12 border border-slate-100 dark:border-white/10 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center gap-8"
                        >
                            {/* Avatar / Quote Icon */}
                            <div className="shrink-0 relative">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    {testimonials[currentIndex].avatar}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-2 rounded-full shadow-md">
                                    <Quote className="h-4 w-4 text-indigo-500 fill-indigo-500" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex justify-center md:justify-start gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${i < testimonials[currentIndex].rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`}
                                        />
                                    ))}
                                </div>
                                <blockquote className="text-xl md:text-2xl font-medium text-slate-900 dark:text-white mb-6 leading-relaxed">
                                    "{testimonials[currentIndex].content}"
                                </blockquote>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                        {testimonials[currentIndex].author}
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        {testimonials[currentIndex].role}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons - Visible on Hover */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 -ml-4 md:-ml-12 opacity-0 group-hover:opacity-100 transition-all duration-300 md:block hidden">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full h-12 w-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            onClick={prev}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 -mr-4 md:-mr-12 opacity-0 group-hover:opacity-100 transition-all duration-300 md:block hidden">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full h-12 w-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            onClick={next}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Mobile Navigation / Indicators */}
                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                                        ? "w-8 bg-indigo-600"
                                        : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-indigo-400"
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
