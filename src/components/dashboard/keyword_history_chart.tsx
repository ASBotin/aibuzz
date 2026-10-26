"use client";

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export interface KeywordHistoryPoint {
    reportId: string;
    date: string;
    values: Record<string, number>;
}

interface KeywordHistoryChartProps {
    keywords: string[];
    history: KeywordHistoryPoint[];
    className?: string;
}

type ChartPoint = KeywordHistoryPoint & {
    timestamp: number;
    keywordValues: Record<string, number>;
};
type TooltipPayloadItem = { payload?: unknown };

const SERIES_COLORS = [
    "#378eb3",
    "#7c5ce7",
    "#00a884",
    "#e58a2b",
    "#d14f82",
    "#5570c5",
    "#789b32",
    "#cf6250",
    "#298c91",
    "#8d63a8",
];

function formatAxisDate(timestamp: number): string {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit",
              month: "short",
          }).format(date);
}

function formatTooltipDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          }).format(date);
}

function KeywordTooltip({
    active,
    payload,
    keywords,
}: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    keywords: string[];
}) {
    if (!active || !payload?.length) return null;

    const rawPoint = payload[0]?.payload;
    if (
        typeof rawPoint !== "object" ||
        rawPoint === null ||
        !("date" in rawPoint) ||
        !("keywordValues" in rawPoint) ||
        typeof rawPoint.date !== "string" ||
        typeof rawPoint.keywordValues !== "object" ||
        rawPoint.keywordValues === null
    ) {
        return null;
    }

    const values = rawPoint.keywordValues as Record<string, unknown>;

    return (
        <div className="max-h-72 min-w-52 overflow-y-auto rounded-3xl border border-surface-3 bg-surface-2 px-3.5 py-3 shadow-xl shadow-slate-900/10">
            <p className="mb-2 text-xs font-medium text-content-secondary">
                {formatTooltipDate(rawPoint.date)}
            </p>
            <div className="space-y-1.5">
                {keywords.map((keyword, index) => {
                    const count = values[`keyword_${index}`];
                    return (
                        <div
                            key={keyword}
                            className="flex items-center gap-2"
                        >
                            <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                    backgroundColor:
                                        SERIES_COLORS[
                                            index % SERIES_COLORS.length
                                        ],
                                }}
                            />
                            <span className="min-w-0 truncate text-xs text-content-secondary">
                                {keyword}
                            </span>
                            <span className="ml-auto pl-3 text-sm font-semibold tabular-nums text-content-primary">
                                {typeof count === "number" &&
                                Number.isFinite(count)
                                    ? count
                                    : 0}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function KeywordHistoryChart({
    keywords,
    history,
    className = "",
}: KeywordHistoryChartProps) {
    const points: ChartPoint[] = history.flatMap((point) => {
        const timestamp = Date.parse(point.date);
        if (!point.reportId || !Number.isFinite(timestamp)) return [];

        return [
            {
                ...point,
                timestamp,
                keywordValues: Object.fromEntries(
                    keywords.map((keyword, index) => {
                        const count = point.values[keyword];
                        return [
                            `keyword_${index}`,
                            typeof count === "number" &&
                            Number.isFinite(count) &&
                            count >= 0
                                ? count
                                : 0,
                        ];
                    }),
                ),
            },
        ];
    }).sort(
        (left, right) =>
            left.timestamp - right.timestamp ||
            left.reportId.localeCompare(right.reportId),
    );

    const timestamps = points.map((point) => point.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const xDomain: [number | "dataMin", number | "dataMax"] =
        minTimestamp === maxTimestamp
            ? [minTimestamp - 60 * 60 * 1000, maxTimestamp + 60 * 60 * 1000]
            : ["dataMin", "dataMax"];

    return (
        <section
            aria-labelledby="keyword-history-title"
            className={`min-h-72 rounded-3xl bg-surface-2 p-4 ${className}`}
        >
            <div className="mb-3">
                <h3
                    id="keyword-history-title"
                    className="text-sm font-semibold text-content-primary"
                >
                    Упоминания ключевых слов по отчётам
                </h3>
                <p className="mt-1 text-xs text-content-secondary">
                    Количество ответов с упоминанием каждого слова
                </p>
            </div>

            {keywords.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
                    {keywords.map((keyword, index) => (
                        <div
                            key={keyword}
                            className="flex max-w-full items-center gap-1.5"
                        >
                            <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                    backgroundColor:
                                        SERIES_COLORS[
                                            index % SERIES_COLORS.length
                                        ],
                                }}
                            />
                            <span className="truncate text-xs text-content-secondary">
                                {keyword}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {keywords.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-content-secondary">
                    Добавьте ключевые слова в настройках проекта, чтобы видеть
                    их динамику.
                </div>
            ) : points.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-content-secondary">
                    За выбранный период нет завершённых отчётов.
                </div>
            ) : (
                <div
                    className="h-56 w-full"
                    role="img"
                    aria-label="График количества упоминаний ключевых слов по отчётам"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={points}
                            margin={{ top: 8, right: 10, bottom: 0, left: -7 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="currentColor"
                                strokeDasharray="3 5"
                                className="text-content-light/50"
                            />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                scale="time"
                                domain={xDomain}
                                tickFormatter={formatAxisDate}
                                tick={{ fontSize: 11, fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={24}
                                tickMargin={10}
                                className="text-content-secondary"
                            />
                            <YAxis
                                allowDecimals={false}
                                domain={[0, "auto"]}
                                tick={{ fontSize: 11, fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                                width={32}
                                className="text-content-secondary"
                            />
                            <Tooltip
                                content={
                                    <KeywordTooltip keywords={keywords} />
                                }
                                cursor={{
                                    stroke: "#378eb3",
                                    strokeDasharray: "4 4",
                                    strokeWidth: 1,
                                }}
                                isAnimationActive={false}
                                offset={14}
                            />
                            {keywords.map((keyword, index) => (
                                <Line
                                    key={keyword}
                                    type="monotone"
                                    dataKey={`keywordValues.keyword_${index}`}
                                    name={keyword}
                                    stroke={
                                        SERIES_COLORS[
                                            index % SERIES_COLORS.length
                                        ]
                                    }
                                    strokeWidth={2}
                                    dot={
                                        points.length <= 24
                                            ? { r: 3, strokeWidth: 1 }
                                            : false
                                    }
                                    activeDot={{ r: 5 }}
                                    isAnimationActive={points.length < 80}
                                    animationDuration={500}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
