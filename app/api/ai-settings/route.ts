
import { readBodyWithLimit } from "@/lib/read-body-with-limit";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
    encryptApiKey,
    decryptApiKey,
} from "@/lib/ai-encryption";
import { validateAiEndpoint } from "@/lib/ai-url";


const MAX_REQUEST_BYTES = 16_384;

function isSameOriginRequest(request: Request): boolean {
    const origin = request.headers.get("origin");

    if (!origin) {
        return false;
    }

    try {
        return new URL(origin).origin === new URL(request.url).origin;
    } catch {
        return false;
    }
}


async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Konfigurasi Supabase belum lengkap.");
    }

    return createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // Cookie mungkin tidak dapat diubah dalam konteks tertentu.
                }
            },
        },
    });
}






export async function GET() {
    const responseHeaders = {
        "Cache-Control": "no-store, max-age=0",
    };

    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getClaims();

        const userId = data?.claims?.sub;

        if (error || typeof userId !== "string") {
            return NextResponse.json(
                { error: "Silakan login kembali." },
                { status: 401, headers: responseHeaders }
            );
        }

        const { data: settings, error: queryError } = await supabase
            .from("ai_provider_settings")
            .select(
                "provider_name, base_url, model, updated_at, encrypted_api_key"
            )
            .eq("user_id", userId)
            .maybeSingle();

        if (queryError) {
            return NextResponse.json(
                { error: "Gagal membaca konfigurasi AI." },
                { status: 500, headers: responseHeaders }
            );
        }

        return NextResponse.json(
            {
                settings: settings
                    ? {
                        providerName: settings.provider_name,
                        endpointUrl: settings.base_url,
                        model: settings.model,
                        updatedAt: settings.updated_at,
                        apiKey: settings.encrypted_api_key
                            ? decryptApiKey(settings.encrypted_api_key)
                            : "",
                        hasApiKey: Boolean(settings.encrypted_api_key),
                    }
                    : null,
            },
            { headers: responseHeaders }
        );
    } catch {
        return NextResponse.json(
            { error: "Terjadi kesalahan pada server." },
            { status: 500, headers: responseHeaders }
        );
    }
}



export async function POST(request: Request) {
    const responseHeaders = {
        "Cache-Control": "no-store, max-age=0",
    };

    try {
        if (!isSameOriginRequest(request)) {
            return NextResponse.json(
                { error: "Permintaan lintas origin ditolak." },
                { status: 403, headers: responseHeaders }
            );
        }

        const contentType = request.headers.get("content-type") ?? "";

        if (!contentType.toLowerCase().includes("application/json")) {
            return NextResponse.json(
                { error: "Content-Type harus application/json." },
                { status: 415, headers: responseHeaders }
            );
        }

        const contentLengthHeader = request.headers.get("content-length");

        if (contentLengthHeader !== null) {
            if (!/^\d+$/.test(contentLengthHeader)) {
                return NextResponse.json(
                    { error: "Header ukuran request tidak valid." },
                    { status: 400, headers: responseHeaders }
                );
            }

            const contentLength = Number(contentLengthHeader);

            if (
                !Number.isSafeInteger(contentLength) ||
                contentLength > MAX_REQUEST_BYTES
            ) {
                return NextResponse.json(
                    { error: "Request terlalu besar." },
                    { status: 413, headers: responseHeaders }
                );
            }
        }

        let rawBody: string;

        try {
            const body = await readBodyWithLimit(
                request,
                MAX_REQUEST_BYTES
            );

            if (body === null) {
                return NextResponse.json(
                    { error: "Request terlalu besar." },
                    { status: 413, headers: responseHeaders }
                );
            }

            rawBody = body;
        } catch {
            return NextResponse.json(
                {
                    error: "Body request tidak valid atau tidak dapat dibaca.",
                },
                { status: 400, headers: responseHeaders }
            );
        }

        if (!rawBody.trim()) {
            return NextResponse.json(
                { error: "Body request wajib diisi." },
                { status: 400, headers: responseHeaders }
            );
        }

        let body: Record<string, unknown>;

        try {
            const parsed: unknown = JSON.parse(rawBody);

            if (
                parsed === null ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {
                return NextResponse.json(
                    { error: "Body JSON harus berupa objek." },
                    { status: 400, headers: responseHeaders }
                );
            }

            body = parsed as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                { error: "Format JSON tidak valid." },
                { status: 400, headers: responseHeaders }
            );
        }

        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getClaims();

        const userId = data?.claims?.sub;

        if (error || typeof userId !== "string" || !userId) {
            return NextResponse.json(
                { error: "Silakan login kembali." },
                { status: 401, headers: responseHeaders }
            );
        }


        const { data: existingSettings, error: existingSettingsError } =
            await supabase
                .from("ai_provider_settings")
                .select("encrypted_api_key")
                .eq("user_id", userId)
                .maybeSingle();

        if (existingSettingsError) {
            return NextResponse.json(
                { error: "Gagal memeriksa konfigurasi AI yang tersimpan." },
                { status: 500, headers: responseHeaders }
            );
        }

        const existingEncryptedApiKey =
            typeof existingSettings?.encrypted_api_key === "string"
                ? existingSettings.encrypted_api_key
                : "";


        const endpointUrl = validateAiEndpoint(body.endpointUrl);
        const model =
            typeof body.model === "string" ? body.model.trim() : "";
        const apiKey =
            typeof body.apiKey === "string" ? body.apiKey.trim() : "";
        const providerName =
            typeof body.providerName === "string"
                ? body.providerName.trim()
                : "Custom";

        if (!endpointUrl) {
            return NextResponse.json(
                { error: "URL endpoint HTTPS tidak valid." },
                { status: 400, headers: responseHeaders }
            );
        }

        if (!model || model.length > 200) {
            return NextResponse.json(
                {
                    error: "Model wajib diisi, maksimal 200 karakter.",
                },
                { status: 400, headers: responseHeaders }
            );
        }


        if (apiKey.length > 4096) {
            return NextResponse.json(
                {
                    error: "API key maksimal 4096 karakter.",
                },
                { status: 400, headers: responseHeaders }
            );
        }

        if (!apiKey && !existingEncryptedApiKey) {
            return NextResponse.json(
                {
                    error: "API key wajib diisi untuk konfigurasi pertama.",
                },
                { status: 400, headers: responseHeaders }
            );
        }


        if (!providerName || providerName.length > 100) {
            return NextResponse.json(
                {
                    error: "Nama penyedia maksimal 100 karakter.",
                },
                { status: 400, headers: responseHeaders }
            );
        }


        const encryptedApiKey = apiKey
            ? encryptApiKey(apiKey)
            : existingEncryptedApiKey;


        const { error: saveError } = await supabase
            .from("ai_provider_settings")
            .upsert(
                {
                    user_id: userId,
                    provider_name: providerName,
                    base_url: endpointUrl,
                    model,
                    encrypted_api_key: encryptedApiKey,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            );

        if (saveError) {
            return NextResponse.json(
                { error: "Gagal menyimpan konfigurasi AI." },
                { status: 500, headers: responseHeaders }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Konfigurasi AI berhasil disimpan.",
                settings: {
                    providerName,
                    endpointUrl,
                    model,
                    hasApiKey: true,
                },
            },
            { headers: responseHeaders }
        );
    } catch {
        return NextResponse.json(
            { error: "Terjadi kesalahan saat menyimpan konfigurasi." },
            { status: 500, headers: responseHeaders }
        );
    }
}

