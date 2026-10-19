"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { cn } from "@/utils/cn";
import AccentButton from "@/components/ui/AccentButton";
import Tag from "@/components/ui/Tag";
import {
    MAX_PROMPTS,
    PROMPT_CATEGORIES,
    type ProjectPrompt,
    type PromptCategory,
} from "@/features/projects";

type PromptEditorProps = {
    prompts: ProjectPrompt[];
    onChange: Dispatch<SetStateAction<ProjectPrompt[]>>;
};

export default function PromptEditor({ prompts, onChange }: PromptEditorProps) {
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
    const [newCategory, setNewCategory] = useState<PromptCategory>("main");

    const removePrompt = (id: string) => {
        onChange((previous) => previous.filter((prompt) => prompt.id !== id));
        if (editingId === id) setEditingId(null);
    };

    const startEditing = (prompt: ProjectPrompt) => {
        setEditingId(prompt.id);
        setEditValue(prompt.text);
    };

    const handleEditClick = (prompt: ProjectPrompt) => {
        if (!warningAccepted && !prompt.isCustom) {
            setPendingEditId(prompt.id);
            setPendingDeleteId(null);
            setShowWarning(true);
            return;
        }
        startEditing(prompt);
    };

    const handleDeleteClick = (prompt: ProjectPrompt) => {
        if (prompt.isCustom) {
            removePrompt(prompt.id);
            return;
        }

        setPendingEditId(null);
        setPendingDeleteId(prompt.id);
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
            const prompt = prompts.find((item) => item.id === pendingEditId);
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

        onChange((previous) =>
            previous.map((prompt) =>
                prompt.id === id ? { ...prompt, text } : prompt,
            ),
        );
        setEditingId(null);
    };

    const addCustomPrompt = () => {
        const text = newText.trim();
        if (!text || prompts.length >= MAX_PROMPTS) return;

        const prompt: ProjectPrompt = {
            id: `custom-${Date.now()}`,
            text,
            category: newCategory,
            isCustom: true,
        };

        onChange((previous) => [...previous, prompt]);
        setNewText("");
        setExpanded((previous) => ({ ...previous, [newCategory]: true }));
    };

    const isAtLimit = prompts.length >= MAX_PROMPTS;

    return (
        <div className="space-y-6">
            <div className="space-y-4 mb-8">
                {PROMPT_CATEGORIES.map((category) => {
                    const categoryPrompts = prompts.filter(
                        (prompt) => prompt.category === category.id,
                    );
                    if (
                        categoryPrompts.length === 0 &&
                        category.id !== newCategory
                    ) {
                        return null;
                    }

                    return (
                        <div
                            key={category.id}
                            className="rounded-2xl bg-surface-1 overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setExpanded((previous) => ({
                                        ...previous,
                                        [category.id]: !previous[category.id],
                                    }))
                                }
                                aria-expanded={expanded[category.id]}
                                className="w-full px-4 py-3 flex justify-between items-center bg-surface-3 hover:bg-surface-3 transition-colors cursor-pointer"
                            >
                                <span className="font-medium text-content-primary text-sm text-left">
                                    {category.name} ({categoryPrompts.length})
                                </span>
                                <svg
                                    className={cn(
                                        "w-5 h-5 text-content-secondary transition-transform shrink-0",
                                        expanded[category.id] && "rotate-180",
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

                            {expanded[category.id] && (
                                <div className="p-4 space-y-3">
                                    <p className="text-xs text-content-primary leading-relaxed pb-3 border-b border-surface-3">
                                        <strong className="font-medium">
                                            {category.name}:
                                        </strong>{" "}
                                        {category.description}
                                    </p>

                                    {categoryPrompts.map((prompt) => (
                                        <div
                                            key={prompt.id}
                                            className="flex items-start gap-3 p-3 bg-surface-2 rounded-xl border border-surface-3 group"
                                        >
                                            {editingId === prompt.id ? (
                                                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(event) =>
                                                            setEditValue(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        onKeyDown={(event) => {
                                                            if (
                                                                event.key ===
                                                                "Enter"
                                                            ) {
                                                                saveEdit(
                                                                    prompt.id,
                                                                );
                                                            }
                                                        }}
                                                        aria-label="Редактировать промпт"
                                                        className="flex-1 min-w-0 bg-surface-2 border border-surface-3 rounded-xl px-3 py-1.5 text-sm text-content-primary outline-none focus:border-accent-2"
                                                    />
                                                    <AccentButton
                                                        size="sm"
                                                        type="button"
                                                        onClick={() =>
                                                            saveEdit(prompt.id)
                                                        }
                                                        disabled={
                                                            !editValue.trim()
                                                        }
                                                        className="self-start px-3 py-1.5"
                                                    >
                                                        Сохранить
                                                    </AccentButton>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1 min-w-0 text-sm text-content-secondary leading-relaxed">
                                                        {prompt.isCustom && (
                                                            <Tag
                                                                tone="accent"
                                                                className="mr-2 mb-1"
                                                            >
                                                                Пользовательский
                                                            </Tag>
                                                        )}
                                                        {prompt.text}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleEditClick(
                                                                prompt,
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
                                                                strokeWidth={2}
                                                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                prompt,
                                                            )
                                                        }
                                                        aria-label={
                                                            prompt.isCustom
                                                                ? "Удалить пользовательский промпт"
                                                                : "Удалить сгенерированный промпт"
                                                        }
                                                        title={
                                                            prompt.isCustom
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
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3M4 7h16"
                                                            />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {categoryPrompts.length === 0 && (
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
                            value={newCategory}
                            onChange={(event) =>
                                setNewCategory(
                                    event.target.value as PromptCategory,
                                )
                            }
                            disabled={isAtLimit}
                            aria-label="Категория промпта"
                            className="bg-surface-2 border border-surface-3 rounded-xl px-3 py-2 text-xs text-content-primary outline-none focus:border-accent-2 disabled:opacity-50 cursor-pointer"
                        >
                            {PROMPT_CATEGORIES.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
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
                        onChange={(event) => setNewText(event.target.value)}
                        disabled={isAtLimit}
                        placeholder={
                            isAtLimit
                                ? `Лимит ${MAX_PROMPTS} промптов достигнут`
                                : "Введите текст запроса..."
                        }
                        aria-label="Текст нового запроса"
                        className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-xs text-content-primary outline-none focus:border-accent-2 disabled:opacity-50 placeholder:text-content-light"
                    />
                    <button
                        type="button"
                        onClick={addCustomPrompt}
                        disabled={isAtLimit || !newText.trim()}
                        className="bg-surface-3 hover:bg-surface-3/80 text-content-primary px-6 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Добавить
                    </button>
                </div>
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
                            <AccentButton
                                size="sm"
                                type="button"
                                onClick={acceptWarning}
                            >
                                {pendingDeleteId
                                    ? "Да, удалить"
                                    : "Понятно, продолжить"}
                            </AccentButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
