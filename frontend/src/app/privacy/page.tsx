"use client";

import { LandingNavbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col">
            <LandingNavbar />
            <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
                <article className="prose dark:prose-invert lg:prose-lg mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h1>Privacy Policy</h1>
                    <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

                    <p>
                        At ConceptLens, accessible from https://conceptlens.com, one of our main priorities is the privacy of our visitors.
                        This Privacy Policy document contains types of information that is collected and recorded by ConceptLens and how we use it.
                    </p>

                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect several different types of information for various purposes to provide and improve our Service to you.
                    </p>
                    <ul>
                        <li><strong>Personal Data:</strong> Email address, First name and last name, Phone number, Cookies and Usage Data.</li>
                        <li><strong>Educational Data:</strong> Exam results, learning patterns, and course progress.</li>
                    </ul>

                    <h2>2. How We Use Your Data</h2>
                    <p>
                        We use the collected data for various purposes:
                    </p>
                    <ul>
                        <li>To provide and maintain our Service</li>
                        <li>To notify you about changes to our Service</li>
                        <li>To allow you to participate in interactive features when you choose to do so</li>
                        <li>To provide customer support</li>
                        <li>To gather analysis or valuable information so that we can improve our Service</li>
                    </ul>

                    <h2>3. Data Security</h2>
                    <p>
                        The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                    </p>

                    <h2>4. Your Rights</h2>
                    <p>
                        You have the right to access, update, or delete the information we have on you. Whenever made possible, you can access, update or request deletion of your Personal Data directly within your account settings section. If you are unable to perform these actions yourself, please contact us to assist you.
                    </p>

                    <h2>5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us:
                    </p>
                    <ul>
                        <li>By email: privacy@conceptlens.com</li>
                    </ul>
                </article>
            </main>
            <Footer />
        </div>
    );
}
