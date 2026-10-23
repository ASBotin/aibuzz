"use client";

import { useId } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export interface ShareOfVoiceHistoryPoint {
    /** Unique report ID; unlike a date, it stays unique when reports run close together. */
    reportId: string;
    /** The report timestamp in ISO format. */
    date: string;
    /** Final SoV stored on reports.share_of_voice, on a 0–100 scale. */
    value: number | null;
    /** Per-brand values from reports.competitors_breakdown, kept for other charts. */
    values: Record<string, number>;
}

interface ShareOfVoiceHistoryChartProps {
    data: ShareOfVoiceHistoryPoint[];
    className?: string;
}

function parseTimestamp(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatAxisTimestamp(value: number): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit",
              month: "short",
          }).format(date);
}

function formatTooltipDate(value: string): string {
    const date = parseTimestamp(value);
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

function reportWord(count: number): string {
    const mod100 = count % 100;
    const mod10 = count % 10;
    if (mod100 >= 11 && mod100 <= 14) return "отчётов";
    if (mod10 === 1) return "отчёт";
    if (mod10 >= 2 && mod10 <= 4) return "отчёта";
    return "отчётов";
}

function ShareOfVoiceTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload?: unknown }>;
}) {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload as ShareOfVoiceHistoryPoint | undefined;
    if (
        !point ||
        typeof point.value !== "number" ||
        !Number.isFinite(point.value)
    ) {
        return null;
    }

    return (
        <div className="min-w-44 rounded-3xl border border-slate-200 bg-white px-3.5 py-3 shadow-xl shadow-slate-900/10">
            <p className="text-xs font-medium text-slate-500">
                {formatTooltipDate(point.date)}
            </p>
            <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-2" />
                <span className="text-sm text-slate-600 ">SoV</span>
                <span className="ml-auto text-base font-semibold tabular-nums text-slate-950">
                    {formatPercent(point.value)}
                </span>
            </div>
        </div>
    );
}

export default function ShareOfVoiceHistoryChart({
    data,
    className = "",
}: ShareOfVoiceHistoryChartProps) {
    const reactId = useId();
    const gradientId = `sov-area-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const chartPoints = data.flatMap((point) => {
        const timestamp = Date.parse(point.date);
        if (
            !point.reportId ||
            !Number.isFinite(timestamp) ||
            typeof point.value !== "number" ||
            !Number.isFinite(point.value)
        ) {
            return [];
        }
        return [{ ...point, timestamp }];
    });
    const timestamps = chartPoints.map((point) => point.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    const xDomain: [number | "dataMin", number | "dataMax"] =
        minTimestamp === maxTimestamp
            ? [minTimestamp - 60 * 60 * 1000, maxTimestamp + 60 * 60 * 1000]
            : ["dataMin", "dataMax"];

    return (
        <section
            aria-labelledby="share-of-voice-history-title"
            className={`min-h-72 rounded-3xl bg-surface-2 p-4 ${className}`}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3
                        id="share-of-voice-history-title"
                        className="text-sm font-semibold text-content-primary"
                    >
                        Изменение доли упоминаний по исследованиям
                    </h3>
                </div>
                {chartPoints.length > 0 && (
                    <div className="shrink-0 rounded-full bg-surface-1/70 px-2.5 py-1.5 text-xs font-medium text-content-secondary">
                        {chartPoints.length} {reportWord(chartPoints.length)}
                    </div>
                )}
            </div>

            {chartPoints.length === 0 ? (
                <div className="flex h-52 items-center justify-center rounded-lg text-content-secondary text-sm">
                    За выбранный период нет отчётов с рассчитанным SoV.
                </div>
            ) : (
                <div
                    className="h-56 w-full"
                    role="img"
                    aria-label="График изменения Share of Voice по отчётам"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartPoints}
                            margin={{ top: 10, right: 8, bottom: 0, left: -7 }}
                        >
                            <defs>
                                <linearGradient
                                    id={gradientId}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#378eb3"
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#65c0c3"
                                        stopOpacity={0.015}
                                    />
                                </linearGradient>
                            </defs>
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
                                tickFormatter={formatAxisTimestamp}
                                tick={{ fontSize: 11, fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={24}
                                tickMargin={10}
                                className="text-content-secondary"
                            />
                            <YAxis
                                domain={[0, 100]}
                                tickFormatter={(value: number) => `${value}%`}
                                tick={{ fontSize: 11, fill: "currentColor" }}
                                tickLine={false}
                                axisLine={false}
                                tickCount={5}
                                width={44}
                                className="text-content-secondary"
                            />
                            <Tooltip
                                content={<ShareOfVoiceTooltip />}
                                cursor={{
                                    stroke: "#378eb3",
                                    strokeDasharray: "4 4",
                                    strokeWidth: 1,
                                }}
                                isAnimationActive={false}
                                offset={14}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                name="SoV"
                                stroke="#378eb3"
                                strokeWidth={2.5}
                                fill={`url(#${gradientId})`}
                                connectNulls={false}
                                dot={
                                    chartPoints.length <= 24
                                        ? {
                                              r: 3,
                                              fill: "#378eb3",
                                              stroke: "#ffffff",
                                              strokeWidth: 1.5,
                                          }
                                        : false
                                }
                                activeDot={{
                                    r: 5.5,
                                    fill: "#378eb3",
                                    stroke: "#ffffff",
                                    strokeWidth: 2.5,
                                }}
                                isAnimationActive={chartPoints.length < 80}
                                animationDuration={500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
