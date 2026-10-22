import type { ReactNode } from "react";

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
