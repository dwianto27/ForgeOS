
import { readBodyWithLimit } from "@/lib/read-body-with-limit";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/ai-encryption";
import { requestAiCompletion } from "@/lib/ai-provider";
import { aiRateLimit } from "@/lib/ai-rate-limit";
import {
    getAiRateLimitResponse,
    getAiRateLimitUnavailableResponse,
} from "@/lib/ai-rate-limit-response";


const MAX_REQUEST_BYTES = 24_000;
const MAX_PROMPT_LENGTH = 20_000;

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
                { error: "Format permintaan harus JSON." },
                { status: 415, headers: responseHeaders }
            );
        }

        const contentLength = request.headers.get("content-length");

        if (contentLength !== null) {
            if (!/^\d+$/.test(contentLength)) {
                return NextResponse.json(
                    { error: "Ukuran permintaan tidak valid." },
                    { status: 400, headers: responseHeaders }
                );
            }

            const parsedLength = Number(contentLength);

            if (
                !Number.isSafeInteger(parsedLength) ||
                parsedLength > MAX_REQUEST_BYTES
            ) {
                return NextResponse.json(
                    { error: "Ukuran permintaan terlalu besar." },
                    { status: 413, headers: responseHeaders }
                );
            }
        }

        let rawBody: string;

        try {
            const bodyResult = await readBodyWithLimit(
                request,
                MAX_REQUEST_BYTES
            );

            if (bodyResult === null) {
                return NextResponse.json(
                    { error: "Ukuran permintaan terlalu besar." },
                    { status: 413, headers: responseHeaders }
                );
            }

            rawBody = bodyResult;
        } catch {
            return NextResponse.json(
                { error: "Body permintaan gagal dibaca." },
                { status: 400, headers: responseHeaders }
            );
        }

        if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
            return NextResponse.json(
                { error: "Ukuran permintaan terlalu besar." },
                { status: 413, headers: responseHeaders }
            );
        }

        let body: unknown;

        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: "JSON permintaan tidak valid." },
                { status: 400, headers: responseHeaders }
            );
        }

        if (
            typeof body !== "object" ||
            body === null ||
            !("prompt" in body) ||
            typeof body.prompt !== "string"
        ) {
            return NextResponse.json(
                { error: "Prompt AI wajib diisi." },
                { status: 400, headers: responseHeaders }
            );
        }

        const prompt = body.prompt.trim();

        if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json(
                { error: "Prompt kosong atau terlalu panjang." },
                { status: 400, headers: responseHeaders }
            );
        }

        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(
                                ({ name, value, options }) => {
                                    cookieStore.set(name, value, options);
                                }
                            );
                        } catch {
                            // Cookie mungkin tidak dapat ditulis dalam konteks ini.
                        }
                    },
                },
            }
        );

        const { data: claimsData, error: claimsError } =
            await supabase.auth.getClaims();

        const userId = claimsData?.claims?.sub;

        if (claimsError || typeof userId !== "string" || !userId) {
            return NextResponse.json(
                {
                    error: "Silakan login kembali untuk menggunakan AI.",
                },
                { status: 401, headers: responseHeaders }
            );
        }

        const { data: settings, error: settingsError } = await supabase
            .from("ai_provider_settings")
            .select("provider_name, base_url, model, encrypted_api_key")
            .eq("user_id", userId)
            .maybeSingle();

        if (settingsError) {
            return NextResponse.json(
                { error: "Konfigurasi AI gagal dibaca." },
                { status: 500, headers: responseHeaders }
            );
        }

        if (!settings) {
            return NextResponse.json(
                {
                    error: "Simpan konfigurasi penyedia AI terlebih dahulu.",
                },
                { status: 400, headers: responseHeaders }
            );
        }

        let rateLimitResult;

        try {
            rateLimitResult = await aiRateLimit.limit(userId);
        } catch {
            const unavailable = getAiRateLimitUnavailableResponse();

            return NextResponse.json(
                unavailable.body,
                {
                    status: unavailable.status,
                    headers: {
                        ...responseHeaders,
                    },
                }
            );
        }

        const rateLimitResponse =
            getAiRateLimitResponse(rateLimitResult);

        if (rateLimitResponse) {
            return NextResponse.json(
                rateLimitResponse.body,
                {
                    status: rateLimitResponse.status,
                    headers: {
                        ...rateLimitResponse.headers,
                        ...responseHeaders,
                    },
                }
            );
        }

        let apiKey: string;

        try {
            apiKey = decryptApiKey(settings.encrypted_api_key);
        } catch {
            return NextResponse.json(
                { error: "API key tersimpan tidak dapat dibaca." },
                { status: 500, headers: responseHeaders }
            );
        }


        const result = await requestAiCompletion({
            endpointUrl: settings.base_url,
            model: settings.model,
            apiKey,
            prompt,
        });

        return NextResponse.json(
            { result },
            { headers: responseHeaders }
        );
    }
    catch (error: unknown) {
        const errorCode =
            error instanceof Error ? error.message : "";
        console.error("[ForgeOS AI] Error classification:", {
            name: error instanceof Error ? error.name : "UnknownError",
            code: errorCode,
        });

        if (errorCode === "AI_PROVIDER_BUSY") {
            return NextResponse.json(
                {
                    error:
                        "Penyedia AI sedang sibuk. Silakan coba lagi dalam beberapa menit.",
                    code: "AI_PROVIDER_BUSY",
                    retryable: true,
                },
                {
                    status: 503,
                    headers: {
                        ...responseHeaders,
                        "Retry-After": "60",
                    },
                }
            );
        }

        if (errorCode === "AI_PROVIDER_REJECTED") {
            return NextResponse.json(
                {
                    error:
                        "Penyedia AI menolak permintaan. Periksa konfigurasi model AI.",
                    code: "AI_PROVIDER_REJECTED",
                    retryable: false,
                },
                {
                    status: 502,
                    headers: responseHeaders,
                }
            );
        }

        const diagnostic =
            error instanceof Error
                ? {
                    name: error.name,
                    code:
                        "code" in error &&
                            typeof error.code === "string"
                            ? error.code
                            : undefined,
                    status:
                        "status" in error &&
                            typeof error.status === "number"
                            ? error.status
                            : undefined,
                }
                : { name: "UnknownError" };

        console.error(
            "[ForgeOS AI] Request failed:",
            diagnostic
        );

        return NextResponse.json(
            {
                error:
                    "Permintaan AI gagal. Silakan coba lagi.",
                code: "AI_REQUEST_FAILED",
                retryable: true,
            },
            {
                status: 502,
                headers: responseHeaders,
            }
        );
    }

}
