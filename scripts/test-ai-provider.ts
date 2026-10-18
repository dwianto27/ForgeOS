
import { requestAiCompletion } from "../lib/ai-provider";

async function main() {
    const invalidEndpoints = [
        "http://api.example.com/v1/chat/completions",
        "https://localhost/v1/chat/completions",
        "https://127.0.0.1/v1/chat/completions",
        "https://api.example.com:8443/v1/chat/completions",
    ];

    let failures = 0;

    for (const endpointUrl of invalidEndpoints) {
        try {
            await requestAiCompletion({
                endpointUrl,
                model: "test-model",
                apiKey: "test-key-local-only",
                prompt: "Tes validasi lokal",
            });

            console.error(`GAGAL: Endpoint diterima: ${endpointUrl}`);
            failures++;
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "";

            if (
                message ===
                "Endpoint AI tidak valid atau tidak diizinkan."
            ) {
                console.log(`LULUS: Endpoint ditolak: ${endpointUrl}`);
            } else {
                console.error(
                    `GAGAL: Error tidak sesuai untuk ${endpointUrl}: ${message}`
                );
                failures++;
            }
        }
    }

    console.log(
        `\nTotal: ${invalidEndpoints.length - failures}/${invalidEndpoints.length} pengujian lulus.`
    );

    if (failures > 0) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error("Pengujian gagal:", error);
    process.exitCode = 1;
});
