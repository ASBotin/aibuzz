"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignOutButton() {
    const router = useRouter();
    const [error, setError] = useState(false);

    async function signOut() {
        setError(false);
        const supabase = createSupabaseBrowserClient();
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
            setError(true);
            return;
        }

        router.replace("/projects");
        router.refresh();
    }

    return (
        <div className="px-3 pt-4">
            <button
                type="button"
                onClick={() => void signOut()}
                className="cursor-pointer text-xs text-content-secondary hover:text-content-primary"
            >
                Выйти
            </button>
            {error && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                    Не удалось завершить сеанс. Попробуйте ещё раз.
                </p>
            )}
        </div>
    );
}
