
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const supabase = createClient();

            if (mode === "signup") {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) throw error;

                setMessage(
                    data.session
                        ? "Registrasi berhasil. Kamu sudah login."
                        : "Registrasi berhasil. Periksa email untuk verifikasi."
                );

                if (data.session) {
                    router.replace("/");
                    router.refresh();
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                router.replace("/");
                router.refresh();
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan autentikasi."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-8"
            >
                <h1 className="text-3xl font-bold">ForgeOS</h1>
                <p className="text-sm text-slate-400">
                    {mode === "login"
                        ? "Masuk ke akunmu."
                        : "Buat akun ForgeOS."}
                </p>

                <label className="block space-y-2">
                    <span className="text-sm">Email</span>
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-950 p-3"
                    />
                </label>

                <label className="block space-y-2">
                    <span className="text-sm">Password</span>
                    <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete={
                            mode === "login" ? "current-password" : "new-password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-950 p-3"
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-violet-600 p-3 font-semibold disabled:opacity-50"
                >
                    {loading
                        ? "Memproses..."
                        : mode === "login"
                            ? "Masuk"
                            : "Daftar"}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setMode(mode === "login" ? "signup" : "login");
                        setMessage("");
                    }}
                    className="w-full text-sm text-violet-300"
                >
                    {mode === "login"
                        ? "Belum punya akun? Daftar"
                        : "Sudah punya akun? Masuk"}
                </button>

                {message && (
                    <p role="status" className="break-words text-sm text-slate-300">
                        {message}
                    </p>
                )}
            </form>
        </main>
    );
}
