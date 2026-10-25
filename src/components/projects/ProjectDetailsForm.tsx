"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { CircleHelp, Plus, X } from "lucide-react";
import {
    MAX_COMPETITORS,
    MAX_DESCRIPTION_LENGTH,
    MAX_KEYWORDS,
    MAX_PAGES,
    type ProjectFormData,
} from "@/features/projects";

type ProjectDetailsFormProps = {
    value: ProjectFormData;
    competitors: string[];
    keywords: string[];
    pages: string[];
    onChange: (field: keyof ProjectFormData, value: string) => void;
    onCompetitorsChange: (competitors: string[]) => void;
    onKeywordsChange: (keywords: string[]) => void;
    onPagesChange: (pages: string[]) => void;
};

const inputClassName =
    "w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors";

function FieldLabel({
    htmlFor,
    children,
    hint,
}: {
    htmlFor: string;
    children: string;
    hint: string;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <label
                htmlFor={htmlFor}
                className="text-sm font-medium text-content-secondary"
            >
                {children}
            </label>
            <span className="group relative inline-flex">
                <button
                    type="button"
                    aria-label={`Подсказка: ${children}`}
                    className="text-content-light hover:text-accent-2 focus-visible:text-accent-2 focus-visible:outline-none"
                >
                    <CircleHelp size={15} aria-hidden="true" />
                </button>
                <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-xs font-normal leading-relaxed text-content-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                    {hint}
                </span>
            </span>
        </div>
    );
}

function TagInput({
    id,
    label,
    placeholder,
    items,
    maxItems,
    onChange,
}: {
    id: string;
    label: string;
    placeholder: string;
    items: string[];
    maxItems: number;
    onChange: (items: string[]) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState("");

    const addItem = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter" && event.key !== ",") return;

        event.preventDefault();
        const item = inputValue.trim().replace(/,$/, "");
        if (
            item &&
            !items.some(
                (existing) => existing.toLowerCase() === item.toLowerCase(),
            ) &&
            items.length < maxItems
        ) {
            onChange([...items, item]);
        }
        setInputValue("");
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
                <FieldLabel
                    htmlFor={id}
                    hint={
                        id === "competitor-input"
                            ? "Укажите конкурентов, чтобы сравнивать их присутствие с вашим брендом."
                            : "Перечислите здесь альтернативные написания, названия продуктов, торговых марок и т.д., всё что вы хотите отследить отдельно"
                    }
                >
                    {label}
                </FieldLabel>
                <span className="text-xs text-content-light tabular-nums">
                    {items.length} / {maxItems}
                </span>
            </div>
            <div
                className="flex flex-wrap items-center gap-2 w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2 min-h-[48px] focus-within:border-accent-2 focus-within:ring-1 focus-within:ring-accent-2 transition-colors cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {items.map((item) => (
                    <span
                        key={item}
                        className="flex items-center gap-1.5 bg-surface-1 text-content-primary px-3 py-1 rounded-full text-sm select-none border border-content-light/20"
                    >
                        {item}
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange(
                                    items.filter((value) => value !== item),
                                );
                            }}
                            aria-label={`Удалить: ${item}`}
                            className="text-content-light hover:text-content-secondary focus:outline-none cursor-pointer"
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={addItem}
                    disabled={items.length >= maxItems}
                    placeholder={
                        items.length === 0
                            ? placeholder
                            : items.length >= maxItems
                              ? "Лимит достигнут"
                              : ""
                    }
                    aria-label={`Добавить: ${label.toLowerCase()}`}
                    className="flex-1 min-w-[200px] bg-transparent outline-none text-content-primary placeholder:text-content-light disabled:cursor-not-allowed"
                />
            </div>
            <p className="text-xs text-content-secondary mt-1 select-none">
                {items.length >= maxItems
                    ? `Достигнут лимит: ${maxItems}.`
                    : "Нажмите Enter или запятую, чтобы добавить"}
            </p>
        </div>
    );
}

export default function ProjectDetailsForm({
    value,
    competitors,
    keywords,
    pages,
    onChange,
    onCompetitorsChange,
    onKeywordsChange,
    onPagesChange,
}: ProjectDetailsFormProps) {
    const updateField = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        onChange(
            event.target.name as keyof ProjectFormData,
            event.target.value,
        );
    };

    const updatePage = (index: number, page: string) => {
        onPagesChange(
            pages.map((current, pageIndex) =>
                pageIndex === index ? page : current,
            ),
        );
    };

    return (
        <div className="space-y-6">
            <div className="max-w-full space-y-2">
                <FieldLabel
                    htmlFor="brandName-input"
                    hint="Название бренда будет использоваться для генерации запросов и анализа ответов."
                >
                    Название бренда/компании*
                </FieldLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <FieldLabel
                        htmlFor="niche-input"
                        hint="Сфера помогает сформировать релевантные запросы для исследования."
                    >
                        Сфера деятельности*
                    </FieldLabel>
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

                <div className="space-y-2">
                    <FieldLabel
                        htmlFor="domain-input"
                        hint="Основной домен сайта. Позволит отслеживать его упоминания в ответах нейросети."
                    >
                        Домен
                    </FieldLabel>
                    <input
                        id="domain-input"
                        type="text"
                        name="domain"
                        value={value.domain}
                        onChange={updateField}
                        placeholder="Например, example.ru"
                        className={inputClassName}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <FieldLabel
                        htmlFor="pages-input-0"
                        hint="Добавьте до 5 важных страниц сайта, чтобы отдельно отслеживать их упоминания и ссылки."
                    >
                        Ссылки
                    </FieldLabel>
                    <span className="text-xs text-content-light tabular-nums">
                        {pages.filter((page) => page.trim()).length} /{" "}
                        {MAX_PAGES}
                    </span>
                </div>
                <div className="space-y-2">
                    {(pages.length > 0 ? pages : [""]).map((page, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                id={`pages-input-${index}`}
                                type="url"
                                value={page}
                                onChange={(event) =>
                                    updatePage(index, event.target.value)
                                }
                                placeholder="https://example.ru/page"
                                aria-label={`Ссылка ${index + 1}`}
                                className={inputClassName}
                            />
                            {index > 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onPagesChange(
                                            pages.filter(
                                                (_, pageIndex) =>
                                                    pageIndex !== index,
                                            ),
                                        )
                                    }
                                    aria-label={`Удалить ссылку ${index + 1}`}
                                    className="shrink-0 rounded-full p-2 text-content-light hover:bg-surface-1 hover:text-content-primary"
                                >
                                    <X size={18} aria-hidden="true" />
                                </button>
                            )}
                            {index === pages.length - 1 &&
                                page.trim() &&
                                pages.length < MAX_PAGES && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onPagesChange([...pages, ""])
                                        }
                                        aria-label="Добавить ссылку"
                                        className="shrink-0 rounded-full p-2 text-accent-2 transition-colors hover:bg-surface-1"
                                    >
                                        <Plus size={18} aria-hidden="true" />
                                    </button>
                                )}
                        </div>
                    ))}
                </div>
            </div>

            <TagInput
                id="competitor-input"
                label="Конкуренты"
                placeholder="Перечислите основных конкурентов"
                items={competitors}
                maxItems={MAX_COMPETITORS}
                onChange={onCompetitorsChange}
            />

            <TagInput
                id="keyword-input"
                label="Ключевые слова"
                placeholder="Например, название вашего продукта"
                items={keywords}
                maxItems={MAX_KEYWORDS}
                onChange={onKeywordsChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <FieldLabel
                        htmlFor="country-input"
                        hint="Страна задаёт географический контекст запросов и ответов."
                    >
                        Страна
                    </FieldLabel>
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
                    <FieldLabel
                        htmlFor="city-input"
                        hint="Город помогает учитывать локальные рекомендации и результаты."
                    >
                        Город
                    </FieldLabel>
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
                    <FieldLabel
                        htmlFor="description-input"
                        hint="Дополнительная информация о компании помогает точнее составить запросы."
                    >
                        Краткое описание
                    </FieldLabel>
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
