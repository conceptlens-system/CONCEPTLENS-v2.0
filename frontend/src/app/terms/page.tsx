"use client";

import { LandingNavbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col">
            <LandingNavbar />
            <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
                <article className="prose dark:prose-invert lg:prose-lg mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h1>Terms of Service</h1>
                    <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

                    <p>
                        Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the ConceptLens website (the "Service") operated by ConceptLens ("us", "we", or "our").
                    </p>

                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service. By accessing or using the Service you agree to be bound by these Terms.
                    </p>

                    <h2>2. Accounts</h2>
                    <p>
                        When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                    </p>

                    <h2>3. Intellectual Property</h2>
                    <p>
                        The Service and its original content, features, and functionality are and will remain the exclusive property of ConceptLens and its licensors. The Service is protected by copyright, trademark, and other laws of both the relevant country and foreign countries.
                    </p>

                    <h2>4. Termination</h2>
                    <p>
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                    </p>

                    <h2>5. Limitation of Liability</h2>
                    <p>
                        In no event shall ConceptLens, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                    </p>

                    <h2>6. Changes</h2>
                    <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                    </p>

                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us:
                    </p>
                    <ul>
                        <li>By email: support@conceptlens.com</li>
                    </ul>
                </article>
            </main>
            <Footer />
        </div>
    );
}
