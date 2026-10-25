import { CircleHelp } from "lucide-react";
import Tag from "@/components/ui/Tag";
import type { SourceItem, TrackedSources } from "@/features/reports/types";
import { externalHref, formatNumber } from "@/features/reports/utils";
import { EmptyState } from "./ReportPrimitives";

type SourcesAnalysisProps = {
    citationRate: unknown;
    sources: SourceItem[];
    originalLinksByDomain: Record<string, string[]>;
    projectDomain?: string | null;
    trackedPages: TrackedSources["pages"];
};

function normalizeDomain(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;

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

export default function SourcesAnalysis({
    citationRate,
    sources,
    originalLinksByDomain,
    projectDomain,
    trackedPages,
}: SourcesAnalysisProps) {
    const normalizedProjectDomain = normalizeDomain(projectDomain);

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-content-primary">
                        Источники
                    </h2>
                    <p className="text-base text-content-secondary">
                        Домены, найденные в цитатах и извлечённых источниках.
                    </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <span className="text-lg font-semibold tabular-nums text-content-primary">
                        {formatNumber(citationRate)}%
                    </span>
                    <span className="group relative inline-flex">
                        <button
                            type="button"
                            aria-label="Подсказка: Доля запросов с источниками"
                            className="text-content-light hover:text-accent-2 focus-visible:text-accent-2 focus-visible:outline-none"
                        >
                            <CircleHelp size={16} aria-hidden="true" />
                        </button>
                        <span
                            role="tooltip"
                            className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-xs font-normal leading-relaxed text-content-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                            Доля запросов с источниками
                        </span>
                    </span>
                </div>
            </div>

            {sources.length > 0 ? (
                <div className="space-y-2">
                    {sources.map((source, index) => {
                        const href = externalHref(source.domain);
                        const isProjectDomain =
                            normalizedProjectDomain !== null &&
                            normalizeDomain(source.domain) ===
                                normalizedProjectDomain;
                        const originalLinks =
                            originalLinksByDomain[source.domain] || [];
                        return (
                            <div
                                key={`${source.domain}-${index}`}
                                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${
                                    isProjectDomain
                                        ? "border border-accent-2/40 bg-accent-2/5"
                                        : "bg-surface-1"
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-xl bg-surface-3 flex items-center justify-center text-xs text-content-secondary shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {href ? (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="break-all text-sm font-medium text-content-primary transition-colors hover:text-accent-2"
                                                >
                                                    {source.domain}
                                                </a>
                                            ) : (
                                                <div className="break-all text-sm font-medium text-content-primary">
                                                    {source.domain}
                                                </div>
                                            )}
                                            {isProjectDomain && (
                                                <Tag tone="accent">
                                                    Ваш домен
                                                </Tag>
                                            )}
                                        </div>
                                        <div className="text-xs text-content-secondary mt-1">
                                            {formatNumber(source.count, 0)}{" "}
                                            упоминаний ·{" "}
                                            {formatNumber(source.percentage)}%
                                            запросов
                                        </div>
                                    </div>
                                </div>
                                {source.mentions_target_brand ? (
                                    <Tag tone="positive">
                                        Есть упоминание бренда
                                    </Tag>
                                ) : (
                                    <Tag>Без упоминания бренда</Tag>
                                )}
                                {originalLinks.length > 0 && (
                                    <details className="report-print-expandable w-full rounded-xl bg-surface-2/70">
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-content-secondary hover:text-content-primary select-none">
                                            Показать оригинальные ссылки (
                                            {originalLinks.length})
                                        </summary>
                                        <ul className="border-t border-surface-3 p-4 space-y-2">
                                            {originalLinks.map((link) => (
                                                <li
                                                    key={link}
                                                    className="text-sm break-all"
                                                >
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-accent-2 hover:underline"
                                                    >
                                                        {link}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState text="Цитируемые источники не найдены." />
            )}

            {trackedPages.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-lg font-semibold text-content-primary">
                        Отслеживаемые ссылки
                    </h3>
                    <ul className="space-y-2">
                        {trackedPages.map(({ url, count }) => {
                            const href = externalHref(url);
                            return (
                                <li
                                    key={url}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-1 p-4"
                                >
                                    {href ? (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="min-w-0 break-all text-sm font-medium text-content-primary transition-colors hover:text-accent-2"
                                        >
                                            {url}
                                        </a>
                                    ) : (
                                        <span className="min-w-0 break-all text-sm font-medium text-content-primary">
                                            {url}
                                        </span>
                                    )}
                                    <span className="shrink-0 text-sm text-content-secondary">
                                        {formatNumber(count, 0)} упоминаний
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </section>
    );
}
