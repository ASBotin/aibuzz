"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AccentButton from "@/components/ui/AccentButton";
import StatusNotice from "@/components/ui/StatusNotice";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignInForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const supabase = createSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: String(formData.get("email") ?? "").trim(),
            password: String(formData.get("password") ?? ""),
        });

        if (signInError) {
            setError("Не удалось войти. Проверьте email и пароль.");
            setLoading(false);
            return;
        }

        router.replace("/projects");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && <StatusNotice variant="error">{error}</StatusNotice>}
            <div className="space-y-2">
                <label
                    htmlFor="email"
                    className="text-sm font-medium text-content-secondary"
                >
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    className="w-full rounded-2xl border border-content-light bg-surface-2 px-4 py-3 text-content-primary"
                />
            </div>
            <div className="space-y-2">
                <label
                    htmlFor="password"
                    className="text-sm font-medium text-content-secondary"
                >
                    Пароль
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-content-light bg-surface-2 px-4 py-3 text-content-primary"
                />
            </div>
            <AccentButton type="submit" size="lg" disabled={loading}>
                {loading ? "Входим..." : "Войти"}
            </AccentButton>
        </form>
    );
}
