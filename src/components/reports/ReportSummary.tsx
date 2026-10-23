import { EmptyState, ReportSection } from "./ReportPrimitives";

type ReportSummaryProps = {
    summary: string | null;
    brandDirectSummary: string | null;
    headToHeadSummary: string | null;
};

export default function ReportSummary({
    summary,
    brandDirectSummary,
    headToHeadSummary,
}: ReportSummaryProps) {
    return (
        <ReportSection title="Итоги анализа">
            {summary ? (
                <div className="rounded-3xl bg-surface-1 p-6 md:p-7">
                    <h3 className="text-xl font-semibold text-content-primary mb-3">
                        Общее резюме
                    </h3>
                    <div className="text-base text-content-primary whitespace-pre-line leading-7">
                        {summary}
                    </div>
                </div>
            ) : (
                <EmptyState text="Общее резюме пока не сформировано." />
            )}

            {brandDirectSummary && (
                <div className="rounded-3xl bg-surface-1 p-6 md:p-7">
                    <h3 className="text-xl font-semibold text-content-primary mb-3">
                        Прямые запросы о бренде
                    </h3>
                    <div className="text-base text-content-primary whitespace-pre-line leading-7">
                        {brandDirectSummary}
                    </div>
                </div>
            )}

            {headToHeadSummary?.trim() && (
                <div className="rounded-3xl bg-surface-1 p-6 md:p-7">
                    <h3 className="text-xl font-semibold text-content-primary mb-3">
                        Итог сравнения с конкурентами
                    </h3>
                    <div className="text-base text-content-primary whitespace-pre-line leading-7">
                        {headToHeadSummary}
                    </div>
                </div>
            )}
        </ReportSection>
    );
}
