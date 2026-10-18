
import { validateAiEndpoint } from "../lib/ai-url";

const tests = [
    {
        name: "HTTPS standar",
        url: "https://api.example.com/v1/chat/completions",
        expected: true,
    },
    {
        name: "HTTPS port 443 eksplisit",
        url: "https://api.example.com:443/v1/chat/completions",
        expected: true,
    },
    {
        name: "Port nonstandar 8443",
        url: "https://api.example.com:8443/v1/chat/completions",
        expected: false,
    },
    {
        name: "HTTP tanpa TLS",
        url: "http://api.example.com/v1/chat/completions",
        expected: false,
    },
    {
        name: "Localhost",
        url: "https://localhost/v1/chat/completions",
        expected: false,
    },
    {
        name: "Alamat IP loopback",
        url: "https://127.0.0.1/v1/chat/completions",
        expected: false,
    },
    {
        name: "Alamat IP privat",
        url: "https://192.168.1.1/v1/chat/completions",
        expected: false,
    },
    {
        name: "URL dengan kredensial",
        url: "https://user:password@example.com/v1",
        expected: false,
    },
    {
        name: "URL dengan query string",
        url: "https://api.example.com/v1?token=test",
        expected: false,
    },
];

let failures = 0;

for (const test of tests) {
    const actual = validateAiEndpoint(test.url);
    const passed = (actual !== null) === test.expected;

    console.log(
        `${passed ? "LULUS" : "GAGAL"}: ${test.name}`
    );

    if (!passed) {
        failures++;
        console.error(`  Hasil validasi: ${actual ?? "ditolak"}`);
    }
}

console.log(`\nTotal: ${tests.length - failures}/${tests.length} pengujian lulus.`);

if (failures > 0) {
    process.exitCode = 1;
}
