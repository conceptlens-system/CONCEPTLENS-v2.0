import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // Call Backend Login
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

                    const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
                        method: "POST",
                        body: JSON.stringify({
                            email: credentials?.username,
                            password: credentials?.password
                        }),
                        headers: { "Content-Type": "application/json" },
                        signal: controller.signal
                    })
                    clearTimeout(timeoutId);

                    const user = await res.json()

                    if (res.ok && user.access_token) {
                        return {
                            id: user.name, // NextAuth expects 'id', using name/email or can decode token
                            name: user.name,
                            email: credentials?.username,
                            role: user.role,
                            accessToken: user.access_token
                        }
                    }
                    return null
                } catch (e) {
                    console.error("Login Failed", e)
                    return null
                }
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        })
    ],
    pages: {
        signIn: '/login', // Custom login page
    },
    callbacks: {
        async signIn({ user, account }) {
            return true;
        },
        async jwt({ token, user, account }) {
            // Initial sign in
            if (account && user) {
                console.log("DEBUG: Initial Sign In", { provider: account.provider, email: user.email });
                // 1. Google Login
                if (account.provider === "google") {
                    try {
                        console.log("DEBUG: Fetching backend token for Google user...");
                        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/google", {
                            method: "POST",
                            body: JSON.stringify({
                                email: user.email,
                                name: user.name,
                                google_id: user.id
                            }),
                            headers: { "Content-Type": "application/json" }
                        })

                        if (res.ok) {
                            const backendUser = await res.json()
                            console.log("DEBUG: Backend token received", { role: backendUser.role });
                            token.role = backendUser.role
                            token.accessToken = backendUser.access_token
                        } else {
                            const errText = await res.text();
                            console.error("DEBUG: Google Auth Backend Sync Failed", { status: res.status, text: errText })
                        }
                    } catch (e) {
                        console.error("DEBUG: Google Auth Backend Fetch Error", e)
                    }
                }
                // 2. Credentials Login (Already has token from authorize)
                else {
                    console.log("DEBUG: Credentials Login");
                    token.role = (user as any).role
                    token.accessToken = (user as any).accessToken
                }
            } else {
                console.log("DEBUG: JWT Callback (Subsequent)", { hasToken: !!token.accessToken });
            }
            return token
        },
        async session({ session, token }) {
            if (session?.user) {
                console.log("DEBUG: Session Callback", { hasToken: !!token.accessToken });
                (session.user as any).role = token.role;
                (session.user as any).accessToken = token.accessToken;
            }
            return session
        }
    }
})

export { handler as GET, handler as POST }
