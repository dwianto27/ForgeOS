
import "server-only";

import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const value = process.env.AI_SETTINGS_ENCRYPTION_KEY;

    if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) {
        throw new Error(
            "AI_SETTINGS_ENCRYPTION_KEY harus berisi 64 karakter heksadesimal."
        );
    }

    return Buffer.from(value, "hex");
}

export function encryptApiKey(plaintext: string): string {
    if (!plaintext.trim()) {
        throw new Error("API key tidak boleh kosong.");
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(
        ALGORITHM,
        getEncryptionKey(),
        iv
    );

    const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        "v1",
        iv.toString("hex"),
        authTag.toString("hex"),
        ciphertext.toString("hex"),
    ].join(":");
}

export function decryptApiKey(encrypted: string): string {
    if (typeof encrypted !== "string") {
        throw new Error("Format data API key terenkripsi tidak valid.");
    }
    const parts = encrypted.split(":");

    if (parts.length !== 4 || parts[0] !== "v1") {
        throw new Error("Format data API key terenkripsi tidak valid.");
    }

    const [, ivHex, authTagHex, ciphertextHex] = parts;

    if (
        !/^[0-9a-f]{24}$/i.test(ivHex) ||
        authTagHex.length !== AUTH_TAG_LENGTH * 2 ||
        !/^[0-9a-f]+$/i.test(authTagHex) ||
        !/^(?:[0-9a-f]{2})+$/i.test(ciphertextHex)
    ) {
        throw new Error("Format data enkripsi tidak valid.");
    }

    const decipher = createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, "hex")),
        decipher.final(),
    ]);

    return plaintext.toString("utf8");
}
