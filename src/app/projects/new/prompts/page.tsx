"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

type PromptCategory = "main" | "brand_direct" | "head_to_head";

type Prompt = {
    id: string;
    text: string;
    category: PromptCategory;
    isCustom: boolean;
};

type RawGeneratedPrompt = {
    text: string;
    category: PromptCategory;
    isCustom?: boolean;
    is_custom?: boolean;
};

const MAX_PROMPTS = 25;

const CATEGORY_NAMES: Record<PromptCategory, string> = {
    main: "Основные запросы",
    brand_direct: "Прямые запросы",
    head_to_head: "Сравнение с конкурентами",
};

const CATEGORY_DESCRIPTIONS: Record<PromptCategory, string> = {
    main: "исследует запросы целевой аудитории без упоминания бренда. Показывает, как часто и в каких контекстах пользователи будут видеть ваш бренд в выдаче.",
    brand_direct:
        "анализ выдачи нейросети при прямом упоминании бренда в запросе. Показывает, как нейросеть воспринимает ваш бренд и его позиционирование.",
    head_to_head:
        "анализ выдачи нейросети при прямом сравнении вашего бренда с конкурентами. Показывает, как нейросеть воспринимает ваш бренд в сравнении с конкурентами.",
};

const CATEGORY_ORDER: PromptCategory[] = [
    "main",
    "brand_direct",
    "head_to_head",
];

export default function PromptsEditorPage() {
    const router = useRouter();

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
            const parsedPrompts: Prompt[] = parsedData.map((p, i) => ({
                text: p.text,
                category: p.category,
                id: `gen-${i}`,
                isCustom: p.isCustom ?? p.is_custom ?? false,
            }));

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

    const toggleCategory = (cat: PromptCategory) => {
        setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const startEditing = (p: Prompt) => {
        setEditingId(p.id);
        setEditValue(p.text);
    };

    const handleEditClick = (p: Prompt) => {
        if (!warningAccepted && !p.isCustom) {
            setPendingEditId(p.id);
            setPendingDeleteId(null);
            setShowWarning(true);
            return;
        }
        startEditing(p);
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

        // Always confirm deletion of a generated prompt.
        setPendingEditId(null);
        setPendingDeleteId(p.id);
        setShowWarning(true);
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
            const prompt = prompts.find((p) => p.id === pendingEditId);
            if (prompt) startEditing(prompt);
            setPendingEditId(null);
        }
    };

    const cancelWarning = () => {
        setShowWarning(false);
        setPendingEditId(null);
        setPendingDeleteId(null);
    };

    const saveEdit = (id: string) => {
        const text = editValue.trim();
        if (!text) return;

        setPrompts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, text } : p)),
        );
        setEditingId(null);
    };

    const handleAddCustom = () => {
        const text = newText.trim();
        if (!text || prompts.length >= MAX_PROMPTS) return;

        const newPrompt: Prompt = {
            id: `custom-${Date.now()}`,
            text,
            category: newCat,
            isCustom: true,
        };

        setPrompts((prev) => [...prev, newPrompt]);
        setNewText("");
        setExpanded((prev) => ({ ...prev, [newCat]: true }));
    };

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
                        // API handler should write this field into prompts.is_custom.
                        is_custom: isCustom,
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

    const isAtLimit = prompts.length >= MAX_PROMPTS;

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

            <div className="space-y-4 mb-8">
                {CATEGORY_ORDER.map((cat) => {
                    const catPrompts = prompts.filter(
                        (p) => p.category === cat,
                    );
                    if (catPrompts.length === 0 && cat !== newCat) return null;

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
                                <span className="font-medium text-content-primary text-sm">
                                    {CATEGORY_NAMES[cat]} ({catPrompts.length})
                                </span>
                                <svg
                                    className={cn(
                                        "w-5 h-5 text-content-secondary transition-transform",
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
                                    <p className="text-xs text-content-primary leading-relaxed pb-1 border-b border-surface-3">
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
                                                <div className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) =>
                                                            setEditValue(
                                                                e.target.value,
                                                            )
                                                        }
                                                        onKeyDown={(e) =>
                                                            e.key === "Enter" &&
                                                            saveEdit(p.id)
                                                        }
                                                        aria-label="Редактировать промпт"
                                                        className="flex-1 min-w-0 bg-surface-2 border border-surface-3 rounded-xl px-3 py-1.5 text-sm text-content-primary outline-none focus:border-accent-2"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            saveEdit(p.id)
                                                        }
                                                        disabled={
                                                            !editValue.trim()
                                                        }
                                                        className="text-xs bg-accent-2 hover:bg-accent-2-hover text-white px-3 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer"
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
                                                            handleEditClick(p)
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
                                                                strokeWidth={2}
                                                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteClick(p)
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
                                                                strokeWidth={2}
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

            <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6 mb-8 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-medium text-content-primary">
                            Добавить свой запрос
                        </h2>
                        <select
                            value={newCat}
                            onChange={(e) =>
                                setNewCat(e.target.value as PromptCategory)
                            }
                            disabled={isAtLimit}
                            aria-label="Категория промпта"
                            className="bg-surface-2 border border-surface-3 rounded-xl px-3 py-2 text-xs text-content-primary outline-none focus:border-accent-2 disabled:opacity-50 cursor-pointer"
                        >
                            <option value="main">Основные запросы</option>
                            <option value="brand_direct">Прямые запросы</option>
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
                        disabled={isAtLimit}
                        placeholder={
                            isAtLimit
                                ? "Лимит 25 промптов достигнут"
                                : "Введите текст запроса..."
                        }
                        aria-label="Текст нового запроса"
                        className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-xs text-content-primary outline-none focus:border-accent-2 disabled:opacity-50 placeholder:text-content-light"
                    />
                    <button
                        type="button"
                        onClick={handleAddCustom}
                        disabled={isAtLimit || !newText.trim()}
                        className="bg-surface-3 hover:bg-surface-3/80 text-content-primary px-6 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Добавить
                    </button>
                </div>
            </div>

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

            {showWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-content-primary/20 backdrop-blur-xs p-4">
                    <div className="bg-surface-2 border border-surface-3 rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
                        <h3 className="text-base font-bold text-content-primary">
                            {pendingDeleteId
                                ? "Удалить сгенерированный промпт?"
                                : "Осторожно"}
                        </h3>
                        <p className="text-content-secondary text-xs leading-relaxed">
                            {pendingDeleteId
                                ? "Удаление сгенерированного промпта может повлиять на полноту и логику анализа. Вы уверены, что хотите удалить этот запрос?"
                                : "Редактирование сгенерированных промптов может нарушить логику работы AI при анализе. Изменяйте базовые запросы только если уверены в формулировке."}
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={cancelWarning}
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
