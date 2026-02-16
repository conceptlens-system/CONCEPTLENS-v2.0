import { LandingNavbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
    return (
        <div className="min-h-screen bg-white dark:bg-black selection:bg-indigo-100 selection:text-indigo-900">
            <LandingNavbar />
            <main>
                <Hero />
                <Features />
                <HowItWorks />
                <Pricing />
            </main>
            <Footer />
        </div>
    );
}
