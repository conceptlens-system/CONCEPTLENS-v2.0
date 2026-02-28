"use client"

import { DashboardNavbar } from "@/components/DashboardNavbar"
import { Footer } from "@/components/landing/Footer"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { fetchUserProfile } from "@/lib/api"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const [isProfileChecking, setIsProfileChecking] = useState(true)
    const [needsSetup, setNeedsSetup] = useState(false)

    useEffect(() => {
        const checkProfile = async () => {
            if (status === "loading") return;

            if (status === "unauthenticated" || !session) {
                router.push("/login");
                return;
            }

            const token = (session?.user as any)?.accessToken;
            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const profile = await fetchUserProfile(token);
                // Define the precise fields that make a profile "complete"
                const isComplete = Boolean(
                    profile.institute_name &&
                    profile.contact_number &&
                    profile.degree &&
                    profile.branch &&
                    profile.current_semester
                );

                if (!isComplete && pathname !== "/student/setup") {
                    setNeedsSetup(true);
                    router.push("/student/setup");
                } else if (isComplete && pathname === "/student/setup") {
                    // If they are complete but somehow on setup, push to dashboard
                    router.push("/student");
                } else {
                    setNeedsSetup(!isComplete);
                }
            } catch (err) {
                console.error("Failed to fetch profile during layout check", err);
            } finally {
                setIsProfileChecking(false);
            }
        };

        checkProfile();
    }, [session, status, pathname, router]);

    if (isProfileChecking || status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Hide Navbar and Footer if they are in the Setup Wizard flow
    const isSetupPage = pathname === "/student/setup";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden flex flex-col">
            {/* Animated Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            {!isSetupPage && <DashboardNavbar />}

            <main className={`flex-1 container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${isSetupPage ? 'flex flex-col items-center justify-center' : ''}`}>
                {children}
            </main>

            {!isSetupPage && <Footer />}
        </div>
    )
}
