
export function validateAiEndpoint(value: unknown): string | null {
    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.length > 2048 ||
        value !== value.trim()
    ) {
        return null;
    }

    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();

        // Wajib menggunakan HTTPS.
        if (url.protocol !== "https:") {
            return null;
        }

        // Hanya izinkan port HTTPS standar, yaitu 443.
        if (url.port && url.port !== "443") {
            return null;
        }

        // Tolak kredensial, query string, dan fragment.
        if (url.username || url.password || url.search || url.hash) {
            return null;
        }

        // Tolak localhost dan domain internal yang umum.
        if (
            !hostname ||
            hostname === "localhost" ||
            hostname.endsWith(".localhost") ||
            hostname.endsWith(".local") ||
            hostname.endsWith(".internal") ||
            hostname === "metadata.google.internal"
        ) {
            return null;
        }

        // Tolak alamat IPv4 dan IPv6 literal.
        if (
            /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
            hostname.startsWith("[") ||
            hostname.includes(":")
        ) {
            return null;
        }

        // Periksa format nama host DNS.
        const dnsHostname = hostname.endsWith(".")
            ? hostname.slice(0, -1)
            : hostname;

        if (
            dnsHostname.length > 253 ||
            !dnsHostname.includes(".") ||
            dnsHostname.split(".").some(
                (label) =>
                    label.length === 0 ||
                    label.length > 63 ||
                    ! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
            )
        ) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}
