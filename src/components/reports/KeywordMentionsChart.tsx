"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { KeywordMentionItem } from "@/features/reports/types";
import { formatNumber } from "@/features/reports/utils";
import { EmptyState, ReportSection } from "./ReportPrimitives";

function KeywordTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload?: unknown }>;
}) {
    if (!active || !payload?.length) return null;

    const item = payload[0]?.payload as KeywordMentionItem | undefined;
    if (
        !item ||
        typeof item.keyword !== "string" ||
        typeof item.count !== "number" ||
        typeof item.percentage !== "number"
    ) {
        return null;
    }

    return (
        <div className="min-w-48 rounded-2xl border border-surface-3 bg-surface-2 px-4 py-3 shadow-xl">
            <p className="max-w-64 break-words text-sm font-semibold text-content-primary">
                {item.keyword}
            </p>
            <p className="mt-2 text-sm text-content-secondary">
                Упоминаний:{" "}
                <span className="font-semibold tabular-nums text-content-primary">
                    {formatNumber(item.count, 0)}
                </span>
            </p>
            <p className="text-sm text-content-secondary">
                Ответов:{" "}
                <span className="font-semibold tabular-nums text-content-primary">
                    {formatNumber(item.percentage)}%
                </span>
            </p>
        </div>
    );
}

export default function KeywordMentionsChart({
    data,
}: {
    data: KeywordMentionItem[];
}) {
    const validData = data.filter(
        (item) =>
            typeof item.keyword === "string" &&
            item.keyword.trim().length > 0 &&
            typeof item.count === "number" &&
            Number.isFinite(item.count) &&
            typeof item.percentage === "number" &&
            Number.isFinite(item.percentage),
    );

    return (
        <ReportSection
            title="Упоминания ключевых слов"
            description="Количество ответов, в которых нейросеть упомянула каждое ключевое слово."
        >
            {validData.length === 0 ? (
                <EmptyState text="Для этого проекта не настроены ключевые слова или данные ещё не рассчитаны." />
            ) : (
                <div
                    className="h-80 w-full rounded-3xl bg-surface-2 p-4"
                    role="img"
                    aria-label="Столбцовая диаграмма упоминаний ключевых слов"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={validData}
                            margin={{ top: 12, right: 12, bottom: 24, left: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="currentColor"
                                strokeDasharray="3 5"
                                className="text-content-light/50"
                            />
                            <XAxis
                                dataKey="keyword"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={validData.length > 4 ? -25 : 0}
                                textAnchor={
                                    validData.length > 4 ? "end" : "middle"
                                }
                                height={validData.length > 4 ? 56 : 32}
                                tick={{
                                    fill: "var(--color-content-secondary)",
                                    fontSize: 12,
                                }}
                            />
                            <YAxis
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                width={36}
                                tick={{
                                    fill: "var(--color-content-secondary)",
                                    fontSize: 12,
                                }}
                            />
                            <Tooltip
                                content={<KeywordTooltip />}
                                cursor={{
                                    fill: "var(--color-surface-1)",
                                    opacity: 0.65,
                                }}
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="count"
                                name="Упоминаний"
                                fill="var(--color-accent-2)"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={56}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </ReportSection>
    );
}
