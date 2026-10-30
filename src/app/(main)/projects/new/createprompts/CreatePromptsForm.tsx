"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GradientButton from "@/components/ui/GradientButton";
import StatusNotice from "@/components/ui/StatusNotice";
import type { GeneratePromptsInput } from "@/service/promptGen";

type PendingProject = GeneratePromptsInput & {
    domain?: string | null;
    keywords?: string[];
    pages?: string[];
};

export default function CreatePromptsForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingProject, setLoadingProject] = useState(true);
    const [projectData, setProjectData] = useState<PendingProject | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const existingProjectId = new URLSearchParams(
            window.location.search,
        ).get("projectId");
        queueMicrotask(() => setProjectId(existingProjectId));

        async function loadProjectData() {
            try {
                if (existingProjectId) {
                    const response = await fetch(
                        `/api/projects/${existingProjectId}/settings-data`,
                    );
                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(
                            result.error || "Не удалось загрузить проект",
                        );
                    }

                    const project = result.project;
                    const data: PendingProject = {
                        brandName: project.name,
                        niche: project.niche,
                        domain: project.domain,
                        country: project.country,
                        city: project.city,
                        description: project.description,
                        competitors: project.competitors ?? [],
                        keywords: project.keywords ?? [],
                        pages: project.pages ?? [],
                    };
                    setProjectData(data);
                    sessionStorage.setItem(
                        "pendingProject",
                        JSON.stringify(data),
                    );
                    return;
                }

                const rawProject = sessionStorage.getItem("pendingProject");
                if (!rawProject) {
                    router.push("/projects/new");
                    return;
                }
                setProjectData(JSON.parse(rawProject) as PendingProject);
            } catch (err: unknown) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Не удалось загрузить данные проекта",
                );
            } finally {
                setLoadingProject(false);
            }
        }

        void loadProjectData();
    }, [router]);

    const handleGenerate = async () => {
        if (!projectData) {
            router.push("/projects/new");
            return;
        }

        try {
            setLoading(true);
            setError(null);

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
            router.push(
                projectId
                    ? `/projects/new/prompts?projectId=${projectId}`
                    : "/projects/new/prompts",
            );
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
                {projectId
                    ? "Генератор создаст новый список запросов на основе настроек проекта. Проверьте его и подтвердите замену текущих промптов."
                    : "Генератор промптов создаст оптимальный список пользовательских запросов для изучения. Затем вы сможете редактировать их и добавлять свои."}
            </p>

            {error && (
                <StatusNotice
                    variant="error"
                    className="mb-6 max-w-md mx-auto text-left"
                >
                    {error}
                </StatusNotice>
            )}

            <GradientButton
                size="lg"
                onClick={handleGenerate}
                disabled={loading || loadingProject || !projectData}
            >
                {loadingProject ? (
                    <span>Загрузка проекта...</span>
                ) : loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span>Генерация...</span>
                    </>
                ) : (
                    projectId ? "Сгенерировать заново" : "Создать"
                )}
            </GradientButton>
        </div>
    );
}
