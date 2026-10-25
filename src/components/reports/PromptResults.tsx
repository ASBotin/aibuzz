"use client";

import { useState } from "react";
import Tag from "@/components/ui/Tag";
import type { PromptResult } from "@/features/reports/types";
import {
    categoryLabel,
    externalHref,
    normalizeBrandKey,
    sentimentLabel,
} from "@/features/reports/utils";
import { EmptyState, ReportSection, StringList } from "./ReportPrimitives";

type PromptResultsProps = {
    results: PromptResult[];
    projectName: string;
    hasUnavailableOriginalData: boolean;
};

export default function PromptResults({
    results,
    projectName,
    hasUnavailableOriginalData,
}: PromptResultsProps) {
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedOrigin, setSelectedOrigin] = useState("");
    const categories = [
        ...new Set(
            results
                .map((result) => result.prompt_category)
                .filter((category): category is string => Boolean(category)),
        ),
    ].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), "ru"));
    const providers = [
        ...new Set(
            results
                .map((result) => result.provider)
                .filter((provider): provider is string => Boolean(provider)),
        ),
    ].sort((a, b) => a.localeCompare(b, "ru"));
    const filteredResults = results.filter(
        (result) =>
            (!selectedCategory ||
                result.prompt_category === selectedCategory) &&
            (!selectedProvider || result.provider === selectedProvider) &&
            (!selectedOrigin ||
                (selectedOrigin === "custom" && result.is_custom === true) ||
                (selectedOrigin === "generated" && result.is_custom === false)),
    );
    const resultCount =
        filteredResults.length === results.length
            ? `${results.length}`
            : `${filteredResults.length} из ${results.length}`;

    return (
        <ReportSection
            title={`Результаты по промптам (${resultCount})`}
            description="Детализация ответов, извлечённых метрик, цитат и исходного текста. Исходные тексты ответов нейросетей хранятся неделю, позже очищаются. Вы будете иметь доступ к остальной информации."
        >
            {hasUnavailableOriginalData && (
                <EmptyState text="Исходные промпты хранятся ограниченное время, они были очищены." />
            )}
            {results.length > 0 && (
                <div className="no-print flex flex-wrap gap-3 rounded-2xl bg-surface-1 p-4">
                    <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-medium text-content-secondary">
                        Категория промпта
                        <select
                            value={selectedCategory}
                            onChange={(event) =>
                                setSelectedCategory(event.target.value)
                            }
                            className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-content-primary"
                        >
                            <option value="">Все категории</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {categoryLabel(category)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-medium text-content-secondary">
                        Нейросеть
                        <select
                            value={selectedProvider}
                            onChange={(event) =>
                                setSelectedProvider(event.target.value)
                            }
                            className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-content-primary"
                        >
                            <option value="">Все нейросети</option>
                            {providers.map((provider) => (
                                <option key={provider} value={provider}>
                                    {provider}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-medium text-content-secondary">
                        Происхождение
                        <select
                            value={selectedOrigin}
                            onChange={(event) =>
                                setSelectedOrigin(event.target.value)
                            }
                            className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-content-primary"
                        >
                            <option value="">Все промпты</option>
                            <option value="custom">Пользовательские</option>
                            <option value="generated">Сгенерированные</option>
                        </select>
                    </label>
                </div>
            )}
            {results.length > 0 ? (
                filteredResults.length > 0 ? (
                    <div className="space-y-3">
                        {filteredResults.map((result, index) => {
                            const extractedDomains = (
                                result.extracted_domains || []
                            ).filter((value) => value.trim());
                            const citations = (
                                result.raw_citations || []
                            ).filter((value) => value.trim());
                            const hasLinks =
                                extractedDomains.length > 0 ||
                                citations.length > 0;
                            const targetProsCons = Object.entries(
                                result.brands_pros_cons || {},
                            ).find(
                                ([brand]) =>
                                    normalizeBrandKey(brand) ===
                                    normalizeBrandKey(projectName),
                            )?.[1];

                            return (
                                <article
                                    key={result.id}
                                    className="report-prompt-result rounded-2xl bg-surface-1 p-5 md:p-6 space-y-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Tag>{`Запрос ${index + 1}`}</Tag>
                                            <Tag tone="accent">
                                                {categoryLabel(
                                                    result.prompt_category,
                                                )}
                                            </Tag>
                                            {result.provider && (
                                                <Tag>{result.provider}</Tag>
                                            )}
                                            <Tag>
                                                {result.is_custom == null
                                                    ? "Происхождение не определено"
                                                    : result.is_custom
                                                      ? "Пользовательский"
                                                      : "Сгенерированный"}
                                            </Tag>
                                        </div>
                                        <div className="text-xs text-content-light break-all">
                                            ID: {result.id}
                                        </div>
                                    </div>

                                    {result.prompt_text?.trim() && (
                                        <h3 className="text-base font-medium text-content-primary leading-relaxed">
                                            {result.prompt_text}
                                        </h3>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-xl bg-surface-2 p-3">
                                            <div className="text-xs text-content-secondary">
                                                Целевой бренд упомянут
                                            </div>
                                            <div className="text-sm font-semibold text-content-primary mt-1">
                                                {result.brand_mentioned == null
                                                    ? "Не определено"
                                                    : result.brand_mentioned
                                                      ? "Да"
                                                      : "Нет"}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-surface-2 p-3">
                                            <div className="text-xs text-content-secondary">
                                                Тональность
                                            </div>
                                            <div className="text-sm font-semibold text-content-primary mt-1">
                                                {sentimentLabel(
                                                    result.sentiment,
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-surface-2 p-3">
                                            <div className="text-xs text-content-secondary">
                                                Найдено конкурентов
                                            </div>
                                            <div className="text-sm font-semibold text-content-primary mt-1">
                                                {result.found_competitors
                                                    ?.length || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {result.found_competitors &&
                                        result.found_competitors.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-semibold text-content-primary">
                                                    Найденные бренды и
                                                    конкуренты
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.found_competitors.map(
                                                        (brand, brandIndex) => (
                                                            <Tag
                                                                key={`${brand}-${brandIndex}`}
                                                            >
                                                                {brand}
                                                            </Tag>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {targetProsCons && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-content-primary">
                                                Плюсы и минусы
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-surface-2 p-4 space-y-2">
                                                    <div className="text-xs font-semibold text-emerald-400">
                                                        Плюсы
                                                    </div>
                                                    <StringList
                                                        items={
                                                            targetProsCons.pros
                                                        }
                                                        emptyText="Не указаны"
                                                        tone="positive"
                                                    />
                                                </div>
                                                <div className="rounded-xl bg-surface-2 p-4 space-y-2">
                                                    <div className="text-xs font-semibold text-red-400">
                                                        Минусы
                                                    </div>
                                                    <StringList
                                                        items={
                                                            targetProsCons.cons
                                                        }
                                                        emptyText="Не указаны"
                                                        tone="negative"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hasLinks && (
                                        <details className="report-print-expandable report-print-sources group rounded-xl bg-surface-2 overflow-hidden">
                                            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-content-secondary hover:text-content-primary select-none">
                                                Показать цитаты и ссылки (
                                                {citations.length +
                                                    extractedDomains.length}
                                                )
                                            </summary>
                                            <div className="border-t border-surface-3 p-4 space-y-4">
                                                {extractedDomains.length >
                                                    0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold text-content-primary">
                                                            Извлечённые домены
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {extractedDomains.map(
                                                                (
                                                                    domain,
                                                                    index,
                                                                ) => {
                                                                    const href =
                                                                        externalHref(
                                                                            domain,
                                                                        );
                                                                    return href ? (
                                                                        <a
                                                                            key={`${domain}-${index}`}
                                                                            href={
                                                                                href
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="rounded-full bg-surface-1 px-3 py-1.5 text-xs text-accent-2 hover:bg-surface-3 break-all"
                                                                        >
                                                                            {
                                                                                domain
                                                                            }
                                                                        </a>
                                                                    ) : (
                                                                        <Tag
                                                                            key={`${domain}-${index}`}
                                                                        >
                                                                            {
                                                                                domain
                                                                            }
                                                                        </Tag>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {citations.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold text-content-primary">
                                                            Цитаты и ссылки
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {citations.map(
                                                                (
                                                                    citation,
                                                                    index,
                                                                ) => {
                                                                    const href =
                                                                        externalHref(
                                                                            citation,
                                                                        );
                                                                    return (
                                                                        <li
                                                                            key={`${citation}-${index}`}
                                                                            className="rounded-xl bg-surface-1 px-3 py-2 text-xs break-all"
                                                                        >
                                                                            {href ? (
                                                                                <a
                                                                                    href={
                                                                                        href
                                                                                    }
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="text-accent-2 hover:underline"
                                                                                >
                                                                                    {
                                                                                        citation
                                                                                    }
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-content-secondary">
                                                                                    {
                                                                                        citation
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                },
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    )}

                                    <details className="report-print-expandable report-print-answer group rounded-xl bg-surface-2 overflow-hidden">
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-content-secondary hover:text-content-primary select-none">
                                            Показать исходный ответ
                                        </summary>
                                        <div className="border-t border-surface-3 p-4 text-sm text-content-secondary whitespace-pre-wrap leading-6 break-words">
                                            {result.raw_text ||
                                                "Исходный ответ отсутствует."}
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState text="По выбранным фильтрам промпты не найдены." />
                )
            ) : (
                <EmptyState text="Результаты по промптам не найдены." />
            )}
        </ReportSection>
    );
}
