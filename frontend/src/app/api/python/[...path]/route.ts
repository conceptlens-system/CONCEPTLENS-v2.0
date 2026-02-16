import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const p = await params;
    return handleRequest(req, p);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const p = await params;
    return handleRequest(req, p);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const p = await params;
    return handleRequest(req, p);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const p = await params;
    return handleRequest(req, p);
}

async function handleRequest(req: NextRequest, params: { path: string[] }) {
    const path = params.path.join("/");
    const url = `${BACKEND_URL}/${path}`;

    // Extract Token and Headers
    const token = req.headers.get("authorization");
    const contentType = req.headers.get("content-type");

    console.log(`[PROXY] Forwarding ${req.method} to ${url}`);
    if (token) console.log(`[PROXY] Token present: ${token.substring(0, 15)}...`);
    else console.log(`[PROXY] NO TOKEN FOUND`);

    const headers: any = {};
    if (token) headers["Authorization"] = token;
    if (contentType) headers["Content-Type"] = contentType;

    try {
        const body = req.method !== "GET" && req.method !== "DELETE" ? await req.text() : undefined;

        const res = await fetch(url, {
            method: req.method,
            headers: headers,
            body: body,
            cache: 'no-store'
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error(`[PROXY] Backend Error ${res.status}:`, data);
        }

        return NextResponse.json(data, { status: res.status });
    } catch (e: any) {
        console.error("[PROXY] Failed:", e);
        return NextResponse.json({ detail: "Proxy Error: " + e.message }, { status: 500 });
    }
}
