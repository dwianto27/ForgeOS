
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AISettings = {
    providerName: string;
    endpointUrl: string;
    model: string;
    apiKey: string;
    updatedAt?: string;
    hasApiKey: boolean;
};

export default function AISettingsPage() {
    const [providerName, setProviderName] = useState("Custom");
    const [endpointUrl, setEndpointUrl] = useState("");
    const [model, setModel] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [hasApiKey, setHasApiKey] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadSettings() {
            try {
                const response = await fetch("/api/ai-settings", {
                    cache: "no-store",
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Gagal memuat konfigurasi AI."
                    );
                }

                if (!active) return;

                const settings = result.settings as AISettings | null;

                if (settings) {
                    setProviderName(settings.providerName);
                    setEndpointUrl(settings.endpointUrl);
                    setModel(settings.model);
                    setApiKey(settings.apiKey ?? "");
                    setHasApiKey(settings.hasApiKey);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Gagal memuat konfigurasi AI."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadSettings();

        return () => {
            active = false;
        };
    }, []);

    async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setNotice("");
        setError("");

        try {
            const response = await fetch("/api/ai-settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    providerName,
                    endpointUrl,
                    model,
                    apiKey,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Gagal menyimpan konfigurasi AI."
                );
            }


            setHasApiKey(true);
            setNotice("Konfigurasi AI berhasil disimpan.");

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Terjadi kesalahan saat menyimpan konfigurasi."
            );
        } finally {
            setSaving(false);
        }
    }

    const fieldClass =
        "mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10";

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/"
                    className="text-sm text-slate-400 transition hover:text-white"
                >
                    ← Kembali ke Dashboard
                </Link>


                <header className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                        ForgeOS Intelligence
                    </p>

                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                        Custom AI Settings
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        Atur penyedia AI, endpoint Chat Completions, model,
                        dan API key milikmu sendiri.
                    </p>

                    <div className="mt-5">
                        <a
                            href="/help#ai-setup"
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-white"
                        >
                            <span aria-hidden="true">?</span>
                            Pusat Bantuan
                            <span aria-hidden="true">→</span>
                        </a>
                    </div>
                </header>


                <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-7">
                    {loading ? (
                        <p className="text-sm text-slate-400">
                            Memuat konfigurasi...
                        </p>
                    ) : (
                        <form onSubmit={saveSettings} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="providerName"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    Nama penyedia
                                </label>
                                <input
                                    id="providerName"
                                    value={providerName}
                                    onChange={(event) =>
                                        setProviderName(event.target.value)
                                    }
                                    maxLength={100}
                                    required
                                    className={fieldClass}
                                    placeholder="NVIDIA NIM, OpenRouter, atau lainnya"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="endpointUrl"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    Endpoint Chat Completions
                                </label>
                                <input
                                    id="endpointUrl"
                                    type="url"
                                    value={endpointUrl}
                                    onChange={(event) =>
                                        setEndpointUrl(event.target.value)
                                    }
                                    maxLength={2048}
                                    required
                                    className={fieldClass}
                                    placeholder="https://example.com/v1/chat/completions"
                                />
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    Masukkan URL endpoint lengkap, bukan hanya alamat situs.
                                    Gunakan HTTPS untuk layanan eksternal.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="model"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    Model ID
                                </label>
                                <input
                                    id="model"
                                    value={model}
                                    onChange={(event) => setModel(event.target.value)}
                                    maxLength={200}
                                    required
                                    className={fieldClass}
                                    placeholder="Contoh: nama-model-dari-penyedia"
                                />
                            </div>


                            <div>
                                <label
                                    htmlFor="apiKey"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    API key
                                </label>

                                <div className="relative mt-2">
                                    <input
                                        id="apiKey"
                                        type={showApiKey ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={apiKey}
                                        onChange={(event) => setApiKey(event.target.value)}
                                        maxLength={4096}
                                        required={!hasApiKey}
                                        className={`${fieldClass} mt-0 pr-24`}
                                        placeholder={
                                            hasApiKey
                                                ? "API key tersimpan"
                                                : "Tempel API key milikmu di sini"
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey((current) => !current)}
                                        className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 text-xs font-medium text-violet-300 transition hover:bg-white/5 hover:text-violet-200"
                                        aria-label={showApiKey ? "Sembunyikan API key" : "Lihat API key"}
                                    >
                                        {showApiKey ? "Sembunyikan" : "Lihat"}
                                    </button>
                                </div>

                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    API key akan disamarkan secara default. Gunakan tombol Lihat
                                    untuk menampilkan teks yang sedang diinput.
                                </p>
                            </div>


                            {hasApiKey && (
                                <p className="text-sm text-emerald-300">
                                    Konfigurasi tersimpan dan API key sudah tersedia.
                                </p>
                            )}

                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300"
                                >
                                    {error}
                                </p>
                            )}

                            {notice && (
                                <p
                                    role="status"
                                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300"
                                >
                                    {notice}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                            </button>
                        </form>
                    )}

                    {!loading && error && !endpointUrl && (
                        <p className="mt-4 text-xs text-slate-500">
                            Jika sesi login sudah berakhir, login kembali dan buka halaman ini.
                        </p>
                    )}
                </section>
            </div>
        </main>
    );
}
