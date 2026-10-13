"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

type PromptCategory = "brand_direct" | "category_discovery" | "head_to_head";

type Prompt = {
    id: string;
    text: string;
    category: PromptCategory;
    isCustom?: boolean;
};

type RawGeneratedPrompt = {
    text: string;
    category: PromptCategory;
};

const CATEGORY_NAMES: Record<PromptCategory, string> = {
    brand_direct: "Прямые запросы (Brand Direct)",
    category_discovery: "Категорийные запросы (Category Discovery)",
    head_to_head: "Сравнение (Head-to-Head)",
};

export default function PromptsEditorPage() {
    const router = useRouter();

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
                ...p,
                id: `gen-${i}`,
                isCustom: false,
            }));

            queueMicrotask(() => {
                setPrompts(parsedPrompts);
            });
        } catch {
            router.push("/projects/new");
        }
    }, [router]);

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

    const handleConfirm = async () => {
        const rawProject = sessionStorage.getItem("pendingProject");
        if (!rawProject) return;

        try {
            setSaving(true);
            setError(null);

            const response = await fetch("/api/create_project", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectData: JSON.parse(rawProject),
                    prompts: prompts.map(({ text, category }) => ({
                        text,
                        category,
                    })),
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

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
            <h1 className="text-3xl font-bold mb-2 text-slate-100">
                Промпты проекта
            </h1>
            <p className="text-slate-400 mb-8">
                Проверьте сгенерированные запросы. Вы можете отредактировать их
                и добавить до 5 своих.
            </p>

            {error && (
                <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-lg">
                    {error}
                </div>
            )}

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
                                            expanded[cat] && "rotate-180",
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
                                                            value={editValue}
                                                            onChange={(e) =>
                                                                setEditValue(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            onKeyDown={(e) =>
                                                                e.key ===
                                                                    "Enter" &&
                                                                saveEdit(p.id)
                                                            }
                                                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                saveEdit(p.id)
                                                            }
                                                            className="text-sm text-blue-400 hover:text-blue-300"
                                                        >
                                                            Сохранить
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex-1 text-sm text-slate-300 leading-relaxed">
                                                            {p.isCustom && (
                                                                <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded mr-2">
                                                                    Кастомный
                                                                </span>
                                                            )}
                                                            {p.text}
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                handleEditClick(
                                                                    p,
                                                                )
                                                            }
                                                            className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <svg
                                                                className="w-4 h-4"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
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
                                                        {p.isCustom && (
                                                            <button
                                                                onClick={() =>
                                                                    removePrompt(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
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
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {catPrompts.length === 0 && (
                                            <div className="text-sm text-slate-500 text-center py-2">
                                                Нет промптов
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    },
                )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-10">
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
                        placeholder={
                            customCount >= 5
                                ? "Лимит достигнут"
                                : "Введите текст запроса..."
                        }
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <button
                        onClick={handleAddCustom}
                        disabled={customCount >= 5 || !newText.trim()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Добавить
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleConfirm}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? "Сохранение..." : "Завершить создание"}
                </button>
            </div>

            {showWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-100 mb-2">
                            Осторожно
                        </h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Редактирование сгенерированных промптов может
                            нарушить логику работы AI при анализе отчета.
                            Изменяйте базовые запросы только если уверены в
                            формулировке.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                            >
                                Отмена
                            </button>
                            <button
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
