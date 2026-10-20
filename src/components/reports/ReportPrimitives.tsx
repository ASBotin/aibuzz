import type { ReactNode } from "react";
import { formatNumber } from "@/features/reports/utils";

export function ReportSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold text-content-primary">
                    {title}
                </h2>
                {description && (
                    <p className="text-sm text-content-secondary">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

export function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-surface-3 bg-surface-2 px-4 py-6 text-sm text-content-secondary">
            {text}
        </div>
    );
}

export function MetricCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail?: string;
}) {
    return (
        <div className="rounded-2xl bg-surface-2 border border-surface-3 p-4 min-w-0">
            <div className="text-xs text-content-secondary mb-2">{label}</div>
            <div className="text-2xl font-semibold tracking-tight text-content-primary break-words">
                {value}
            </div>
            {detail && (
                <div className="text-xs text-content-light mt-1">{detail}</div>
            )}
        </div>
    );
}

type PieColor = "accent" | "muted" | "positive" | "neutral" | "negative";

type PieSlice = {
    label: string;
    value: number | null;
    color: PieColor;
};

const pieColorClasses: Record<PieColor, { fill: string; swatch: string }> = {
    accent: { fill: "fill-accent-2", swatch: "bg-accent-2" },
    muted: { fill: "fill-surface-3", swatch: "bg-surface-3" },
    positive: { fill: "fill-emerald-400", swatch: "bg-emerald-400" },
    neutral: { fill: "fill-amber-400", swatch: "bg-amber-400" },
    negative: { fill: "fill-red-400", swatch: "bg-red-400" },
};

function pieSlicePath(startAngle: number, endAngle: number): string {
    const center = 60;
    const radius = 52;
    const startRadians = (startAngle * Math.PI) / 180;
    const endRadians = (endAngle * Math.PI) / 180;
    const startX = center + radius * Math.cos(startRadians);
    const startY = center + radius * Math.sin(startRadians);
    const endX = center + radius * Math.cos(endRadians);
    const endY = center + radius * Math.sin(endRadians);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
}

export function PieMetricCard({
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
    const total = values.reduce((sum, value) => sum + value, 0);
    const nonZeroCount = values.filter((value) => value > 0).length;
    let cursor = 0;

    return (
        <article className="rounded-2xl border border-surface-3 bg-surface-1 p-5 min-w-0">
            <h3 className="text-sm font-semibold text-content-primary mb-5">
                {title}
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-5">
                <svg
                    viewBox="0 0 120 120"
                    className="h-32 w-32 shrink-0"
                    role="img"
                    aria-label={ariaLabel}
                >
                    {total <= 0 ? (
                        <circle
                            cx="60"
                            cy="60"
                            r="52"
                            className="fill-surface-3"
                        />
                    ) : nonZeroCount === 1 ? (
                        <circle
                            cx="60"
                            cy="60"
                            r="52"
                            className={
                                pieColorClasses[
                                    slices[
                                        values.findIndex((value) => value > 0)
                                    ].color
                                ].fill
                            }
                        />
                    ) : (
                        slices.map((slice, index) => {
                            const value = values[index];
                            if (value <= 0) return null;

                            const startAngle = (cursor / total) * 360 - 90;
                            cursor += value;
                            const endAngle = (cursor / total) * 360 - 90;

                            return (
                                <path
                                    key={slice.label}
                                    d={pieSlicePath(startAngle, endAngle)}
                                    className={
                                        pieColorClasses[slice.color].fill
                                    }
                                    stroke="var(--color-surface-1)"
                                    strokeWidth="1.5"
                                />
                            );
                        })
                    )}
                </svg>

                <ul className="w-full min-w-0 space-y-3">
                    {slices.map((slice) => (
                        <li
                            key={slice.label}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <span className="flex items-center gap-2 min-w-0 text-content-secondary">
                                <span
                                    className={`h-2.5 w-2.5 rounded-sm shrink-0 ${pieColorClasses[slice.color].swatch}`}
                                    aria-hidden="true"
                                />
                                <span className="break-words">
                                    {slice.label}
                                </span>
                            </span>
                            <span className="font-semibold text-content-primary tabular-nums shrink-0">
                                {slice.value == null
                                    ? "—"
                                    : `${formatNumber(slice.value)}%`}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </article>
    );
}

export function StringList({
    items,
    emptyText,
    tone = "default",
}: {
    items: string[] | null | undefined;
    emptyText: string;
    tone?: "default" | "positive" | "negative";
}) {
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    if (values.length === 0) {
        return <p className="text-sm text-content-light italic">{emptyText}</p>;
    }

    const marker =
        tone === "positive"
            ? "text-emerald-400"
            : tone === "negative"
              ? "text-red-400"
              : "text-content-light";
    return (
        <ul className="space-y-2">
            {values.map((value, index) => (
                <li
                    key={`${value}-${index}`}
                    className="flex gap-2 text-sm text-content-secondary leading-relaxed"
                >
                    <span className={`${marker} shrink-0`}>•</span>
                    <span>{value}</span>
                </li>
            ))}
        </ul>
    );
}
