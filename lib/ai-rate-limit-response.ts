
export type AiRateLimitResult = {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
};

export function getAiRateLimitResponse(
    result: AiRateLimitResult,
    now = Date.now()
) {
    if (result.success) {
        return null;
    }

    const retryAfter = Math.max(
        1,
        Math.ceil((result.reset - now) / 1000)
    );

    return {
        status: 429,
        body: {
            error: "Batas 10 permintaan AI per menit tercapai. Coba lagi nanti.",
        },
        headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
        },
    };
}


export function getAiRateLimitUnavailableResponse() {
    return {
        status: 503,
        body: {
            error: "Layanan pembatasan penggunaan AI sedang tidak tersedia. Coba lagi nanti.",
        },
    };
}
