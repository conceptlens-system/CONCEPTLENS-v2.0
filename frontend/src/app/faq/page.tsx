"use client";

import { LandingNavbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col">
            <LandingNavbar />
            <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Everything you need to know about ConceptLens and how it works.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 border border-slate-200 dark:border-slate-800">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>What is ConceptLens?</AccordionTrigger>
                            <AccordionContent>
                                ConceptLens is an AI-powered educational analytics platform designed to identify and correct student misconceptions in real-time. It helps professors track learning trends and provides students with personalized feedback.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2">
                            <AccordionTrigger>How does the AI detection work?</AccordionTrigger>
                            <AccordionContent>
                                Our AI analyzes student responses to open-ended and multiple-choice questions, looking for patterns that indicate specific misunderstandings rather than just grading for correctness.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3">
                            <AccordionTrigger>Is there a free trial?</AccordionTrigger>
                            <AccordionContent>
                                Yes! We offer a "Starter" plan that is completely free for students. You can also try our Pro features with a 14-day trial.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4">
                            <AccordionTrigger>Can I integrate this with my university's LMS?</AccordionTrigger>
                            <AccordionContent>
                                Yes, our Institution plan supports integration with major Learning Management Systems like Canvas, Blackboard, and Moodle via LTI standards.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5">
                            <AccordionTrigger>How secure is my data?</AccordionTrigger>
                            <AccordionContent>
                                We take security seriously. All data is encrypted in transit and at rest. We are FERPA and GDPR compliant to ensure student data privacy.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </main>
            <Footer />
        </div>
    );
}
