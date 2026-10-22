"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GradientButton from "@/components/ui/GradientButton";

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

            <GradientButton
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span>Генерация...</span>
                    </>
                ) : (
                    "Создать"
                )}
            </GradientButton>
        </div>
    );
}
