import type { SentimentDistributionItem } from "./dashboard";
import { PieMetricCard } from "@/components/charts/PieMetricCard";

const sentimentLabels: Record<
    SentimentDistributionItem["sentiment"],
    { label: string; color: "positive" | "neutral" | "negative" }
> = {
    positive: { label: "Позитивная", color: "positive" },
    neutral: { label: "Нейтральная", color: "neutral" },
    negative: { label: "Негативная", color: "negative" },
};

export default function SentimentPie({
    data,
}: {
    data: SentimentDistributionItem[];
}) {
    const values = new Map(
        data.map(({ sentiment, value }) => [sentiment, value]),
    );

    return (
        <PieMetricCard
            title="Индекс тональности за выбранный период"
            ariaLabel="Круговая диаграмма позитивной, нейтральной и негативной тональности"
            slices={(["positive", "neutral", "negative"] as const).map(
                (sentiment) => ({
                    ...sentimentLabels[sentiment],
                    value: values.get(sentiment) ?? null,
                }),
            )}
        />
    );
}
