
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getClaims: vi.fn(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
    encryptApiKey: vi.fn(),
    select: vi.fn(),

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
            select: mocks.select,
            upsert: mocks.upsert,
        })),
    })),
}));

vi.mock("@/lib/ai-encryption", () => ({
    encryptApiKey: mocks.encryptApiKey,
}));

vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://test.supabase.co"
);

vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "test-publishable-key"
);

import { GET, POST } from "../app/api/ai-settings/route";

function makeRequest(body: string) {
    return new Request("http://localhost:3000/api/ai-settings", {
        method: "POST",
        headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
        },
        body,
    });
}

describe("POST /api/ai-settings - batas request", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.getClaims.mockResolvedValue({
            data: {
                claims: {},
            },
            error: null,
        });

        mocks.maybeSingle.mockResolvedValue({
            data: null,
            error: null,
        });

        mocks.upsert.mockResolvedValue({ error: null });
        mocks.encryptApiKey.mockReturnValue("fake-encrypted-value");
    });

    it("menolak body yang melebihi batas sebelum autentikasi dan enkripsi", async () => {
        const response = await POST(
            makeRequest(JSON.stringify({ value: "x".repeat(17_000) }))
        );

        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body.error).toBe("Request terlalu besar.");
        expect(mocks.getClaims).not.toHaveBeenCalled();
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });


    it("menolak request dengan origin berbeda", async () => {
        const request = new Request(
            "http://localhost:3000/api/ai-settings",
            {
                method: "POST",
                headers: {
                    origin: "https://attacker.example",
                    "content-type": "application/json",
                },
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Permintaan lintas origin ditolak.");
        expect(mocks.getClaims).not.toHaveBeenCalled();
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("menolak JSON yang tidak valid", async () => {
        const response = await POST(makeRequest("{invalid-json"));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Format JSON tidak valid.");
        expect(mocks.getClaims).not.toHaveBeenCalled();
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });


    it("menolak pengguna yang belum terautentikasi", async () => {
        mocks.getClaims.mockResolvedValue({
            data: { claims: null },
            error: null,
        });

        const response = await POST(
            makeRequest(
                JSON.stringify({
                    providerName: "Custom",
                    endpointUrl: "https://example.com/v1/chat/completions",
                    model: "test-model",
                    apiKey: "fake-test-key",
                })
            )
        );

        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toBe("Silakan login kembali.");
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("menolak endpoint HTTP sebelum enkripsi dan penyimpanan", async () => {
        mocks.getClaims.mockResolvedValue({
            data: {
                claims: { sub: "test-user" },
            },
            error: null,
        });

        const response = await POST(
            makeRequest(
                JSON.stringify({
                    providerName: "Custom",
                    endpointUrl: "http://example.com/v1/chat/completions",
                    model: "test-model",
                    apiKey: "fake-test-key",
                })
            )
        );

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("URL endpoint HTTPS tidak valid.");
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("menolak model yang melebihi batas panjang", async () => {
        mocks.getClaims.mockResolvedValue({
            data: {
                claims: { sub: "test-user" },
            },
            error: null,
        });

        const response = await POST(
            makeRequest(
                JSON.stringify({
                    providerName: "Custom",
                    endpointUrl: "https://example.com/v1/chat/completions",
                    model: "m".repeat(201),
                    apiKey: "fake-test-key",
                })
            )
        );

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Model wajib diisi, maksimal 200 karakter.");
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });


    it("menolak API key yang melebihi batas panjang", async () => {
        mocks.getClaims.mockResolvedValue({
            data: {
                claims: { sub: "test-user" },
            },
            error: null,
        });

        const response = await POST(
            makeRequest(
                JSON.stringify({
                    providerName: "Custom",
                    endpointUrl: "https://example.com/v1/chat/completions",
                    model: "test-model",
                    apiKey: "k".repeat(4097),
                })
            )
        );

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("API key wajib diisi dan harus valid.");
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });


    it("menolak nama provider yang melebihi batas panjang", async () => {
        mocks.getClaims.mockResolvedValue({
            data: {
                claims: { sub: "test-user" },
            },
            error: null,
        });

        const response = await POST(
            makeRequest(
                JSON.stringify({
                    providerName: "P".repeat(101),
                    endpointUrl: "https://example.com/v1/chat/completions",
                    model: "test-model",
                    apiKey: "fake-test-key",
                })
            )
        );

        expect(response.status).toBe(400);
        expect(mocks.encryptApiKey).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });


    it("mengenkripsi API key sebelum menyimpan konfigurasi", async () => {
        mocks.getClaims.mockResolvedValue({
            data: {
                claims: { sub: "test-user" },
            },
            error: null,
        });

        const apiKey = "fake-test-key";

        const response = await POST(
            makeRequest(
                JSON.stringify({
                    providerName: "Custom",
                    endpointUrl: "https://example.com/v1/chat/completions",
                    model: "test-model",
                    apiKey,
                })
            )
        );

        expect(response.status).toBe(200);

        expect(mocks.encryptApiKey).toHaveBeenCalledWith(apiKey);
        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: "test-user",
                provider_name: "Custom",
                base_url: "https://example.com/v1/chat/completions",
                model: "test-model",
                encrypted_api_key: "fake-encrypted-value",
            }),
            expect.objectContaining({
                onConflict: "user_id",
            })
        );

        const savedConfig = mocks.upsert.mock.calls[0][0];

        expect(savedConfig.encrypted_api_key).not.toBe(apiKey);
        expect(savedConfig).not.toHaveProperty("apiKey");
    });


});


describe("GET /api/ai-settings - perlindungan API key", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.getClaims.mockResolvedValue({
            data: {
                claims: {
                    sub: "test-user",
                },
            },
            error: null,
        });
    });

    it("tidak mengembalikan API key terenkripsi atau rahasia", async () => {
        const encryptedApiKey = "v1:fake-iv:fake-tag:fake-ciphertext";
        const secretApiKey = "fake-secret-api-key";

        mocks.select.mockImplementation((columns: string) => {
            expect(columns).toBe(
                "provider_name, base_url, model, updated_at"
            );

            return {
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                            provider_name: "Custom",
                            base_url: "https://example.com/v1",
                            model: "test-model",
                            updated_at: "2026-10-17T00:00:00.000Z",
                            encrypted_api_key: encryptedApiKey,
                            api_key: secretApiKey,
                        },
                        error: null,
                    }),
                })),
            };
        });

        const response = await GET();
        const body = await response.json();
        const responseText = JSON.stringify(body);

        expect(response.status).toBe(200);
        expect(body.settings).toEqual({
            providerName: "Custom",
            endpointUrl: "https://example.com/v1",
            model: "test-model",
            updatedAt: "2026-10-17T00:00:00.000Z",
            hasApiKey: true,
        });

        expect(responseText).not.toContain(encryptedApiKey);
        expect(responseText).not.toContain(secretApiKey);
    });
});

