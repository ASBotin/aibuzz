"use client";

import { useState, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/cn";

type PromptCategory = "brand_direct" | "main" | "head_to_head";

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
    isCustom?: boolean;
    is_custom?: boolean;
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

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_COMPETITORS = 10;
const MAX_PROMPTS = 25;

const CATEGORY_NAMES: Record<PromptCategory, string> = {
    main: "Основные запросы",
    brand_direct: "Прямые запросы",
    head_to_head: "Сравнение с конкурентами",
};

const CATEGORY_DESCRIPTIONS: Record<PromptCategory, string> = {
    main: "исследует запросы целевой аудитории без упоминания бренда. Показывает, как часто и в каких контекстах пользователи будут видеть ваш бренд в выдаче.",
    brand_direct:
        "анализирует выдачу нейросети при прямом упоминании бренда в запросе. Показывает, как нейросеть воспринимает ваш бренд и его позиционирование.",
    head_to_head:
        "анализирует выдачу нейросети при прямом сравнении вашего бренда с конкурентами. Показывает, как нейросеть воспринимает ваш бренд в сравнении с конкурентами.",
};

const CATEGORY_ORDER: PromptCategory[] = [
    "main",
    "brand_direct",
    "head_to_head",
];

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
        main: false,
        brand_direct: false,
        head_to_head: false,
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showWarning, setShowWarning] = useState(false);
    const [warningAccepted, setWarningAccepted] = useState(false);
    const [pendingEditId, setPendingEditId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const [newText, setNewText] = useState("");
    const [newCat, setNewCat] = useState<PromptCategory>("main");

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
                if (!res.ok) {
                    throw new Error("Не удалось загрузить данные проекта");
                }

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
                    // The API can mark previously saved custom prompts with isCustom.
                    isCustom: p.isCustom ?? p.is_custom ?? false,
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
        if (name === "description" && value.length > MAX_DESCRIPTION_LENGTH) {
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddCompetitor = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter" && e.key !== ",") return;

        e.preventDefault();
        const value = competitorInput.trim().replace(/,$/, "");
        if (
            value &&
            !competitors.includes(value) &&
            competitors.length < MAX_COMPETITORS
        ) {
            setCompetitors((prev) => [...prev, value]);
        }
        setCompetitorInput("");
    };

    const removeCompetitor = (competitorToRemove: string) => {
        setCompetitors((prev) => prev.filter((c) => c !== competitorToRemove));
    };

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
        setShowWarning(false);

        if (pendingDeleteId) {
            removePrompt(pendingDeleteId);
            setPendingDeleteId(null);
            return;
        }

        setWarningAccepted(true);
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
        if (!newText.trim() || prompts.length >= MAX_PROMPTS) return;

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
        if (editingId === id) setEditingId(null);
    };

    const handleDeleteClick = (p: Prompt) => {
        if (p.isCustom) {
            removePrompt(p.id);
            return;
        }

        // Deleting generated prompts always requires explicit confirmation.
        setPendingDeleteId(p.id);
        setPendingEditId(null);
        setShowWarning(true);
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

            {activeTab === "general" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="brandName-input"
                                className="text-sm font-medium text-content-secondary"
                            >
                                Название бренда/компании*
                            </label>
                            <input
                                id="brandName-input"
                                type="text"
                                name="brandName"
                                value={formData.brandName}
                                onChange={handleInputChange}
                                placeholder="Название вашего бренда"
                                required
                                aria-required="true"
                                className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="niche-input"
                                className="text-sm font-medium text-content-secondary"
                            >
                                Сфера деятельности*
                            </label>
                            <input
                                id="niche-input"
                                type="text"
                                name="niche"
                                value={formData.niche}
                                onChange={handleInputChange}
                                placeholder="Например, онлайн-образование"
                                required
                                aria-required="true"
                                className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-3">
                            <label
                                htmlFor="competitor-input"
                                className="text-sm font-medium text-content-secondary"
                            >
                                Конкуренты
                            </label>
                            <span className="text-xs text-content-light">
                                {competitors.length} / {MAX_COMPETITORS}
                            </span>
                        </div>
                        <div
                            className="flex flex-wrap items-center gap-2 w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2 min-h-[48px] focus-within:border-accent-2 focus-within:ring-1 focus-within:ring-accent-2 transition-colors cursor-text"
                            onClick={() =>
                                document
                                    .getElementById("competitor-input")
                                    ?.focus()
                            }
                        >
                            {competitors.map((competitor) => (
                                <span
                                    key={competitor}
                                    className="flex items-center gap-1.5 bg-surface-1 text-content-primary px-3 py-1 rounded-full text-sm select-none border border-content-light/20"
                                >
                                    {competitor}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCompetitor(competitor);
                                        }}
                                        aria-label={`Удалить конкурента ${competitor}`}
                                        className="text-content-light hover:text-content-secondary focus:outline-none cursor-pointer"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <line
                                                x1="18"
                                                y1="6"
                                                x2="6"
                                                y2="18"
                                            />
                                            <line
                                                x1="6"
                                                y1="6"
                                                x2="18"
                                                y2="18"
                                            />
                                        </svg>
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
                                disabled={competitors.length >= MAX_COMPETITORS}
                                placeholder={
                                    competitors.length === 0
                                        ? "Перечислите основных конкурентов"
                                        : competitors.length >= MAX_COMPETITORS
                                          ? "Лимит достигнут"
                                          : ""
                                }
                                aria-label="Добавить конкурента"
                                className="flex-1 min-w-[200px] bg-transparent outline-none text-content-primary placeholder:text-content-light disabled:cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-content-secondary mt-1 select-none">
                            {competitors.length >= MAX_COMPETITORS
                                ? `Достигнут лимит: ${MAX_COMPETITORS} конкурентов.`
                                : "Нажмите Enter или запятую, чтобы добавить конкурента"}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="country-input"
                                className="text-sm font-medium text-content-secondary"
                            >
                                Страна
                            </label>
                            <input
                                id="country-input"
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                placeholder="Например, Россия"
                                className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="city-input"
                                className="text-sm font-medium text-content-secondary"
                            >
                                Город
                            </label>
                            <input
                                id="city-input"
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                placeholder="Например, Москва"
                                className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-3">
                            <label
                                htmlFor="description-input"
                                className="text-sm font-medium text-content-secondary"
                            >
                                Краткое описание
                            </label>
                            <span className="text-xs text-content-light tabular-nums">
                                Ещё{" "}
                                {MAX_DESCRIPTION_LENGTH -
                                    formData.description.length}
                            </span>
                        </div>
                        <textarea
                            id="description-input"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            placeholder="Чем занимается компания, ключевые продукты или особенности для более точной генерации промптов..."
                            rows={4}
                            className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-3 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors resize-none h-48"
                        />
                    </div>
                </div>
            )}

            {activeTab === "prompts" && (
                <div className="space-y-6">
                    <div className="space-y-4 mb-8">
                        {CATEGORY_ORDER.map((cat) => {
                            const catPrompts = prompts.filter(
                                (p) => p.category === cat,
                            );
                            if (catPrompts.length === 0 && cat !== newCat) {
                                return null;
                            }

                            return (
                                <div
                                    key={cat}
                                    className="rounded-2xl bg-surface-1 overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleCategory(cat)}
                                        aria-expanded={expanded[cat]}
                                        className="w-full px-4 py-3 flex justify-between items-center bg-surface-3 hover:bg-surface-3 transition-colors cursor-pointer"
                                    >
                                        <span className="font-medium text-content-primary text-sm text-left">
                                            {CATEGORY_NAMES[cat]} (
                                            {catPrompts.length})
                                        </span>
                                        <svg
                                            className={cn(
                                                "w-5 h-5 text-content-secondary transition-transform shrink-0",
                                                expanded[cat] && "rotate-180",
                                            )}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            aria-hidden="true"
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
                                        <div className="p-4 space-y-3">
                                            <p className="text-xs text-content-primary leading-relaxed pb-3 border-b border-surface-3">
                                                <strong className="font-medium">
                                                    {CATEGORY_NAMES[cat]}:
                                                </strong>{" "}
                                                {CATEGORY_DESCRIPTIONS[cat]}
                                            </p>

                                            {catPrompts.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-start gap-3 p-3 bg-surface-2 rounded-xl border border-surface-3 group"
                                                >
                                                    {editingId === p.id ? (
                                                        <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center">
                                                            <input
                                                                type="text"
                                                                value={
                                                                    editValue
                                                                }
                                                                onChange={(e) =>
                                                                    setEditValue(
                                                                        e.target
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
                                                                className="flex-1 min-w-0 bg-surface-2 border border-surface-3 rounded-xl px-3 py-1.5 text-sm text-content-primary outline-none focus:border-accent-2"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    saveEdit(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="self-start text-xs bg-accent-2 hover:bg-accent-2-hover text-white px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer"
                                                            >
                                                                Сохранить
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex-1 min-w-0 text-sm text-content-secondary leading-relaxed">
                                                                {p.isCustom && (
                                                                    <span className="inline-block text-xs bg-accent-2/10 text-accent-2 border border-accent-2/20 px-2 py-0.5 rounded-full mr-2 mb-1 font-medium">
                                                                        Пользовательский
                                                                    </span>
                                                                )}
                                                                {p.text}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleEditClick(
                                                                        p,
                                                                    )
                                                                }
                                                                aria-label="Редактировать промпт"
                                                                title="Редактировать промпт"
                                                                className="text-content-secondary hover:text-content-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer p-1"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={
                                                                            2
                                                                        }
                                                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                                    />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteClick(
                                                                        p,
                                                                    )
                                                                }
                                                                aria-label={
                                                                    p.isCustom
                                                                        ? "Удалить пользовательский промпт"
                                                                        : "Удалить сгенерированный промпт"
                                                                }
                                                                title={
                                                                    p.isCustom
                                                                        ? "Удалить пользовательский промпт"
                                                                        : "Удалить сгенерированный промпт"
                                                                }
                                                                className="text-content-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer p-1"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={
                                                                            2
                                                                        }
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}

                                            {catPrompts.length === 0 && (
                                                <div className="text-sm text-content-secondary text-center py-2">
                                                    Нет промптов
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5 sm:p-6 mb-8 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <h2 className="text-sm font-medium text-content-primary">
                                    Добавить свой запрос
                                </h2>
                                <select
                                    value={newCat}
                                    onChange={(e) =>
                                        setNewCat(
                                            e.target.value as PromptCategory,
                                        )
                                    }
                                    disabled={prompts.length >= MAX_PROMPTS}
                                    aria-label="Категория промпта"
                                    className="bg-surface-2 border border-surface-3 rounded-xl px-3 py-2 text-xs text-content-primary outline-none focus:border-accent-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="category_discovery">
                                        Основные запросы
                                    </option>
                                    <option value="brand_direct">
                                        Прямые запросы
                                    </option>
                                    <option value="head_to_head">
                                        Сравнение с конкурентами
                                    </option>
                                </select>
                            </div>
                            <span className="text-xs text-content-light">
                                {prompts.length} / {MAX_PROMPTS}
                            </span>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                disabled={prompts.length >= MAX_PROMPTS}
                                placeholder={
                                    prompts.length >= MAX_PROMPTS
                                        ? "Лимит 25 промптов достигнут"
                                        : "Введите текст запроса..."
                                }
                                aria-label="Текст нового запроса"
                                className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-xs text-content-primary outline-none focus:border-accent-2 disabled:opacity-50 placeholder:text-content-light"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustom}
                                disabled={
                                    prompts.length >= MAX_PROMPTS ||
                                    !newText.trim()
                                }
                                className="bg-surface-3 hover:bg-surface-3/80 text-content-primary px-6 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Добавить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-content-primary/20 backdrop-blur-xs p-4">
                    <div className="bg-surface-2 border border-surface-3 rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
                        <h3 className="text-base font-bold text-content-primary">
                            Осторожно
                        </h3>
                        <p className="text-content-secondary text-xs leading-relaxed">
                            {pendingDeleteId
                                ? "Удаление сгенерированного промпта может повлиять на полноту и логику анализа. Вы уверены, что хотите удалить этот запрос?"
                                : "Редактирование сгенерированных промптов может нарушить логику работы AI при анализе. Изменяйте базовые запросы только если уверены в формулировке."}
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowWarning(false);
                                    setPendingEditId(null);
                                    setPendingDeleteId(null);
                                }}
                                className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={acceptWarning}
                                className="px-4 py-2 text-xs bg-accent-2 hover:bg-accent-2-hover text-white rounded-xl font-medium transition-colors cursor-pointer"
                            >
                                {pendingDeleteId
                                    ? "Да, удалить"
                                    : "Понятно, продолжить"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
