
import { describe, expect, it } from "vitest";
import { readBodyWithLimit } from "./read-body-with-limit";

describe("readBodyWithLimit", () => {
    it("membaca body yang ukurannya masih dalam batas", async () => {
        const request = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ prompt: "Tes aman" }),
        });

        const result = await readBodyWithLimit(request, 1024);

        expect(result).toBe(JSON.stringify({ prompt: "Tes aman" }));
    });

    it("mengembalikan null jika ukuran body melampaui batas", async () => {
        const request = new Request("http://localhost", {
            method: "POST",
            body: "x".repeat(100),
        });

        const result = await readBodyWithLimit(request, 10);

        expect(result).toBeNull();
    });

    it("mengembalikan string kosong jika body tidak tersedia", async () => {
        const request = new Request("http://localhost");

        const result = await readBodyWithLimit(request, 10);

        expect(result).toBe("");
    });

    it("menolak body dengan UTF-8 yang tidak valid", async () => {
        const invalidUtf8 = new Uint8Array([0xc3, 0x28]);

        const request = new Request("http://localhost", {
            method: "POST",
            body: invalidUtf8,
        });

        await expect(
            readBodyWithLimit(request, 10)
        ).rejects.toThrow("Body request tidak dapat dibaca.");
    });
});
