import Tag from "@/components/ui/Tag";
import { formatNumber, normalizeBrandKey } from "@/features/reports/utils";
import type { CompetitorItem, H2HItem } from "@/features/reports/types";
import { EmptyState, ReportSection, StringList } from "./ReportPrimitives";

type CompetitorAnalysisProps = {
    comparisons: H2HItem[];
    competitors: CompetitorItem[];
    projectName: string;
    configuredCompetitors: string[];
};

export default function CompetitorAnalysis({
    comparisons,
    competitors,
    projectName,
    configuredCompetitors,
}: CompetitorAnalysisProps) {
    const normalizedProjectName = normalizeBrandKey(projectName);
    const normalizedConfiguredCompetitors = new Set(
        configuredCompetitors.map(normalizeBrandKey).filter(Boolean),
    );
    const displayedCompetitors =
        normalizedProjectName &&
        !competitors.some(
            (item) => normalizeBrandKey(item.name) === normalizedProjectName,
        )
            ? [
                  ...competitors,
                  {
                      name: projectName,
                      sov: 0,
                      average_rank: null,
                      mentions_count: 0,
                      is_target: true,
                  },
              ]
            : competitors;

    return (
        <>
            <ReportSection
                title="Конкурентное окружение"
                description="Доля присутствия, средний ранг и количество упоминаний брендов в учитываемых запросах."
            >
                {displayedCompetitors.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl bg-surface-1">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead className="bg-surface-3 text-content-primary font-medium text-left">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Бренд
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right">
                                            SoV
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right">
                                            Средний ранг
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right">
                                            Упоминания
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedCompetitors.map((item, index) => (
                                        <tr
                                            key={`${item.name}-${index}`}
                                            className={`border-t border-surface-3 ${
                                                (normalizedProjectName !== "" &&
                                                    normalizeBrandKey(
                                                        item.name,
                                                    ) ===
                                                        normalizedProjectName) ||
                                                normalizedConfiguredCompetitors.has(
                                                    normalizeBrandKey(
                                                        item.name,
                                                    ),
                                                )
                                                    ? "bg-surface-4"
                                                    : ""
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-content-primary">
                                                <div className="flex items-center gap-2">
                                                    <span className="break-words">
                                                        {item.name
                                                            .trim()
                                                            .toLocaleLowerCase(
                                                                "en-US",
                                                            ) === "other"
                                                            ? "Другие бренды"
                                                            : item.name}
                                                    </span>
                                                    {normalizedProjectName !==
                                                        "" &&
                                                        normalizeBrandKey(
                                                            item.name,
                                                        ) ===
                                                            normalizedProjectName && (
                                                            <Tag tone="accent">
                                                                Ваш бренд
                                                            </Tag>
                                                        )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-content-primary tabular-nums">
                                                {formatNumber(item.sov)}%
                                            </td>
                                            <td className="px-4 py-3 text-right text-content-primary tabular-nums">
                                                {formatNumber(
                                                    item.average_rank,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-content-primary tabular-nums">
                                                {formatNumber(
                                                    item.mentions_count,
                                                    0,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <EmptyState text="Данные о конкурентном окружении отсутствуют." />
                )}
            </ReportSection>
            <ReportSection
                title="Сравнение брендов"
                description="Рейтинг по совокупности данных сравнительных запросов, сильных и слабых сторон брендов, выделенных в ответах ИИ."
            >
                {comparisons.length > 0 ? (
                    <div className="space-y-3">
                        {comparisons.map((item, index) => (
                            <article
                                key={`${item.brand}-${index}`}
                                className={`rounded-3xl p-5 md:p-6 ${item.is_target ? "border border-accent-2/40 bg-accent-2/5" : "bg-surface-1"}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm font-semibold text-content-primary">
                                            {item.rank ?? index + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-content-primary break-words">
                                                {item.brand}
                                            </h3>
                                            {item.is_target && (
                                                <div className="mt-1">
                                                    <Tag tone="accent">
                                                        Ваш бренд
                                                    </Tag>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                                    <div className="space-y-3 ">
                                        <h4 className="text-lg font-semibold text-content-primary">
                                            Сильные стороны
                                        </h4>
                                        <StringList
                                            items={item.pros}
                                            emptyText="Не выявлены или не указаны."
                                            tone="positive"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-l font-semibold text-content-primary">
                                            Слабые стороны
                                        </h4>
                                        <StringList
                                            items={item.cons}
                                            emptyText="Не выявлены или не указаны."
                                            tone="negative"
                                        />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState text="Матрица сравнения пока отсутствует. Она появится после завершения анализа промптов Head-to-Head." />
                )}
            </ReportSection>
        </>
    );
}
