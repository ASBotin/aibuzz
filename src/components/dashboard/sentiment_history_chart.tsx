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

export interface SentimentHistoryPoint {
    reportId: string;
    date: string;
    positive: number;
    neutral: number;
    negative: number;
}

interface SentimentHistoryChartProps {
    data: SentimentHistoryPoint[];
    className?: string;
}

type ChartPoint = SentimentHistoryPoint & { timestamp: number };
type TooltipPayloadItem = { payload?: unknown };

const SERIES = [
    { key: "positive", label: "Позитивная", color: "#00C995" },
    { key: "neutral", label: "Нейтральная", color: "#FFB800" },
    { key: "negative", label: "Негативная", color: "#FF5B67" },
] as const;

type SentimentKey = (typeof SERIES)[number]["key"];

function parseDate(value: string): Date | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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
    const date = parseDate(value);
    return date
        ? new Intl.DateTimeFormat("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
          }).format(date)
        : value;
}

function formatPercent(value: number): string {
    return `${new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 1,
    }).format(value)}%`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function SentimentTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
}) {
    if (!active || !payload?.length) return null;

    const rawPoint = payload[0]?.payload;
    if (!isRecord(rawPoint) || typeof rawPoint.date !== "string") return null;

    const point = rawPoint as unknown as ChartPoint;

    return (
        <div className="min-w-48 rounded-3xl bg-surface-2 px-3.5 py-3">
            <p className="mb-2 text-xs font-medium text-content-secondary">
                {formatTooltipDate(point.date)}
            </p>
            <div className="space-y-2">
                {SERIES.map((series) => {
                    const value = point[series.key as SentimentKey];
                    return (
                        <div
                            key={series.key}
                            className="flex items-center gap-2"
                        >
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: series.color }}
                            />
                            <span className="text-sm text-content-secondary">
                                {series.label}
                            </span>
                            <span className="ml-auto pl-3 text-sm font-semibold tabular-nums text-content-primary">
                                {typeof value === "number" &&
                                Number.isFinite(value)
                                    ? formatPercent(value)
                                    : "—"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function SentimentHistoryChart({
    data,
    className = "",
}: SentimentHistoryChartProps) {
    const points: ChartPoint[] = data.flatMap((point) => {
        const date = parseDate(point.date);
        if (!point.reportId || !date) return [];

        return [
            {
                ...point,
                timestamp: date.getTime(),
                positive: Number.isFinite(point.positive)
                    ? point.positive
                    : NaN,
                neutral: Number.isFinite(point.neutral) ? point.neutral : NaN,
                negative: Number.isFinite(point.negative)
                    ? point.negative
                    : NaN,
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
            aria-labelledby="sentiment-history-title"
            className={`min-h-72 rounded-3xl bg-surface-2 p-4 ${className}`}
        >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <h3
                    id="sentiment-history-title"
                    className="text-sm font-semibold text-content-primary"
                >
                    Изменение тональности упоминания
                </h3>
            </div>

            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
                {SERIES.map((series) => (
                    <div key={series.key} className="flex items-center gap-1.5">
                        <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: series.color }}
                        />
                        <span className="text-xs text-content-secondary">
                            {series.label}
                        </span>
                    </div>
                ))}
            </div>

            {points.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-content-secondary">
                    За выбранный период нет данных о тональности.
                </div>
            ) : (
                <div
                    className="h-52 w-full"
                    role="img"
                    aria-label="График изменения позитивного, нейтрального и негативного сентимента"
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
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                tickFormatter={(value: number) => `${value}%`}
                                tick={{ fontSize: 11, fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                                width={44}
                                className="text-content-secondary"
                            />
                            <Tooltip
                                content={<SentimentTooltip />}
                                cursor={{
                                    stroke: "#94A3B8",
                                    strokeDasharray: "4 4",
                                    strokeWidth: 1,
                                }}
                                isAnimationActive={false}
                                offset={14}
                            />
                            {SERIES.map((series) => (
                                <Line
                                    key={series.key}
                                    type="monotone"
                                    dataKey={series.key}
                                    name={series.label}
                                    stroke={series.color}
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    dot={
                                        points.length <= 24
                                            ? {
                                                  r: 2.5,
                                                  fill: series.color,
                                                  stroke: "#ffffff",
                                                  strokeWidth: 1.5,
                                              }
                                            : false
                                    }
                                    activeDot={{
                                        r: 5,
                                        fill: series.color,
                                        stroke: "#ffffff",
                                        strokeWidth: 2,
                                    }}
                                    connectNulls={false}
                                    isAnimationActive={points.length < 80}
                                    animationDuration={450}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
