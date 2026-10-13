"use client";

import { useState, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/cn";

type PromptCategory = "brand_direct" | "category_discovery" | "head_to_head";

type Prompt = {
    id: string;
    text: string;
    category: PromptCategory;
    isCustom?: boolean;
};

type ApiPrompt = {
    id: string;
    text: string;
    category: PromptCategory;
};

type ProjectSettingsResponse = {
    project: {
        name?: string;
        niche?: string;
        country?: string;
        city?: string;
        description?: string;
        competitors?: string[];
    };
    prompts: ApiPrompt[];
};

const CATEGORY_NAMES: Record<PromptCategory, string> = {
    brand_direct: "Прямые запросы (Brand Direct)",
    category_discovery: "Категорийные запросы (Category Discovery)",
    head_to_head: "Сравнение (Head-to-Head)",
};

export default function ProjectSettingsPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [activeTab, setActiveTab] = useState<"general" | "prompts">(
        "general",
    );

    const [formData, setFormData] = useState({
        brandName: "",
        niche: "",
        country: "",
        city: "",
        description: "",
    });
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [competitorInput, setCompetitorInput] = useState("");

    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [expanded, setExpanded] = useState<Record<PromptCategory, boolean>>({
        brand_direct: false,
        category_discovery: false,
        head_to_head: false,
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showWarning, setShowWarning] = useState(false);
    const [warningAccepted, setWarningAccepted] = useState(false);
    const [pendingEditId, setPendingEditId] = useState<string | null>(null);

    const [newText, setNewText] = useState("");
    const [newCat, setNewCat] = useState<PromptCategory>("category_discovery");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(
                    `/api/projects/${projectId}/settings-data`,
                );
                if (!res.ok)
                    throw new Error("Не удалось загрузить данные проекта");
                const data: ProjectSettingsResponse = await res.json();

                setFormData({
                    brandName: data.project.name || "",
                    niche: data.project.niche || "",
                    country: data.project.country || "",
                    city: data.project.city || "",
                    description: data.project.description || "",
                });
                setCompetitors(data.project.competitors || []);

                const loadedPrompts: Prompt[] = data.prompts.map((p) => ({
                    id: p.id,
                    text: p.text,
                    category: p.category,
                    isCustom: false,
                }));
                setPrompts(loadedPrompts);
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

    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddCompetitor = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const value = competitorInput.trim().replace(/,$/, "");
            if (value && !competitors.includes(value)) {
                setCompetitors([...competitors, value]);
            }
            setCompetitorInput("");
        }
    };

    const removeCompetitor = (competitorToRemove: string) => {
        setCompetitors(competitors.filter((c) => c !== competitorToRemove));
    };

    const customCount = prompts.filter((p) => p.isCustom).length;

    const toggleCategory = (cat: PromptCategory) => {
        setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const handleEditClick = (p: Prompt) => {
        if (!warningAccepted && !p.isCustom) {
            setPendingEditId(p.id);
            setShowWarning(true);
            return;
        }
        startEditing(p);
    };

    const startEditing = (p: Prompt) => {
        setEditingId(p.id);
        setEditValue(p.text);
    };

    const acceptWarning = () => {
        setWarningAccepted(true);
        setShowWarning(false);
        if (pendingEditId) {
            const p = prompts.find((x) => x.id === pendingEditId);
            if (p) startEditing(p);
            setPendingEditId(null);
        }
    };

    const saveEdit = (id: string) => {
        if (!editValue.trim()) return;
        setPrompts((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, text: editValue.trim() } : p,
            ),
        );
        setEditingId(null);
    };

    const handleAddCustom = () => {
        if (!newText.trim() || customCount >= 5) return;
        const newPrompt: Prompt = {
            id: `custom-${Date.now()}`,
            text: newText.trim(),
            category: newCat,
            isCustom: true,
        };
        setPrompts((prev) => [...prev, newPrompt]);
        setNewText("");
        setExpanded((prev) => ({ ...prev, [newCat]: true }));
    };

    const removePrompt = (id: string) => {
        setPrompts((prev) => prev.filter((p) => p.id !== id));
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccessMsg(null);

            const response = await fetch(
                `/api/projects/${projectId}/settings`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectData: formData,
                        competitors,
                        prompts: prompts.map(({ text, category }) => ({
                            text,
                            category,
                        })),
                    }),
                },
            );

            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error || "Ошибка сохранения");

            setSuccessMsg("Настройки успешно сохранены!");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center text-slate-400">
                Загрузка настроек...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="mb-6">
                <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                >
                    ← К проекту
                </Link>
            </div>

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-100">
                    Настройки проекта
                </h1>
                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {saving ? "Сохранение..." : "Сохранить изменения"}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-lg text-sm">
                    {successMsg}
                </div>
            )}

            <div className="flex border-b border-slate-800 mb-8" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "general"}
                    onClick={() => setActiveTab("general")}
                    className={cn(
                        "pb-3 px-6 text-sm font-medium transition-colors border-b-2",
                        activeTab === "general"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-200",
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
                        "pb-3 px-6 text-sm font-medium transition-colors border-b-2",
                        activeTab === "prompts"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-200",
                    )}
                >
                    Промпты ({prompts.length})
                </button>
            </div>

            {activeTab === "general" && (
                <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="brandName-input"
                                className="text-sm font-medium text-slate-300"
                            >
                                Название бренда/компании*
                            </label>
                            <input
                                id="brandName-input"
                                type="text"
                                name="brandName"
                                value={formData.brandName}
                                onChange={handleInputChange}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="niche-input"
                                className="text-sm font-medium text-slate-300"
                            >
                                Сфера деятельности*
                            </label>
                            <input
                                id="niche-input"
                                type="text"
                                name="niche"
                                value={formData.niche}
                                onChange={handleInputChange}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Конкуренты
                        </label>
                        <div
                            className="flex flex-wrap items-center gap-2 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus-within:border-blue-500 transition-colors cursor-text"
                            onClick={() =>
                                document
                                    .getElementById("competitor-input")
                                    ?.focus()
                            }
                        >
                            {competitors.map((competitor) => (
                                <span
                                    key={competitor}
                                    className="flex items-center gap-1.5 bg-slate-800 text-slate-200 px-3 py-1 rounded-full text-sm select-none"
                                >
                                    {competitor}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCompetitor(competitor);
                                        }}
                                        aria-label={`Удалить конкурента ${competitor}`}
                                        className="text-slate-400 hover:text-slate-100 focus:outline-none"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                            <input
                                id="competitor-input"
                                type="text"
                                value={competitorInput}
                                onChange={(e) =>
                                    setCompetitorInput(e.target.value)
                                }
                                onKeyDown={handleAddCompetitor}
                                placeholder={
                                    competitors.length === 0
                                        ? "Введите название и нажмите Enter"
                                        : ""
                                }
                                aria-label="Добавить конкурента"
                                className="flex-1 min-w-[200px] bg-transparent outline-none text-slate-100 placeholder:text-slate-500 text-sm"
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Нажмите Enter или запятую, чтобы добавить конкурента
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="country-input"
                                className="text-sm font-medium text-slate-300"
                            >
                                Страна
                            </label>
                            <input
                                id="country-input"
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="city-input"
                                className="text-sm font-medium text-slate-300"
                            >
                                Город
                            </label>
                            <input
                                id="city-input"
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="description-input"
                            className="text-sm font-medium text-slate-300"
                        >
                            Краткое описание (опционально)
                        </label>
                        <textarea
                            id="description-input"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors resize-y"
                        />
                    </div>
                </div>
            )}

            {activeTab === "prompts" && (
                <div className="space-y-6">
                    <div className="space-y-4 mb-10">
                        {(Object.keys(CATEGORY_NAMES) as PromptCategory[]).map(
                            (cat) => {
                                const catPrompts = prompts.filter(
                                    (p) => p.category === cat,
                                );
                                if (catPrompts.length === 0 && cat !== newCat)
                                    return null;

                                return (
                                    <div
                                        key={cat}
                                        className="border border-slate-800 rounded-lg bg-slate-900 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleCategory(cat)}
                                            className="w-full px-4 py-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="font-medium text-slate-200">
                                                {CATEGORY_NAMES[cat]} (
                                                {catPrompts.length})
                                            </span>
                                            <svg
                                                className={cn(
                                                    "w-5 h-5 text-slate-400 transition-transform",
                                                    expanded[cat] &&
                                                        "rotate-180",
                                                )}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </button>

                                        {expanded[cat] && (
                                            <div className="p-4 space-y-2">
                                                {catPrompts.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className="flex items-start gap-3 p-3 bg-slate-950 rounded border border-slate-800 group"
                                                    >
                                                        {editingId === p.id ? (
                                                            <div className="flex-1 flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editValue
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setEditValue(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        e,
                                                                    ) =>
                                                                        e.key ===
                                                                            "Enter" &&
                                                                        saveEdit(
                                                                            p.id,
                                                                        )
                                                                    }
                                                                    aria-label="Редактировать промпт"
                                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        saveEdit(
                                                                            p.id,
                                                                        )
                                                                    }
                                                                    className="text-sm text-blue-400 hover:text-blue-300"
                                                                >
                                                                    Сохранить
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex-1 text-sm text-slate-300 leading-relaxed">
                                                                    {p.text}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleEditClick(
                                                                            p,
                                                                        )
                                                                    }
                                                                    aria-label="Редактировать"
                                                                    className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    ✎
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removePrompt(
                                                                            p.id,
                                                                        )
                                                                    }
                                                                    aria-label="Удалить"
                                                                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            },
                        )}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-slate-100">
                                Добавить свой запрос
                            </h2>
                            <span className="text-sm text-slate-500">
                                {customCount} / 5
                            </span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <select
                                value={newCat}
                                onChange={(e) =>
                                    setNewCat(e.target.value as PromptCategory)
                                }
                                disabled={customCount >= 5}
                                aria-label="Категория промпта"
                                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 md:w-1/3"
                            >
                                <option value="category_discovery">
                                    Категорийный (Category Discovery)
                                </option>
                                <option value="brand_direct">
                                    Прямой (Brand Direct)
                                </option>
                                <option value="head_to_head">
                                    Сравнение (Head-to-Head)
                                </option>
                            </select>
                            <input
                                type="text"
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                disabled={customCount >= 5}
                                placeholder="Введите текст запроса..."
                                aria-label="Текст нового запроса"
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustom}
                                disabled={customCount >= 5 || !newText.trim()}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Добавить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-100 mb-2">
                            Осторожно
                        </h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Редактирование сгенерированных промптов может
                            нарушить логику работы AI при анализе отчета.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowWarning(false)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={acceptWarning}
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                            >
                                Понятно, продолжить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
