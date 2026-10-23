import { formatNumber } from "@/features/reports/utils";
import type { SentimentIndex } from "@/features/reports/types";
import { PieMetricCard } from "@/components/charts/PieMetricCard";
import { MetricCard, ReportSection } from "./ReportPrimitives";

type ReportMetricsProps = {
    projectName: string;
    shareOfVoice: number | null;
    sentiment: SentimentIndex | null;
    averageRank: unknown;
    promptCount: number;
};

export default function ReportMetrics({
    projectName,
    shareOfVoice,
    sentiment,
    averageRank,
    promptCount,
}: ReportMetricsProps) {
    return (
        <ReportSection
            title="Ключевые показатели"
            description="Основные числовые результаты исследования."
        >
            <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <PieMetricCard
                        title="Доля упоминаний"
                        ariaLabel="Круговая диаграмма доли упоминаний бренда"
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <MetricCard
                        label="Средний ранг"
                        value={formatNumber(averageRank)}
                        detail="Средняя позиция бренда в ответах по основным промптам"
                    />
                    <MetricCard
                        label="Обработано ответов"
                        value={String(promptCount)}
                        detail="Результаты, сохранённые для этого отчёта"
                    />
                </div>
            </div>
        </ReportSection>
    );
}
