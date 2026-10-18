
export async function readBodyWithLimit(
    request: Request,
    maxBytes: number
): Promise<string | null> {
    if (!request.body) {
        return "";
    }

    const reader = request.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let totalBytes = 0;
    let rawBody = "";

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            totalBytes += value.byteLength;

            if (totalBytes > maxBytes) {
                try {
                    await reader.cancel();
                } catch {
                    // Body sudah dibatalkan atau stream gagal.
                }

                return null;
            }

            rawBody += decoder.decode(value, { stream: true });
        }

        rawBody += decoder.decode();

        return rawBody;
    } catch {
        throw new Error("Body request tidak dapat dibaca.");
    } finally {
        reader.releaseLock();
    }
}
