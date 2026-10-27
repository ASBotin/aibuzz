"use client";

import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { formatNumber } from "@/features/reports/utils";
import type { PieColor, PieSlice } from "./PieMetricCard";

const pieColors: Record<PieColor, string> = {
    accent: "var(--color-accent-2)",
    "accent-1": "var(--color-accent-1)",
    "accent-3": "var(--color-accent-3)",
    muted: "var(--color-surface-3)",
    positive: "#00c995",
    neutral: "#ffb800",
    negative: "#ff5b67",
};

function formatPercent(value: number): string {
    return `${formatNumber(value)}%`;
}

function PieTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number;
        payload?: { color?: string };
    }>;
}) {
    if (!active || !payload?.length) return null;

    const item = payload[0];
    if (typeof item.value !== "number" || !Number.isFinite(item.value)) {
        return null;
    }

    return (
        <div className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2">
                <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.payload?.color }}
                    aria-hidden="true"
                />
                <span className="text-sm text-content-secondary">
                    {item.name}
                </span>
                <span className="text-sm font-semibold tabular-nums text-content-primary">
                    {formatPercent(item.value)}
                </span>
            </div>
        </div>
    );
}

export default function DashboardPieMetricCard({
    title,
    ariaLabel,
    slices,
}: {
    title: string;
    ariaLabel: string;
    slices: PieSlice[];
}) {
    const values = slices.map((slice) =>
        typeof slice.value === "number" && Number.isFinite(slice.value)
            ? Math.max(0, slice.value)
            : 0,
    );
    const chartData = slices.flatMap((slice, index) =>
        values[index] > 0
            ? [
                  {
                      name: slice.label,
                      value: values[index],
                      color: pieColors[slice.color],
                  },
              ]
            : [],
    );

    return (
        <article className="flex min-w-0 flex-col rounded-3xl bg-surface-2 p-5 sm:p-6">
            <h3 className="mb-5 text-sm font-semibold text-content-primary">
                {title}
            </h3>
            <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row">
                <div
                    className="h-52 w-52 shrink-0 sm:h-56 sm:w-56"
                    role="img"
                    aria-label={ariaLabel}
                >
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="92%"
                                    startAngle={-90}
                                    endAngle={270}
                                    paddingAngle={chartData.length > 1 ? 1 : 0}
                                    stroke="var(--color-surface-2)"
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                >
                                    {chartData.map((slice) => (
                                        <Cell
                                            key={slice.name}
                                            fill={slice.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={<PieTooltip />}
                                    isAnimationActive={false}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div
                            className="h-full w-full rounded-full bg-surface-3"
                            aria-hidden="true"
                        />
                    )}
                </div>

                <ul className="w-full min-w-0 space-y-3">
                    {slices.map((slice) => (
                        <li
                            key={slice.label}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <span className="flex min-w-0 items-center gap-2 text-content-secondary">
                                <span
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{
                                        backgroundColor: pieColors[slice.color],
                                    }}
                                    aria-hidden="true"
                                />
                                <span className="break-words">{slice.label}</span>
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-content-primary">
                                {slice.value == null
                                    ? "—"
                                    : formatPercent(slice.value)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </article>
    );
}
