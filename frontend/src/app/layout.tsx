import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/Providers"

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CONCEPTLENS",
  description: "AI Education Analytics Platform",
  icons: {
    icon: "/Conceptlens_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
