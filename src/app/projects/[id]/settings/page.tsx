"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProjectDetailsForm from "@/components/projects/ProjectDetailsForm";
import PromptEditor from "@/components/projects/PromptEditor";
import {
    createEmptyProjectFormData,
    MAX_COMPETITORS,
    MAX_DESCRIPTION_LENGTH,
    MAX_PROMPTS,
    type ProjectFormData,
    type ProjectPrompt,
    type PromptCategory,
} from "@/features/projects";
import { cn } from "@/utils/cn";

type ProjectSettingsResponse = {
    project: {
        name?: string;
        niche?: string;
        country?: string;
        city?: string;
        description?: string;
        competitors?: string[];
    };
    prompts: {
        id: string;
        text: string;
        category: PromptCategory;
        isCustom?: boolean;
        is_custom?: boolean;
    }[];
};

export default function ProjectSettingsPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [activeTab, setActiveTab] = useState<"general" | "prompts">(
        "general",
    );
    const [formData, setFormData] = useState<ProjectFormData>(
        createEmptyProjectFormData,
    );
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [prompts, setPrompts] = useState<ProjectPrompt[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(
                    `/api/projects/${projectId}/settings-data`,
                );
                if (!response.ok) {
                    throw new Error("Не удалось загрузить данные проекта");
                }

                const data: ProjectSettingsResponse = await response.json();
                setFormData({
                    brandName: data.project.name || "",
                    niche: data.project.niche || "",
                    country: data.project.country || "",
                    city: data.project.city || "",
                    description: data.project.description || "",
                });
                setCompetitors(data.project.competitors || []);
                setPrompts(
                    data.prompts.map((prompt) => ({
                        id: prompt.id,
                        text: prompt.text,
                        category: prompt.category,
                        isCustom:
                            prompt.isCustom ?? prompt.is_custom ?? false,
                    })),
                );
            } catch (err: unknown) {
                setError(
                    err instanceof Error ? err.message : "Ошибка загрузки",
                );
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [projectId]);

    const handleInputChange = (field: keyof ProjectFormData, value: string) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
    };

    const handleSaveAll = async () => {
        setError(null);
        setSuccessMsg(null);

        if (!formData.brandName.trim() || !formData.niche.trim()) {
            setActiveTab("general");
            setError(
                "Заполните обязательные поля: название бренда/компании и сферу деятельности.",
            );
            return;
        }

        if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
            setActiveTab("general");
            setError(
                `Описание не должно превышать ${MAX_DESCRIPTION_LENGTH} символов.`,
            );
            return;
        }

        if (competitors.length > MAX_COMPETITORS) {
            setActiveTab("general");
            setError(
                `Можно указать не более ${MAX_COMPETITORS} конкурентов. Удалите лишних, чтобы сохранить настройки.`,
            );
            return;
        }

        if (prompts.length > MAX_PROMPTS) {
            setActiveTab("prompts");
            setError(`В проекте может быть не более ${MAX_PROMPTS} промптов.`);
            return;
        }

        try {
            setSaving(true);
            const response = await fetch(
                `/api/projects/${projectId}/settings`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectData: formData,
                        competitors,
                        prompts: prompts.map(
                            ({ text, category, isCustom }) => ({
                                text,
                                category,
                                is_custom: Boolean(isCustom),
                            }),
                        ),
                    }),
                },
            );

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Ошибка сохранения");
            }

            setSuccessMsg("Настройки успешно сохранены!");
            window.setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center text-content-secondary">
                Загрузка настроек...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="mb-6">
                <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-content-secondary hover:text-content-primary transition-colors inline-flex items-center gap-1.5"
                >
                    ← К проекту
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold text-content-primary">
                    Настройки проекта
                </h1>
                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="px-6 py-3 rounded-full font-medium transition-colors bg-accent-2 hover:bg-accent-2-hover text-white cursor-pointer shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? "Сохранение..." : "Сохранить изменения"}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-2xl text-sm">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-200 rounded-2xl text-sm">
                    {successMsg}
                </div>
            )}

            <div
                className="flex border-b border-surface-3 mb-8"
                role="tablist"
                aria-label="Разделы настроек проекта"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "general"}
                    onClick={() => setActiveTab("general")}
                    className={cn(
                        "pb-3 px-4 sm:px-6 text-sm font-medium transition-colors border-b-2 cursor-pointer",
                        activeTab === "general"
                            ? "border-accent-2 text-accent-2"
                            : "border-transparent text-content-secondary hover:text-content-primary",
                    )}
                >
                    Общие данные
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "prompts"}
                    onClick={() => setActiveTab("prompts")}
                    className={cn(
                        "pb-3 px-4 sm:px-6 text-sm font-medium transition-colors border-b-2 cursor-pointer",
                        activeTab === "prompts"
                            ? "border-accent-2 text-accent-2"
                            : "border-transparent text-content-secondary hover:text-content-primary",
                    )}
                >
                    Промпты ({prompts.length})
                </button>
            </div>

            <div hidden={activeTab !== "general"}>
                <ProjectDetailsForm
                    value={formData}
                    competitors={competitors}
                    onChange={handleInputChange}
                    onCompetitorsChange={setCompetitors}
                />
            </div>

            <div hidden={activeTab !== "prompts"}>
                <PromptEditor prompts={prompts} onChange={setPrompts} />
            </div>
        </div>
    );
}
