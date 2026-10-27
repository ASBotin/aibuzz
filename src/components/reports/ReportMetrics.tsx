import { formatNumber } from "@/features/reports/utils";
import type { SentimentIndex } from "@/features/reports/types";
import { PieMetricCard } from "@/components/charts/PieMetricCard";
import { ReportSection } from "./ReportPrimitives";

type ReportMetricsProps = {
    projectName: string;
    shareOfVoice: number | null;
    sentiment: SentimentIndex | null;
    averageRank: unknown;
    promptCount: number;
    shareOfVoiceChange: number | null;
    positiveSentimentChange: number | null;
    hasPreviousReport: boolean;
    domainCitationRate: number | null;
};

export default function ReportMetrics({
    projectName,
    shareOfVoice,
    sentiment,
    averageRank,
    promptCount,
    shareOfVoiceChange,
    positiveSentimentChange,
    hasPreviousReport,
    domainCitationRate,
}: ReportMetricsProps) {
    return (
        <ReportSection
            title="Ключевые показатели"
            description="Основные числовые результаты исследования."
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <PieMetricCard
                    title="Доля упоминаний"
                    ariaLabel="Круговая диаграмма доли упоминаний бренда"
                    primaryValue={shareOfVoice}
                    changeFromPrevious={shareOfVoiceChange}
                    hasPreviousReport={hasPreviousReport}
                    slices={[
                        {
                            label: `${projectName} упомянут`,
                            value: shareOfVoice,
                            color: "accent",
                        },
                        {
                            label: `${projectName} не упомянут`,
                            value:
                                shareOfVoice == null
                                    ? null
                                    : 100 - shareOfVoice,
                            color: "muted",
                        },
                    ]}
                />
                <PieMetricCard
                    title="Индекс тональности"
                    ariaLabel="Круговая диаграмма позитивной, нейтральной и негативной тональности"
                    primaryValue={sentiment?.positive ?? null}
                    changeFromPrevious={positiveSentimentChange}
                    hasPreviousReport={hasPreviousReport}
                    slices={[
                        {
                            label: "Позитивная",
                            value: sentiment?.positive ?? null,
                            color: "positive",
                        },
                        {
                            label: "Нейтральная",
                            value: sentiment?.neutral ?? null,
                            color: "neutral",
                        },
                        {
                            label: "Негативная",
                            value: sentiment?.negative ?? null,
                            color: "negative",
                        },
                    ]}
                />
                <article className="flex min-w-0 flex-col rounded-3xl bg-surface-2 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-content-primary">
                        Позиции и источники
                    </h3>
                    <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2">
                        <div className="min-w-0 pr-2">
                            <div className="text-2xl font-semibold tracking-tight text-content-primary tabular-nums">
                                {promptCount}
                            </div>
                            <div className="mt-1 text-xs leading-snug text-content-secondary">
                                Обработано ответов
                            </div>
                        </div>
                        <div className="min-w-0 border-l border-surface-3 pl-4">
                            <div className="text-2xl font-semibold tracking-tight text-content-primary tabular-nums">
                                {formatNumber(averageRank)}
                            </div>
                            <div className="mt-1 text-xs leading-snug text-content-secondary">
                                Средний ранг
                            </div>
                        </div>
                        <div className="col-span-2 flex min-h-0 flex-col items-center justify-center border-t border-surface-3 text-center">
                            <div className="text-2xl font-semibold tracking-tight text-content-primary tabular-nums">
                                {domainCitationRate == null
                                    ? "—"
                                    : `${formatNumber(domainCitationRate)}%`}
                            </div>
                            <div className="mt-1 text-xs leading-snug text-content-secondary">
                                Цитируемость домена
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </ReportSection>
    );
}
