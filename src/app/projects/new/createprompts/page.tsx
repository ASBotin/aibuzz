"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

export default function CreatePromptsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionStorage.getItem("pendingProject")) {
            router.push("/projects/new");
        }
    }, [router]);

    const handleGenerate = async () => {
        const rawData = sessionStorage.getItem("pendingProject");
        if (!rawData) {
            router.push("/projects/new");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const projectData = JSON.parse(rawData);

            const response = await fetch("/api/generate_prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(projectData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Ошибка при генерации промптов",
                );
            }

            sessionStorage.setItem(
                "generatedPrompts",
                JSON.stringify(result.prompts),
            );
            router.push("/projects/new/prompts");
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : "Неизвестная ошибка";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-20 px-4 text-center select-none">
            <h1 className="text-3xl font-bold mb-4 text-content-primary">
                Генерация промптов
            </h1>

            <p className="text-content-secondary mb-8 max-w-lg mx-auto leading-relaxed">
                Генератор промптов создаст оптимальный список пользовательских
                запросов для изучения. Затем вы сможете редактировать их и
                добавлять свои.
            </p>

            {error && (
                <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-sm max-w-md mx-auto">
                    {error}
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={loading}
                className={cn(
                    "px-10 py-4 rounded-full text-sm font-medium inline-flex items-center gap-2 cursor-pointer",
                    loading
                        ? "bg-surface-1 text-content-secondary cursor-not-allowed"
                        : "bg-linear-to-r from-accent-1 via-accent-2 to-accent-3 text-white hover:shadow-lg hover:shadow-accent-2/25 hover:-translate-y-0.5 transition-all",
                )}
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span>Генерация...</span>
                    </>
                ) : (
                    "Создать"
                )}
            </button>
        </div>
    );
}
