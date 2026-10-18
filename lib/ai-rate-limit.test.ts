
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getClaims: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn(),
    requestAiCompletion: vi.fn(),
    decryptApiKey: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn(async () => ({
        getAll: () => [],
        set: vi.fn(),
    })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => ({
        auth: {
            getClaims: mocks.getClaims,
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: mocks.maybeSingle,
                })),
            })),
        })),
    })),
}));

vi.mock("@/lib/ai-rate-limit", () => ({
    aiRateLimit: {
        limit: mocks.limit,
    },
}));

vi.mock("@/lib/ai-provider", () => ({
    requestAiCompletion: mocks.requestAiCompletion,
}));

vi.mock("@/lib/ai-encryption", () => ({
    decryptApiKey: mocks.decryptApiKey,
}));

import { POST } from "../app/api/ai/route";

function makeRequest() {
    return new Request("http://localhost:3000/api/ai", {
        method: "POST",
        headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
        },
        body: JSON.stringify({ prompt: "Tes aman" }),
    });
}

describe("POST /api/ai - rate limit", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.getClaims.mockResolvedValue({
            data: {
                claims: { sub: "test-user" },
            },
            error: null,
        });

        mocks.maybeSingle.mockResolvedValue({
            data: {
                provider_name: "test",
                base_url: "https://example.com/v1/chat/completions",
                model: "test-model",
                encrypted_api_key: "fake-encrypted-key",
            },
            error: null,
        });

        mocks.decryptApiKey.mockReturnValue("fake-api-key");
        mocks.requestAiCompletion.mockResolvedValue("hasil tes");
    });

    it("mengembalikan 429 saat batas terlampaui", async () => {
        mocks.limit.mockResolvedValue({
            success: false,
            limit: 10,
            remaining: 0,
            reset: Date.now() + 30_000,
        });

        const response = await POST(makeRequest());

        expect(response.status).toBe(429);
        expect(mocks.limit).toHaveBeenCalledWith("test-user");
        expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
        expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
        expect(response.headers.get("Retry-After")).toBeTruthy();
        expect(mocks.requestAiCompletion).not.toHaveBeenCalled();
    });

    it("mengembalikan 503 jika rate limiter gagal", async () => {
        mocks.limit.mockRejectedValue(new Error("simulated Redis failure"));

        const response = await POST(makeRequest());
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.error).toContain("tidak tersedia");
        expect(mocks.requestAiCompletion).not.toHaveBeenCalled();
    });


    it("mengembalikan 502 dengan pesan generik jika provider AI gagal", async () => {
        mocks.limit.mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 60_000,
        });

        mocks.requestAiCompletion.mockRejectedValue(
            new Error("SECRET_PROVIDER_ERROR: internal server details")
        );

        const response = await POST(makeRequest());
        const body = await response.json();

        expect(response.status).toBe(502);
        expect(body.error).toBe(
            "Permintaan AI gagal. Periksa konfigurasi atau coba lagi."
        );
        expect(JSON.stringify(body)).not.toContain(
            "SECRET_PROVIDER_ERROR"
        );
        expect(JSON.stringify(body)).not.toContain(
            "internal server details"
        );
    });

});
