
"use client";

import Link from "next/link";
import { useState } from "react";

const helpSections = [
    {
        id: "overview",
        title: "Mengenal ForgeOS",
        description:
            "ForgeOS membantu kamu mengatur proyek, memecah pekerjaan menjadi tugas, dan menggunakan AI untuk menyusun rencana kerja.",
        items: [
            {
                title: "Dashboard",
                description:
                    "Lihat ringkasan proyek dan aktivitas pekerjaan dalam satu tempat.",
            },
            {
                title: "Proyek",
                description:
                    "Gunakan proyek untuk mengelompokkan pekerjaan berdasarkan tujuan yang ingin dicapai.",
            },
            {
                title: "Tugas",
                description:
                    "Pecah proyek menjadi pekerjaan yang lebih kecil dan pantau status penyelesaiannya.",
            },
            {
                title: "AI Command Center",
                description:
                    "Masukkan tujuan proyek agar AI membantu menyusun nama proyek, deskripsi, prioritas, target hari, dan daftar tugas.",
            },
        ],
    },
    {
        id: "create-project",
        title: "Membuat proyek dengan AI",
        description:
            "Gunakan AI untuk mengubah ide menjadi rencana proyek yang lebih terstruktur.",
        items: [
            {
                title: "1. Tulis tujuan proyek",
                description:
                    "Jelaskan apa yang ingin dibangun, hasil yang diharapkan, dan kebutuhan penting lainnya. Semakin jelas instruksi, semakin relevan rencananya.",
            },
            {
                title: "2. Buat rencana",
                description:
                    "Klik tombol Buat Rencana Proyek dan tunggu AI menghasilkan rancangan proyek beserta daftar tugasnya.",
            },
            {
                title: "3. Periksa hasil",
                description:
                    "Tinjau deskripsi, estimasi durasi, prioritas, dan target hari. Pastikan hasilnya sesuai kebutuhanmu.",
            },
            {
                title: "4. Simpan proyek",
                description:
                    "Klik Simpan sebagai Proyek untuk menyimpan rencana ke ForgeOS. Pastikan proses penyimpanan berhasil sebelum melanjutkan.",
            },
        ],
    },
    {
        id: "ai-setup",
        title: "Setup AI Provider di ForgeOS",
        description:
            "ForgeOS dapat dikonfigurasi untuk menggunakan berbagai layanan AI, baik cloud maupun lokal. NVIDIA NIM, OpenAI, Ollama, Groq, OpenRouter, DeepSeek, Together AI, Fireworks AI, dan provider lain dapat digunakan jika endpoint serta format API-nya kompatibel dengan implementasi ForgeOS. Daftar ini merupakan contoh, bukan batasan provider yang didukung.",
        items: [
            {
                title: "1. Pilih provider AI",
                description:
                    "Tentukan layanan AI yang ingin digunakan. Kamu dapat menggunakan provider cloud, gateway yang menyediakan banyak model, atau server AI lokal. Periksa dokumentasi provider untuk mengetahui model, endpoint API, metode autentikasi, dan format request yang didukung.",
            },
            {
                title: "2. Siapkan endpoint dan model",
                description:
                    "Cari Base URL API dan model ID pada dokumentasi provider. Contoh endpoint OpenAI: https://api.openai.com/v1. NVIDIA NIM: https://integrate.api.nvidia.com/v1. Groq: https://api.groq.com/openai/v1. OpenRouter: https://openrouter.ai/api/v1. Ollama OpenAI-compatible: http://localhost:11434/v1 untuk koneksi lokal yang sesuai. Endpoint tersebut merupakan contoh; gunakan konfigurasi yang sesuai dengan provider dan lingkungan server kamu.",
            },
            {
                title: "3. Pahami Base URL dan endpoint lengkap",
                description:
                    "Base URL biasanya merupakan alamat dasar API, misalnya https://api.openai.com/v1. URL lengkap untuk Chat Completions biasanya menambahkan /chat/completions. Periksa implementasi ForgeOS sebelum mengisi kolom Endpoint URL: jika backend otomatis menambahkan /chat/completions, masukkan Base URL saja. Jika backend menggunakan URL yang dimasukkan secara langsung, masukkan URL lengkap sesuai kebutuhan. Jangan menambahkan path yang sama dua kali.",
            },
            {
                title: "4. Buat API key jika diperlukan",
                description:
                    "Ikuti petunjuk resmi provider untuk memperoleh API key. OpenAI: https://platform.openai.com/api-keys. NVIDIA NIM: https://build.nvidia.com/models. Provider lain memiliki halaman kredensial masing-masing. Ollama lokal biasanya tidak memerlukan API key pada endpoint lokal standar, tetapi kebutuhan autentikasi dapat berbeda jika menggunakan proxy atau server yang dikelola pihak lain.",
            },
            {
                title: "5. Isi Pengaturan AI ForgeOS",
                description:
                    "Buka Pengaturan AI, lalu masukkan nama provider atau mode Custom jika tersedia, Endpoint URL, model ID, dan API key sesuai kebutuhan. Gunakan nama model persis seperti yang diberikan provider. Pastikan endpoint dan model mendukung format request yang digunakan backend ForgeOS.",
            },
            {
                title: "6. Simpan dan uji konfigurasi",
                description:
                    "Simpan pengaturan, kembali ke Dashboard, lalu coba buat rencana proyek sederhana. Jika berhasil, periksa nama proyek, deskripsi, daftar tugas, prioritas, dan target hari sebelum menyimpannya sebagai proyek.",
            },
            {
                title: "7. Atasi masalah konfigurasi",
                description:
                    "Jika terjadi error, periksa Base URL atau URL lengkap, model ID, API key, kuota, batas penggunaan, dan status layanan. Perhatikan apakah provider mendukung endpoint Chat Completions yang digunakan ForgeOS. Untuk Ollama, pastikan server dapat dijangkau dari lingkungan tempat backend ForgeOS berjalan. Jangan membagikan API key dalam pesan error atau tangkapan layar.",
            },
        ],
    },

];

export default function HelpPage() {
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<string | null>("overview");

    const normalizedQuery = query.trim().toLowerCase();

    const filteredSections = helpSections
        .map((section) => ({
            ...section,
            items: section.items.filter(
                (item) =>
                    !normalizedQuery ||
                    section.title.toLowerCase().includes(normalizedQuery) ||
                    section.description.toLowerCase().includes(normalizedQuery) ||
                    item.title.toLowerCase().includes(normalizedQuery) ||
                    item.description.toLowerCase().includes(normalizedQuery)
            ),
        }))
        .filter(
            (section) =>
                !normalizedQuery ||
                section.items.length > 0 ||
                section.title.toLowerCase().includes(normalizedQuery) ||
                section.description.toLowerCase().includes(normalizedQuery)
        );

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                    >
                        <span aria-hidden="true">←</span>
                        Kembali ke Dashboard
                    </Link>

                    <Link
                        href="/settings/ai"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-400/15"
                    >
                        Pengaturan AI
                        <span aria-hidden="true">↗</span>
                    </Link>
                </header>

                <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-slate-900 to-indigo-500/10 p-6 sm:p-9">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                        <span aria-hidden="true">✦</span>
                        Pusat Bantuan ForgeOS
                    </div>

                    <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                        Bagaimana kami bisa membantu?
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                        Pelajari fitur ForgeOS, mulai proyek pertamamu,
                        dan ikuti panduan untuk menghubungkan AI ke aplikasi.
                    </p>

                    <label
                        htmlFor="help-search"
                        className="mt-7 block text-sm font-medium text-slate-200"
                    >
                        Cari panduan
                    </label>

                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 focus-within:border-violet-400/50">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 shrink-0 text-slate-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path
                                strokeLinecap="round"
                                d="m16 16 4 4"
                            />
                        </svg>

                        <input
                            id="help-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cari API key, model, proyek, error..."
                            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        />
                    </div>
                </section>

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    <Link
                        href="#overview"
                        onClick={() => setExpanded("overview")}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/30 hover:bg-white/[0.05]"
                    >
                        <span className="text-2xl" aria-hidden="true">◈</span>
                        <h2 className="mt-3 font-semibold">Kenali ForgeOS</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Pelajari fungsi dashboard, proyek, dan tugas.
                        </p>
                    </Link>

                    <Link
                        href="#ai-setup"
                        onClick={() => setExpanded("ai-setup")}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/30 hover:bg-white/[0.05]"
                    >
                        <span className="text-2xl" aria-hidden="true">✦</span>
                        <h2 className="mt-3 font-semibold">Setup AI</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Siapkan provider, API key, endpoint, dan model.
                        </p>
                    </Link>

                    <Link
                        href="#troubleshooting"
                        onClick={() => setExpanded("troubleshooting")}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/30 hover:bg-white/[0.05]"
                    >
                        <span className="text-2xl" aria-hidden="true">⚙</span>
                        <h2 className="mt-3 font-semibold">Pemecahan masalah</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Temukan solusi untuk error AI dan penyimpanan.
                        </p>
                    </Link>
                </section>

                <section className="mt-10">
                    <div className="mb-5">
                        <h2 className="text-xl font-bold">
                            Panduan dan pertanyaan umum
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Pilih bagian untuk melihat petunjuk lengkap.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {filteredSections.map((section) => (
                            <article
                                key={section.id}
                                id={section.id}
                                className="scroll-mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpanded(
                                            expanded === section.id
                                                ? null
                                                : section.id
                                        )
                                    }
                                    aria-expanded={expanded === section.id}
                                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.025] sm:p-6"
                                >
                                    <span>
                                        <span className="block font-semibold text-white">
                                            {section.title}
                                        </span>
                                        <span className="mt-1 block text-sm leading-6 text-slate-400">
                                            {section.description}
                                        </span>
                                    </span>

                                    <span
                                        className={`shrink-0 text-xl text-violet-300 transition-transform ${expanded === section.id
                                            ? "rotate-180"
                                            : ""
                                            }`}
                                        aria-hidden="true"
                                    >
                                        ⌄
                                    </span>
                                </button>

                                {expanded === section.id && (
                                    <div className="space-y-3 border-t border-white/10 p-4 sm:p-6">
                                        {section.items.map((item, index) => (
                                            <div
                                                key={item.title}
                                                className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-xs font-semibold text-violet-300">
                                                        {index + 1}
                                                    </span>

                                                    <div>
                                                        <h3 className="font-medium text-white">
                                                            {item.title}
                                                        </h3>
                                                        <p className="mt-2 text-sm leading-7 text-slate-400">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}

                        {filteredSections.length === 0 && (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                                <h3 className="font-semibold text-white">
                                    Panduan belum ditemukan
                                </h3>
                                <p className="mt-2 text-sm text-slate-400">
                                    Coba kata kunci lain, seperti AI, model,
                                    API key, proyek, atau error.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
                    ForgeOS Help Center · Panduan penggunaan dan konfigurasi AI
                </footer>
            </div>
        </main>
    );
}
