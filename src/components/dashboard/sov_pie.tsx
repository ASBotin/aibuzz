import type { ShareOfVoiceDistributionItem } from "./dashboard";
import DashboardPieMetricCard from "@/components/charts/DashboardPieMetricCard";

export default function SovPie({
    data,
}: {
    data: ShareOfVoiceDistributionItem[];
}) {
    const targetBrand = data.find((item) => item.isTarget);
    const shareOfVoice = targetBrand?.value ?? null;

    return (
        <DashboardPieMetricCard
            title="Доля упоминаний (SoV) за выбранный период"
            ariaLabel="Круговая диаграмма доли упоминаний целевого бренда за выбранный период"
            slices={[
                {
                    label: `${targetBrand?.brand ?? "Бренд"} упомянут`,
                    value: shareOfVoice,
                    color: "accent",
                },
                {
                    label: `${targetBrand?.brand ?? "Бренд"} не упомянут`,
                    value: shareOfVoice == null ? null : 100 - shareOfVoice,
                    color: "muted",
                },
            ]}
        />
    );
}
