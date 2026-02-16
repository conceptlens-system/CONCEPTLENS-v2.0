import fetch from 'node-fetch';

const API_URL = "http://localhost:8000/api/v1";

async function runDiagnostics() {
    console.log("1. Testing Backend Health...");
    try {
        const health = await fetch(`http://localhost:8000/health`);
        console.log("   Health Status:", health.status, health.statusText);
        if (!health.ok) throw new Error("Backend not healthy");
    } catch (e) {
        console.error("   FAILED to connect to backend:", e.message);
        return;
    }

    console.log("\n2. Testing Login (Student)...");
    let token = "";
    try {
        // Create a test user or login with existing
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test_student@example.com",
                password: "password123"
            })
        });

        // If login fails, try to signup to get a fresh token
        if (loginRes.status === 401) {
            console.log("   Login failed (expected if user doesn't exist). Attempting Signup...");
            const signupRes = await fetch(`${API_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "test_student@example.com",
                    password: "password123",
                    full_name: "Test Student"
                })
            });
            if (signupRes.status === 400) {
                // User might exist but password assumed wrong? Retrying login implies user exists.
                // Let's just create a unique one
                const uniqueEmail = `test_${Date.now()}@example.com`;
                console.log(`   Creating fresh user: ${uniqueEmail}`);
                const signup2 = await fetch(`${API_URL}/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: uniqueEmail,
                        password: "password123",
                        full_name: "Test Student"
                    })
                });
                if (!signup2.ok) throw new Error("Signup failed: " + await signup2.text());

                // Now login
                const login2 = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: uniqueEmail, password: "password123" })
                });
                const data = await login2.json();
                token = data.access_token;
            } else if (signupRes.ok) {
                // Login again
                const login2 = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "test_student@example.com", password: "password123" })
                });
                const data = await login2.json();
                token = data.access_token;
            }
        } else if (loginRes.ok) {
            const data = await loginRes.json();
            token = data.access_token;
        } else {
            console.log("   Login Error:", await loginRes.text());
        }

        if (token) console.log("   Token received!");
        else throw new Error("Could not get auth token");

    } catch (e) {
        console.error("   Auth Failed:", e.message);
        return;
    }

    console.log("\n3. Testing Join Class...");
    try {
        // Just verify connectivity logic, strict success not needed if class code invalid
        const joinRes = await fetch(`${API_URL}/classes/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ class_code: "INVALID" })
        });

        console.log("   Join Status:", joinRes.status);
        const text = await joinRes.text();
        console.log("   Response:", text);

        if (joinRes.status === 404 || joinRes.status === 400 || joinRes.status === 200) {
            console.log("\n[SUCCESS] Backend logic is working correctly.");
        } else {
            console.log("\n[WARNING] Unexpected status code (e.g. 500 or 422). Backend might be broken.");
        }

    } catch (e) {
        console.error("   Join Request Failed:", e.message);
    }
}

runDiagnostics();
