"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/projects/PromptEditor";
import {
    MAX_PROMPTS,
    type ProjectPrompt,
    type PromptCategory,
} from "@/features/projects";

type RawGeneratedPrompt = {
    text: string;
    category: PromptCategory;
    isCustom?: boolean;
    is_custom?: boolean;
};

export default function PromptsEditorPage() {
    const router = useRouter();
    const [prompts, setPrompts] = useState<ProjectPrompt[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const rawPrompts = sessionStorage.getItem("generatedPrompts");
        if (!rawPrompts) {
            router.push("/projects/new");
            return;
        }

        try {
            const parsedData: RawGeneratedPrompt[] = JSON.parse(rawPrompts);
            const parsedPrompts: ProjectPrompt[] = parsedData.map(
                (prompt, index) => ({
                    text: prompt.text,
                    category: prompt.category,
                    id: `gen-${index}`,
                    isCustom:
                        prompt.isCustom ?? prompt.is_custom ?? false,
                }),
            );

            queueMicrotask(() => {
                setPrompts(parsedPrompts);
                if (parsedPrompts.length > MAX_PROMPTS) {
                    setError(
                        `Сгенерировано ${parsedPrompts.length} промптов. Лимит проекта — ${MAX_PROMPTS}; удалите лишние запросы перед продолжением.`,
                    );
                }
            });
        } catch {
            router.push("/projects/new");
        }
    }, [router]);

    const handleConfirm = async () => {
        const rawProject = sessionStorage.getItem("pendingProject");
        if (!rawProject) {
            setError(
                "Не удалось найти данные проекта. Вернитесь к созданию проекта и попробуйте снова.",
            );
            return;
        }

        if (prompts.length > MAX_PROMPTS) {
            setError(`В проекте может быть не более ${MAX_PROMPTS} промптов.`);
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const response = await fetch("/api/create_project", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectData: JSON.parse(rawProject),
                    prompts: prompts.map(({ text, category, isCustom }) => ({
                        text,
                        category,
                        is_custom: Boolean(isCustom),
                    })),
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Ошибка сохранения");
            }

            sessionStorage.removeItem("pendingProject");
            sessionStorage.removeItem("generatedPrompts");
            router.push(`/projects/${result.projectId}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-2 text-content-primary">
                Промпты проекта
            </h1>

            <div className="text-content-primary text-sm mb-8 space-y-3 leading-relaxed">
                <p>
                    Проверьте сгенерированные запросы, при необходимости
                    отредактируйте их и добавьте свои. В проекте может быть не
                    более {MAX_PROMPTS} промптов. Вы также сможете изменить их
                    позже в настройках проекта.
                </p>
                <p className="text-content-secondary text-xs">
                    Всего промптов: {prompts.length} / {MAX_PROMPTS}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-2xl text-sm">
                    {error}
                </div>
            )}

            <PromptEditor prompts={prompts} onChange={setPrompts} />

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={saving}
                    className="px-10 py-3 rounded-full font-medium transition-colors bg-accent-2 hover:bg-accent-2-hover text-white cursor-pointer shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? "Сохранение..." : "Завершить создание"}
                </button>
            </div>
        </div>
    );
}
