"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccentButton from "@/components/ui/AccentButton";
import StatusNotice from "@/components/ui/StatusNotice";
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
    const [existingProjectId, setExistingProjectId] = useState<string | null>(
        null,
    );

    useEffect(() => {
        const projectId = new URLSearchParams(window.location.search).get(
            "projectId",
        );
        queueMicrotask(() => setExistingProjectId(projectId));

        const rawPrompts = sessionStorage.getItem("generatedPrompts");
        if (!rawPrompts) {
            router.push(
                projectId
                    ? `/projects/${projectId}/settings`
                    : "/projects/new",
            );
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
            router.push(
                projectId
                    ? `/projects/${projectId}/settings`
                    : "/projects/new",
            );
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
            const projectData = JSON.parse(rawProject);
            const promptsPayload = prompts.map(
                ({ text, category, isCustom }) => ({
                    text,
                    category,
                    is_custom: Boolean(isCustom),
                }),
            );

            const response = await fetch(
                existingProjectId
                    ? `/api/projects/${existingProjectId}/settings`
                    : "/api/create_project",
                {
                    method: existingProjectId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        existingProjectId
                            ? {
                                  projectData: {
                                      brandName: projectData.brandName,
                                      domain: projectData.domain,
                                      niche: projectData.niche,
                                      country: projectData.country,
                                      city: projectData.city,
                                      description: projectData.description,
                                  },
                                  competitors: projectData.competitors ?? [],
                                  keywords: projectData.keywords ?? [],
                                  pages: projectData.pages ?? [],
                                  prompts: promptsPayload,
                              }
                            : {
                                  projectData,
                                  prompts: promptsPayload,
                              },
                    ),
                },
            );

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Ошибка сохранения");
            }

            sessionStorage.removeItem("pendingProject");
            sessionStorage.removeItem("generatedPrompts");
            router.push(
                existingProjectId
                    ? `/projects/${existingProjectId}/settings`
                    : `/projects/${result.projectId}`,
            );
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
                    {existingProjectId
                        ? "Проверьте новый список запросов и при необходимости отредактируйте его. После сохранения он заменит текущие промпты проекта."
                        : "Проверьте сгенерированные запросы, при необходимости отредактируйте их и добавьте свои. Вы также сможете изменить их позже в настройках проекта."}{" "}
                    В проекте может быть не более {MAX_PROMPTS} промптов.
                </p>
                <p className="text-content-secondary text-xs">
                    Всего промптов: {prompts.length} / {MAX_PROMPTS}
                </p>
            </div>

            {error && (
                <StatusNotice variant="error" className="mb-6">
                    {error}
                </StatusNotice>
            )}

            <PromptEditor prompts={prompts} onChange={setPrompts} />

            <div className="flex justify-end">
                <AccentButton
                    size="lg"
                    onClick={handleConfirm}
                    disabled={saving}
                >
                    {saving
                        ? "Сохранение..."
                        : existingProjectId
                          ? "Заменить промпты"
                          : "Завершить создание"}
                </AccentButton>
            </div>
        </div>
    );
}
