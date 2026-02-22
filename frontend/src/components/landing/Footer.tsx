"use client";

import Link from "next/link";
import { Brain, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";

export function Footer() {
    const { data: session } = useSession();
    return (
        <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
            <div className="container px-4 mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {/* Brand & Description */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Brain className="text-white w-5 h-5" />
                            </div>
                            <span>ConceptLens</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                            Empowering education through AI-driven insights. detection misconceptions and personalized learning paths for every student.
                        </p>
                        <div className="flex gap-4">
                            <SocialLink href="#" icon={Facebook} />
                            <SocialLink href="#" icon={Twitter} />
                            <SocialLink href="#" icon={Instagram} />
                            <SocialLink href="#" icon={Linkedin} />
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <FooterLink href="/#features">Features</FooterLink>
                            <FooterLink href="/#how-it-works">How it Works</FooterLink>
                            <FooterLink href="/#pricing">Pricing</FooterLink>
                            {!session && (
                                <>
                                    <FooterLink href="/login">Login</FooterLink>
                                    <FooterLink href="/signup">Sign Up</FooterLink>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Support</h3>
                        <ul className="space-y-2">
                            <FooterLink href="/contact">Contact Us</FooterLink>
                            <FooterLink href="/faq">FAQ</FooterLink>
                            <FooterLink href="/privacy">Privacy Policy</FooterLink>
                            <FooterLink href="/terms">Terms of Service</FooterLink>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Contact Us</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <MapPin className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span>123 Innovation Drive,<br />Tech City, TC 90210</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Phone className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span>+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Mail className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span>support@conceptlens.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500 text-center md:text-left">
                        © {new Date().getFullYear()} ConceptLens. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-slate-500">
                        <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
                        <Link href="/cookies" className="hover:text-indigo-600 transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ href, icon: Icon }: any) {
    return (
        <a
            href={href}
            className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
        >
            <Icon className="h-4 w-4" />
        </a>
    )
}

function FooterLink({ href, children }: any) {
    return (
        <li>
            <Link
                href={href}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
                {children}
            </Link>
        </li>
    )
}
