"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
    MAX_COMPETITORS,
    MAX_DESCRIPTION_LENGTH,
    type ProjectFormData,
} from "@/features/projects";

type ProjectDetailsFormProps = {
    value: ProjectFormData;
    competitors: string[];
    onChange: (field: keyof ProjectFormData, value: string) => void;
    onCompetitorsChange: (competitors: string[]) => void;
};

const inputClassName =
    "w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors";

export default function ProjectDetailsForm({
    value,
    competitors,
    onChange,
    onCompetitorsChange,
}: ProjectDetailsFormProps) {
    const competitorInputRef = useRef<HTMLInputElement>(null);
    const [competitorInput, setCompetitorInput] = useState("");

    const handleAddCompetitor = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter" && event.key !== ",") return;

        event.preventDefault();
        const competitor = competitorInput.trim().replace(/,$/, "");

        if (
            competitor &&
            !competitors.includes(competitor) &&
            competitors.length < MAX_COMPETITORS
        ) {
            onCompetitorsChange([...competitors, competitor]);
        }
        setCompetitorInput("");
    };

    const updateField = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        onChange(
            event.target.name as keyof ProjectFormData,
            event.target.value,
        );
    };

    const removeCompetitor = (competitorToRemove: string) => {
        onCompetitorsChange(
            competitors.filter(
                (competitor) => competitor !== competitorToRemove,
            ),
        );
    };

    return (
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
                        value={value.brandName}
                        onChange={updateField}
                        placeholder="Название вашего бренда"
                        required
                        aria-required="true"
                        className={inputClassName}
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
                        value={value.niche}
                        onChange={updateField}
                        placeholder="Например, онлайн-образование"
                        required
                        aria-required="true"
                        className={inputClassName}
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
                    onClick={() => competitorInputRef.current?.focus()}
                >
                    {competitors.map((competitor) => (
                        <span
                            key={competitor}
                            className="flex items-center gap-1.5 bg-surface-1 text-content-primary px-3 py-1 rounded-full text-sm select-none border border-content-light/20"
                        >
                            {competitor}
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    removeCompetitor(competitor);
                                }}
                                aria-label={`Удалить конкурента ${competitor}`}
                                className="text-content-light hover:text-content-secondary focus:outline-none cursor-pointer"
                            >
                                <svg
                                    aria-hidden="true"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </span>
                    ))}
                    <input
                        ref={competitorInputRef}
                        id="competitor-input"
                        type="text"
                        value={competitorInput}
                        onChange={(event) =>
                            setCompetitorInput(event.target.value)
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
                        value={value.country}
                        onChange={updateField}
                        placeholder="Например, Россия"
                        className={inputClassName}
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
                        value={value.city}
                        onChange={updateField}
                        placeholder="Например, Москва"
                        className={inputClassName}
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
                        Ещё {MAX_DESCRIPTION_LENGTH - value.description.length}
                    </span>
                </div>
                <textarea
                    id="description-input"
                    name="description"
                    value={value.description}
                    onChange={updateField}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    placeholder="Чем занимается компания, ключевые продукты или особенности для более точной генерации промптов..."
                    rows={4}
                    className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-3 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors resize-none h-48"
                />
            </div>
        </div>
    );
}
