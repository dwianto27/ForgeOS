
import { describe, expect, it } from "vitest";
import { validateAiEndpoint } from "@/lib/ai-url";
import { assertUrlIsSafeToFetch } from "guarded-fetch";


describe("validateAiEndpoint", () => {
    it("menerima endpoint HTTPS publik yang valid", () => {
        expect(
            validateAiEndpoint("https://api.example.com/v1/chat/completions")
        ).toBe("https://api.example.com/v1/chat/completions");
    });

    it("menolak nilai yang bukan string atau kosong", () => {
        expect(validateAiEndpoint(null)).toBeNull();
        expect(validateAiEndpoint(undefined)).toBeNull();
        expect(validateAiEndpoint("")).toBeNull();
        expect(validateAiEndpoint("   ")).toBeNull();
    });

    it("menolak URL dengan spasi di awal atau akhir", () => {
        expect(
            validateAiEndpoint(" https://api.example.com/v1 ")
        ).toBeNull();
    });

    it("menolak protokol selain HTTPS", () => {
        expect(validateAiEndpoint("http://api.example.com/v1")).toBeNull();
        expect(validateAiEndpoint("ftp://api.example.com")).toBeNull();
    });

    it("menolak port selain port HTTPS standar", () => {
        expect(
            validateAiEndpoint("https://api.example.com:8443/v1")
        ).toBeNull();
    });

    it("menolak kredensial, query string, dan fragment", () => {
        expect(
            validateAiEndpoint("https://user:pass@api.example.com/v1")
        ).toBeNull();
        expect(
            validateAiEndpoint("https://api.example.com/v1?token=secret")
        ).toBeNull();
        expect(
            validateAiEndpoint("https://api.example.com/v1#fragment")
        ).toBeNull();
    });

    it("menolak localhost dan domain internal umum", () => {
        expect(validateAiEndpoint("https://localhost/v1")).toBeNull();
        expect(validateAiEndpoint("https://service.localhost/v1")).toBeNull();
        expect(validateAiEndpoint("https://server.local/v1")).toBeNull();
        expect(validateAiEndpoint("https://service.internal/v1")).toBeNull();
    });

    it("menolak alamat IP literal IPv4 dan IPv6", () => {
        expect(validateAiEndpoint("https://127.0.0.1/v1")).toBeNull();
        expect(validateAiEndpoint("https://192.168.1.10/v1")).toBeNull();
        expect(validateAiEndpoint("https://[::1]/v1")).toBeNull();
    });

    it("menolak hostname yang tidak valid", () => {
        expect(validateAiEndpoint("https://api")).toBeNull();
        expect(validateAiEndpoint("https://-invalid.example.com")).toBeNull();
        expect(validateAiEndpoint("https://invalid-.example.com")).toBeNull();
        expect(validateAiEndpoint("https://api..example.com")).toBeNull();
    });

    it("menolak URL yang terlalu panjang", () => {
        expect(
            validateAiEndpoint(`https://${"a".repeat(2040)}.com`)
        ).toBeNull();
    });

    it("menolak nilai yang bukan URL valid", () => {
        expect(validateAiEndpoint("bukan-url")).toBeNull();
        expect(validateAiEndpoint("https://")).toBeNull();
    });
});

describe("perlindungan SSRF guarded-fetch", () => {
    it("menolak alamat loopback IPv4", async () => {
        await expect(
            assertUrlIsSafeToFetch("https://127.0.0.1")
        ).rejects.toMatchObject({
            code: "hostname_unsafe",
        });
    });

    it("menolak alamat privat IPv4", async () => {
        await expect(
            assertUrlIsSafeToFetch("https://192.168.1.1")
        ).rejects.toMatchObject({
            code: "hostname_unsafe",
        });
    });

    it("menolak alamat metadata cloud", async () => {
        await expect(
            assertUrlIsSafeToFetch("https://169.254.169.254")
        ).rejects.toMatchObject({
            code: "hostname_unsafe",
        });
    });

    it("menolak alamat loopback IPv6", async () => {
        await expect(
            assertUrlIsSafeToFetch("https://[::1]")
        ).rejects.toMatchObject({
            code: "hostname_unsafe",
        });
    });
});
