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
    projectDomain?: string | null;
    trackedUrls: string[];
};

type LinkFilter = "" | "domain" | "tracked";

function resultKeywords(result: PromptResult): string[] {
    const seen = new Set<string>();
    return (result.mentioned_keywords || []).reduce<string[]>(
        (keywords, keyword) => {
            const trimmedKeyword = keyword.trim();
            const normalizedKeyword = trimmedKeyword.toLocaleLowerCase("ru");
            if (trimmedKeyword && !seen.has(normalizedKeyword)) {
                seen.add(normalizedKeyword);
                keywords.push(trimmedKeyword);
            }
            return keywords;
        },
        [],
    );
}

function normalizeUrl(value: string): string | null {
    try {
        const url = new URL(value.includes("://") ? value : `https://${value}`);
        const hostname = url.hostname
            .toLocaleLowerCase("en-US")
            .replace(/^www\./, "");
        const pathname = url.pathname.replace(/\/+$/, "");
        return `${hostname}${pathname}`;
    } catch {
        return null;
    }
}

function normalizeDomain(value: string): string | null {
    try {
        return new URL(
            value.includes("://") ? value : `https://${value}`,
        ).hostname
            .toLocaleLowerCase("en-US")
            .replace(/^www\./, "");
    } catch {
        return null;
    }
}

function urlReferencesDomain(
    value: string,
    projectDomain: string | null | undefined,
): boolean {
    const expectedDomain = projectDomain
        ? normalizeDomain(projectDomain)
        : null;
    const hostname = normalizeDomain(value);
    return Boolean(
        expectedDomain &&
        hostname &&
        (hostname === expectedDomain ||
            hostname.endsWith(`.${expectedDomain}`)),
    );
}

function resultReferencesDomain(
    result: PromptResult,
    projectDomain: string | null | undefined,
): boolean {
    if (result.domain_mentioned === true) return true;
    const expectedDomain = projectDomain
        ? normalizeDomain(projectDomain)
        : null;
    if (!expectedDomain) return false;

    const foundDomains = [
        ...(result.extracted_domains || []),
        ...(result.raw_citations || []),
    ];
    const hasMatchingHost = foundDomains.some((value) => {
        const hostname = normalizeDomain(value);
        return (
            hostname === expectedDomain ||
            Boolean(hostname?.endsWith(`.${expectedDomain}`))
        );
    });
    if (hasMatchingHost) return true;

    const escapedDomain = expectedDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
        `(?:^|[^a-z0-9.-])(?:[a-z0-9-]+\\.)*${escapedDomain}(?=$|[^a-z0-9.-])`,
        "i",
    ).test(result.raw_text || "");
}

function resultReferencesTrackedUrl(
    result: PromptResult,
    trackedUrls: string[],
): boolean {
    const configuredUrls = new Set(
        trackedUrls
            .map(normalizeUrl)
            .filter((url): url is string => url !== null),
    );
    if (configuredUrls.size === 0) return false;

    const referencedUrls = [
        ...(result.mentioned_pages || []),
        ...(result.raw_citations || []),
        ...(result.extracted_domains || []),
    ];
    return referencedUrls.some((url) => {
        const normalizedUrl = normalizeUrl(url);
        return normalizedUrl !== null && configuredUrls.has(normalizedUrl);
    });
}

export default function PromptResults({
    results,
    projectName,
    hasUnavailableOriginalData,
    projectDomain,
    trackedUrls,
}: PromptResultsProps) {
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedLink, setSelectedLink] = useState<LinkFilter>("");
    const [onlyBrandMentioned, setOnlyBrandMentioned] = useState(false);
    const [onlyKeywordsMentioned, setOnlyKeywordsMentioned] = useState(false);
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
            (!selectedLink ||
                (selectedLink === "domain" &&
                    resultReferencesDomain(result, projectDomain)) ||
                (selectedLink === "tracked" &&
                    resultReferencesTrackedUrl(result, trackedUrls))) &&
            (!onlyBrandMentioned || result.brand_mentioned === true) &&
            (!onlyKeywordsMentioned || resultKeywords(result).length > 0),
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
                        Ссылки
                        <select
                            value={selectedLink}
                            onChange={(event) =>
                                setSelectedLink(
                                    event.target.value as LinkFilter,
                                )
                            }
                            className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-content-primary"
                        >
                            <option value="">Все</option>
                            <option value="domain">Со ссылкой на домен</option>
                            <option value="tracked">
                                С отслеживаемыми ссылками
                            </option>
                        </select>
                    </label>
                    <div className="flex w-full flex-wrap gap-x-6 gap-y-2 border-t border-surface-3 pt-3">
                        <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
                            <input
                                type="checkbox"
                                checked={onlyBrandMentioned}
                                onChange={(event) =>
                                    setOnlyBrandMentioned(event.target.checked)
                                }
                                className="size-4 accent-accent-2"
                            />
                            С упоминанием бренда
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
                            <input
                                type="checkbox"
                                checked={onlyKeywordsMentioned}
                                onChange={(event) =>
                                    setOnlyKeywordsMentioned(
                                        event.target.checked,
                                    )
                                }
                                className="size-4 accent-accent-2"
                            />
                            С ключевыми словами
                        </label>
                    </div>
                </div>
            )}
            {results.length > 0 ? (
                filteredResults.length > 0 ? (
                    <div className="space-y-3">
                        {filteredResults.map((result) => {
                            const extractedDomains = (
                                result.extracted_domains || []
                            ).filter((value) => value.trim());
                            const citations = (
                                result.raw_citations || []
                            ).filter((value) => value.trim());
                            const hasLinks =
                                extractedDomains.length > 0 ||
                                citations.length > 0;
                            const mentionedTrackedUrls = new Set(
                                [
                                    ...(result.mentioned_pages || []),
                                    ...(result.raw_citations || []),
                                    ...(result.extracted_domains || []),
                                ]
                                    .map(normalizeUrl)
                                    .filter(
                                        (url): url is string =>
                                            url !== null &&
                                            trackedUrls.some(
                                                (trackedUrl) =>
                                                    normalizeUrl(trackedUrl) ===
                                                    url,
                                            ),
                                    ),
                            );
                            const referencesProjectDomain =
                                resultReferencesDomain(result, projectDomain);
                            const keywords = resultKeywords(result);
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
                                            <Tag tone="accent">
                                                {categoryLabel(
                                                    result.prompt_category,
                                                )}
                                            </Tag>
                                            {result.provider && (
                                                <Tag>{result.provider}</Tag>
                                            )}
                                            {referencesProjectDomain && (
                                                <Tag tone="accent">
                                                    Ссылается на домен
                                                </Tag>
                                            )}
                                            {mentionedTrackedUrls.size > 0 && (
                                                <Tag tone="accent">
                                                    Отслеживаемые ссылки
                                                </Tag>
                                            )}
                                            {keywords.map((keyword) => (
                                                <Tag
                                                    key={keyword}
                                                    tone="accent"
                                                >
                                                    {keyword}
                                                </Tag>
                                            ))}
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
                                                                    const isTracked =
                                                                        (href &&
                                                                            trackedUrls.some(
                                                                                (
                                                                                    url,
                                                                                ) =>
                                                                                    normalizeUrl(
                                                                                        url,
                                                                                    ) ===
                                                                                    normalizeUrl(
                                                                                        href,
                                                                                    ),
                                                                            )) ||
                                                                        mentionedTrackedUrls.has(
                                                                            normalizeUrl(
                                                                                domain,
                                                                            ) ??
                                                                                "",
                                                                        );
                                                                    const isProjectDomain =
                                                                        urlReferencesDomain(
                                                                            domain,
                                                                            projectDomain,
                                                                        );
                                                                    const linkClassName =
                                                                        isTracked
                                                                            ? "border border-accent-2/40 bg-accent-2/10 font-semibold text-accent-2"
                                                                            : isProjectDomain
                                                                              ? "bg-accent-2/10 font-medium text-accent-2"
                                                                              : "bg-surface-1 text-accent-2 hover:bg-surface-1";
                                                                    return href ? (
                                                                        <a
                                                                            key={`${domain}-${index}`}
                                                                            href={
                                                                                href
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className={`break-all rounded-full px-3 py-1.5 text-xs ${linkClassName}`}
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
                                                                    const isTracked =
                                                                        (href &&
                                                                            trackedUrls.some(
                                                                                (
                                                                                    url,
                                                                                ) =>
                                                                                    normalizeUrl(
                                                                                        url,
                                                                                    ) ===
                                                                                    normalizeUrl(
                                                                                        href,
                                                                                    ),
                                                                            )) ||
                                                                        mentionedTrackedUrls.has(
                                                                            normalizeUrl(
                                                                                citation,
                                                                            ) ??
                                                                                "",
                                                                        );
                                                                    const isProjectDomain =
                                                                        urlReferencesDomain(
                                                                            citation,
                                                                            projectDomain,
                                                                        );
                                                                    const citationClassName =
                                                                        isTracked
                                                                            ? "border border-accent-2/40 bg-accent-2/10"
                                                                            : isProjectDomain
                                                                              ? "bg-accent-2/10"
                                                                              : "bg-surface-1";
                                                                    return (
                                                                        <li
                                                                            key={`${citation}-${index}`}
                                                                            className={`rounded-xl px-3 py-2 text-xs break-all ${citationClassName}`}
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
