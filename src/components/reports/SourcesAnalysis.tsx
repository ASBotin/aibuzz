import Tag from "@/components/ui/Tag";
import type { SourceItem } from "@/features/reports/types";
import { externalHref, formatNumber } from "@/features/reports/utils";
import { EmptyState, ReportSection } from "./ReportPrimitives";

type SourcesAnalysisProps = {
    citationRate: unknown;
    sources: SourceItem[];
    originalLinksByDomain: Record<string, string[]>;
};

export default function SourcesAnalysis({
    citationRate,
    sources,
    originalLinksByDomain,
}: SourcesAnalysisProps) {
    return (
        <ReportSection
            title="Источники"
            description="Домены, найденные в цитатах и извлечённых источниках."
        >
            <div className="rounded-2xl bg-surface-1 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="text-sm text-content-secondary">
                        Доля запросов с источниками
                    </div>
                    <div className="text-2xl font-semibold text-content-primary mt-1">
                        {formatNumber(citationRate)}%
                    </div>
                </div>
            </div>
            {sources.length > 0 ? (
                <div className="space-y-2">
                    {sources.map((source, index) => {
                        const href = externalHref(source.domain);
                        const originalLinks =
                            originalLinksByDomain[source.domain] || [];
                        return (
                            <div
                                key={`${source.domain}-${index}`}
                                className="rounded-2xl bg-surface-1 p-4 flex flex-wrap items-center justify-between gap-3"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-xl bg-surface-3 flex items-center justify-center text-xs text-content-secondary shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        {href ? (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-content-primary hover:text-accent-2 transition-colors break-all"
                                            >
                                                {source.domain}
                                            </a>
                                        ) : (
                                            <div className="text-sm font-medium text-content-primary break-all">
                                                {source.domain}
                                            </div>
                                        )}
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
        </ReportSection>
    );
}
