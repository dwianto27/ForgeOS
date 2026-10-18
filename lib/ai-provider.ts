
import "server-only";

import { guardedFetchJson } from "guarded-fetch";
import { validateAiEndpoint } from "@/lib/ai-url";

type ChatCompletionResponse = {
    choices?: Array<{
        message?: {
            content?: unknown;
        };
    }>;
};

type AiRequestOptions = {
    endpointUrl: string;
    model: string;
    apiKey: string;
    prompt: string;
};

export async function requestAiCompletion({
    endpointUrl,
    model,
    apiKey,
    prompt,
}: AiRequestOptions): Promise<string> {
    if (
        !endpointUrl.trim() ||
        !model.trim() ||
        !apiKey.trim() ||
        !prompt.trim()
    ) {
        throw new Error("Konfigurasi atau prompt AI belum lengkap.");
    }

    if (prompt.length > 20_000) {
        throw new Error("Prompt terlalu panjang.");
    }

    const validatedEndpoint = validateAiEndpoint(endpointUrl);

    if (!validatedEndpoint) {
        throw new Error("Endpoint AI tidak valid atau tidak diizinkan.");
    }

    const response =
        await guardedFetchJson<ChatCompletionResponse>(
            validatedEndpoint,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                }),
                httpsOnly: true,
                followRedirects: false,
                timeoutMs: 60_000,
                maxResponseBytes: 1_048_576,
                throwOnHttpError: false,
                opaqueErrors: true,
            }
        );

    const content = response.choices?.[0]?.message?.content;

    const providerError = (
        response as {
            error?: {
                message?: unknown;
                code?: unknown;
                type?: unknown;
            };
        }
    ).error;


    if (providerError) {
        const providerCode =
            typeof providerError.code === "string"
                ? providerError.code
                : "";

        const providerType =
            typeof providerError.type === "string"
                ? providerError.type
                : "";

        const providerMessage =
            typeof providerError.message === "string"
                ? providerError.message.toLowerCase()
                : "";

        const isBusy =
            providerCode === "model_concurrency" ||
            providerCode === "get_channel_failed" ||
            providerType === "rate_limit_error" ||
            providerMessage.includes("rate limit") ||
            providerMessage.includes("provider is full") ||
            providerMessage.includes("providers for model");

        if (isBusy) {
            throw new Error("AI_PROVIDER_BUSY");
        }

        throw new Error("AI_PROVIDER_REJECTED");
    }


    if (typeof content !== "string" || !content.trim()) {
        throw new Error("Format respons penyedia AI tidak valid.");
    }

    if (content.length > 30_000) {
        throw new Error("Respons AI terlalu panjang.");
    }

    return content;
}
