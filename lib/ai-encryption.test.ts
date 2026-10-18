
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
    decryptApiKey,
    encryptApiKey,
} from "./ai-encryption";

const TEST_KEY = "0123456789abcdef".repeat(4);

describe("AI API key encryption", () => {
    beforeEach(() => {
        vi.stubEnv("AI_SETTINGS_ENCRYPTION_KEY", TEST_KEY);
    });

    it("mengenkripsi dan mendekripsi API key dengan benar", () => {
        const original = "test-api-key-123";
        const encrypted = encryptApiKey(original);

        expect(encrypted).not.toContain(original);
        expect(decryptApiKey(encrypted)).toBe(original);
    });

    it("menghasilkan ciphertext berbeda untuk plaintext yang sama", () => {
        const original = "test-api-key-123";

        const encrypted1 = encryptApiKey(original);
        const encrypted2 = encryptApiKey(original);

        expect(encrypted1).not.toBe(encrypted2);
        expect(decryptApiKey(encrypted1)).toBe(original);
        expect(decryptApiKey(encrypted2)).toBe(original);
    });

    it("menolak ciphertext yang telah dimodifikasi", () => {
        const encrypted = encryptApiKey("test-api-key-123");
        const parts = encrypted.split(":");

        parts[3] = `${parts[3]}00`;

        expect(() => decryptApiKey(parts.join(":"))).toThrow();
    });

    it("menolak API key kosong", () => {
        expect(() => encryptApiKey("   ")).toThrow(
            "API key tidak boleh kosong."
        );
    });

    it("menolak kunci enkripsi dengan format tidak valid", () => {
        vi.stubEnv("AI_SETTINGS_ENCRYPTION_KEY", "invalid-key");

        expect(() => encryptApiKey("test-api-key-123")).toThrow(
            "AI_SETTINGS_ENCRYPTION_KEY harus berisi 64 karakter heksadesimal."
        );
    });
    it("menolak ciphertext dengan format yang tidak lengkap", () => {
        expect(() => decryptApiKey("v1:")).toThrow();
        expect(() => decryptApiKey("")).toThrow();
    });

    it("menolak input ciphertext yang bukan string", () => {
        expect(() => decryptApiKey(null as unknown as string)).toThrow();
    });
});
