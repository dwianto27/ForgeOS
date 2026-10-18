
import { describe, expect, it } from "vitest";
import { getAiRateLimitResponse } from "./ai-rate-limit-response";

describe("getAiRateLimitResponse", () => {
    it("menghasilkan respons 429 saat batas terlampaui", () => {
        const now = 1_800_000_000_000;

        const response = getAiRateLimitResponse(
            {
                success: false,
                limit: 10,
                remaining: 0,
                reset: now + 30_000,
            },
            now
        );

        expect(response).not.toBeNull();
        expect(response?.status).toBe(429);
        expect(response?.headers["Retry-After"]).toBe("30");
        expect(response?.headers["X-RateLimit-Limit"]).toBe("10");
        expect(response?.headers["X-RateLimit-Remaining"]).toBe("0");
    });

    it("tidak menghasilkan respons penolakan jika batas belum terlampaui", () => {
        const response = getAiRateLimitResponse({
            success: true,
            limit: 10,
            remaining: 4,
            reset: Date.now() + 30_000,
        });

        expect(response).toBeNull();
    });


    it("menghasilkan respons 503 saat layanan rate limiter tidak tersedia", async () => {
        const { getAiRateLimitUnavailableResponse } = await import(
            "./ai-rate-limit-response"
        );

        const response = getAiRateLimitUnavailableResponse();

        expect(response.status).toBe(503);
        expect(response.body.error).toContain(
            "tidak tersedia"
        );
    });

});
