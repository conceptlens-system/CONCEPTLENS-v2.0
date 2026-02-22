"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function Pricing() {
    return (
        <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-slate-900 dark:text-white">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="max-w-[700px] text-slate-600 dark:text-slate-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Choose the plan that fits your educational needs. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Starter Plan */}
                    <Card className="flex flex-col border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold">Starter</CardTitle>
                            <CardDescription>Perfect for individual students.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">₹0</span>
                                <span className="ml-1 text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Access to all basic subjects
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    3 AI-generated practice exams/mo
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Basic performance tracking
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Community support
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" asChild>
                                <Link href="/signup">Get Started Free</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Pro Plan */}
                    <Card className="flex flex-col relative border-indigo-200 dark:border-indigo-800 shadow-lg scale-105 z-10">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                MOMENTUM
                            </span>
                        </div>
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-indigo-700 dark:text-indigo-400">Pro</CardTitle>
                            <CardDescription>For serious learners & educators.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">₹120</span>
                                <span className="ml-1 text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Everything in Starter
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Unlimited AI practice exams
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Deep learning trend analysis
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Priority email support
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Custom study plans
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0" asChild>
                                <Link href="/signup?plan=pro">Start Pro Trial</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Institution Plan */}
                    <Card className="flex flex-col border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold">Institution</CardTitle>
                            <CardDescription>For schools & universities.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">Custom</span>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Unlimited student accounts
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Professor dashboard & reporting
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    LMS Integration (Canvas, Blackboard)
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Dedicated Success Manager
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-indigo-600" />
                                    Single Sign-On (SSO)
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" asChild>
                                <Link href="/contact">Contact Sales</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </section>
    );
}
