import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ExportPdfButton from "./ExportPdfButton";

const TEST_USER_ID =
    process.env.NEXT_PUBLIC_TEST_USER_ID ||
    "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PageProps {
    params: Promise<{ id: string; name: string }>;
}

export const revalidate = 0;

type H2HItem = {
    brand: string;
    is_target: boolean;
    average_rank: number | null;
    pros?: string[];
    cons?: string[];
};

type CompetitorItem = {
    name: string;
    sov: number;
    average_rank: number | null;
    mentions_count: number;
    is_target: boolean;
};

type SourceItem = {
    domain: string;
    count: number;
    percentage: number;
    mentions_target_brand: boolean;
};

type BrandProsCons = { pros?: string[]; cons?: string[] };

type PromptResult = {
    id: string;
    prompt_text?: string | null;
    prompt_category?: string | null;
    provider?: string | null;
    raw_text?: string | null;
    raw_citations?: string[] | null;
    is_excluded_from_stats?: boolean | null;
    brand_mentioned?: boolean | null;
    brands_ranking?: Record<string, number | null> | null;
    sentiment?: string | null;
    found_competitors?: string[] | null;
    extracted_domains?: string[] | null;
    brands_pros_cons?: Record<string, BrandProsCons> | null;
};

function formatNumber(value: unknown, maximumFractionDigits = 1): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return value.toLocaleString("ru-RU", { maximumFractionDigits });
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function sentimentLabel(value: string | null | undefined): string {
    switch (value) {
        case "positive":
            return "Позитивный";
        case "neutral":
            return "Нейтральный";
        case "negative":
            return "Негативный";
        case "not_found":
            return "Не определён";
        default:
            return value || "—";
    }
}

function categoryLabel(value: string | null | undefined): string {
    switch (value) {
        case "main":
            return "Основные запросы";
        case "brand_direct":
            return "Прямые запросы";
        case "head_to_head":
            return "Сравнение с конкурентами";
        default:
            return value || "Категория не указана";
    }
}

function statusLabel(value: string | null | undefined): string {
    switch (value) {
        case "completed":
            return "Завершён";
        case "processing":
            return "Выполняется";
        case "failed":
            return "Ошибка";
        default:
            return value || "Неизвестен";
    }
}

function externalHref(value: string): string | null {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^(www\.)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return null;
}

function normalizeBrandKey(value: string): string {
    return value
        .normalize("NFKC")
        .toLocaleLowerCase("ru-RU")
        .replace(/ё/g, "е")
        .replace(/[^\p{L}\p{N}]/gu, "");
}

function Section({
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

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-surface-3 bg-surface-2 px-4 py-6 text-sm text-content-secondary">
            {text}
        </div>
    );
}

function Tag({
    children,
    tone = "default",
}: {
    children: ReactNode;
    tone?:
        | "default"
        | "accent"
        | "transparent"
        | "positive"
        | "negative"
        | "warning";
}) {
    const styles = {
        default: "bg-surface-3 text-content-secondary",
        accent: "bg-accent-2/10 text-accent-2 border border-accent-2/20",
        positive: "bg-emerald-500/10 text-emerald-400",
        negative: "bg-red-500/10 text-red-400",
        warning: "bg-amber-500/10 text-amber-400",
        transparent: "bg-surface-2/10 text-white/80",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}
        >
            {children}
        </span>
    );
}

function MetricCard({
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

function PieMetricCard({
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

function StringList({
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

export default async function ReportPage({ params }: PageProps) {
    const { id: projectId, name: reportId } = await params;

    const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name, niche")
        .eq("id", projectId)
        .eq("user_id", TEST_USER_ID)
        .single();

    if (projectError || !project) notFound();

    const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .eq("project_id", projectId)
        .single();

    if (reportError || !report) notFound();

    const { data: rawPromptResults } = await supabase
        .from("prompt_results")
        .select("*")
        .eq("report_id", reportId);

    const promptResults = (rawPromptResults || []) as PromptResult[];
    const h2hItems = (
        Array.isArray(report.h2h_matrix) ? report.h2h_matrix : []
    ) as H2HItem[];
    const competitorItems = (
        Array.isArray(report.competitors_breakdown)
            ? report.competitors_breakdown
            : []
    ) as CompetitorItem[];
    const topSources = (
        Array.isArray(report.top_sources) ? report.top_sources : []
    ) as SourceItem[];
    const hasUnavailableOriginalData = promptResults.some((result) => {
        const hasPromptText = Boolean(result.prompt_text?.trim());
        const hasLinks = Boolean(
            result.raw_citations?.some((value) => value.trim()) ||
            result.extracted_domains?.some((value) => value.trim()),
        );
        return !hasPromptText || !hasLinks;
    });
    const sentiment = report.sentiment_index as {
        positive?: number;
        neutral?: number;
        negative?: number;
    } | null;
    const shareOfVoiceRaw =
        typeof report.share_of_voice === "number" &&
        Number.isFinite(report.share_of_voice)
            ? report.share_of_voice
            : null;
    const shareOfVoice =
        shareOfVoiceRaw == null
            ? null
            : Math.min(100, Math.max(0, shareOfVoiceRaw));

    const statusTone =
        report.status === "completed"
            ? "positive"
            : report.status === "failed"
              ? "negative"
              : "warning";

    return (
        <main className="report-print-root max-w-5xl mx-auto py-8 md:py-12 px-4 space-y-8">
            <style>{`
                @page {
                    size: A4;
                    margin: 12mm;
                }

                @media print {
                    html, body {
                        background: #ffffff !important;
                        color: #111827 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .no-print {
                        display: none !important;
                    }

                    main.report-print-root {
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        gap: 1.25rem !important;
                        color: #111827 !important;
                    }

                    .report-print-root header {
                        background: #ffffff !important;
                        background-image: none !important;
                        border: 1px solid #d1d5db !important;
                        color: #111827 !important;
                    }

                    .report-print-root .bg-surface-1,
                    .report-print-root .bg-surface-2 {
                        background: #ffffff !important;
                    }

                    .report-print-root .bg-surface-3 {
                        background: #f3f4f6 !important;
                    }

                    .report-print-root .text-white,
                    .report-print-root .text-content-primary {
                        color: #111827 !important;
                    }

                    .report-print-root .text-content-secondary {
                        color: #4b5563 !important;
                    }

                    .report-print-root .text-content-light {
                        color: #6b7280 !important;
                    }

                    .report-print-root .text-emerald-400 {
                        color: #047857 !important;
                    }

                    .report-print-root .text-red-400 {
                        color: #b91c1c !important;
                    }

                    .report-print-root .text-amber-400 {
                        color: #b45309 !important;
                    }

                    .report-print-root .border-surface-3 {
                        border-color: #e5e7eb !important;
                    }

                    .report-print-root a {
                        color: #1d4ed8 !important;
                        text-decoration: none !important;
                    }

                    .report-print-root svg {
                        max-width: 100%;
                    }

                    .report-print-root section {
                        break-inside: auto;
                    }

                    .report-print-root article,
                    .report-print-root table {
                        break-inside: avoid;
                    }

                    /* Include expandable citations and source answers in the PDF. */
                    .report-print-root details:not([open]) > :not(summary) {
                        display: block !important;
                    }

                    .report-print-root details > summary {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <Link
                    href={`/projects/${projectId}/reports`}
                    className="inline-flex items-center gap-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
                >
                    <span aria-hidden="true">←</span> К списку отчётов
                </Link>
                <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-content-secondary hover:text-accent-2 transition-colors"
                >
                    К проекту →
                </Link>
            </div>

            <header className="rounded-3xl bg-linear-to-r from-accent-1 via-accent-2 to-accent-3 text-white p-6 md:p-8 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Tag tone={statusTone}>
                                {statusLabel(report.status)}
                            </Tag>
                            {project.niche && (
                                <Tag tone="transparent">{project.niche}</Tag>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                            Отчёт по проекту {project.name}
                        </h1>
                        <p className="text-sm text-white">
                            {report.updated_at
                                ? `Обновлён: ${formatDate(report.updated_at)}`
                                : `Создан: ${formatDate(report.created_at)}`}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-start">
                        <ExportPdfButton />
                    </div>
                </div>
                {report.error_message && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                        <div className="font-semibold mb-1">
                            Ошибка обработки
                        </div>
                        <p className="whitespace-pre-wrap break-words">
                            {report.error_message}
                        </p>
                    </div>
                )}
            </header>

            <Section
                title="Ключевые показатели"
                description="Основные числовые результаты исследования."
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <PieMetricCard
                            title="Доля упоминаний"
                            ariaLabel="Круговая диаграмма доли упоминаний бренда"
                            slices={[
                                {
                                    label: `${project.name} упомянут`,
                                    value: shareOfVoice,
                                    color: "accent",
                                },
                                {
                                    label: `${project.name} не упомянут`,
                                    value:
                                        shareOfVoice == null
                                            ? null
                                            : 100 - shareOfVoice,
                                    color: "muted",
                                },
                            ]}
                        />
                        <PieMetricCard
                            title="Индекс тональности"
                            ariaLabel="Круговая диаграмма позитивной, нейтральной и негативной тональности"
                            slices={[
                                {
                                    label: "Позитивная",
                                    value:
                                        sentiment &&
                                        typeof sentiment === "object"
                                            ? (sentiment.positive ?? null)
                                            : null,
                                    color: "positive",
                                },
                                {
                                    label: "Нейтральная",
                                    value:
                                        sentiment &&
                                        typeof sentiment === "object"
                                            ? (sentiment.neutral ?? null)
                                            : null,
                                    color: "neutral",
                                },
                                {
                                    label: "Негативная",
                                    value:
                                        sentiment &&
                                        typeof sentiment === "object"
                                            ? (sentiment.negative ?? null)
                                            : null,
                                    color: "negative",
                                },
                            ]}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <MetricCard
                            label="Средний ранг"
                            value={formatNumber(report.average_rank)}
                            detail="Меньше — лучше позиция в выдаче"
                        />
                        <MetricCard
                            label="Обработано ответов"
                            value={String(promptResults.length)}
                            detail="Результаты, сохранённые для этого отчёта"
                        />
                    </div>
                </div>
            </Section>

            <Section title="Итоги анализа">
                {report.ai_summary ? (
                    <div className="rounded-3xl bg-surface-1 p-6 md:p-7">
                        <h3 className="text-sm font-semibold text-content-primary mb-3">
                            Общее резюме
                        </h3>
                        <div className="text-sm md:text-base text-content-secondary whitespace-pre-line leading-7">
                            {report.ai_summary}
                        </div>
                    </div>
                ) : (
                    <EmptyState text="Общее резюме пока не сформировано." />
                )}

                {report.brand_direct_summary && (
                    <div className="rounded-3xl bg-surface-1 p-6 md:p-7">
                        <h3 className="text-sm font-semibold text-content-primary mb-3">
                            Прямые запросы о бренде
                        </h3>
                        <div className="text-sm text-content-secondary whitespace-pre-line leading-7">
                            {report.brand_direct_summary}
                        </div>
                    </div>
                )}

                {typeof report.h2h_summary === "string" &&
                    report.h2h_summary.trim() && (
                        <div className="rounded-3xl bg-surface-1 p-6 md:p-7">
                            <h3 className="text-sm font-semibold text-content-primary mb-3">
                                Итог сравнения с конкурентами
                            </h3>
                            <div className="text-sm text-content-secondary whitespace-pre-line leading-7">
                                {report.h2h_summary}
                            </div>
                        </div>
                    )}
            </Section>

            <Section
                title="Сравнение брендов"
                description="Позиции и сильные/слабые стороны в запросах формата Head-to-Head."
            >
                {h2hItems.length > 0 ? (
                    <div className="space-y-3">
                        {h2hItems.map((item, index) => (
                            <article
                                key={`${item.brand}-${index}`}
                                className={`rounded-2xl border p-5 md:p-6 ${item.is_target ? "border-accent-2/40 bg-accent-2/5" : "border-surface-3 bg-surface-1"}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm font-semibold text-content-primary">
                                            {index + 1}
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
                                    <div className="rounded-xl bg-surface-2 px-3 py-2">
                                        <div className="text-xs text-content-light">
                                            Средний ранг
                                        </div>
                                        <div className="font-semibold text-content-primary">
                                            {formatNumber(item.average_rank)}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-emerald-400">
                                            Сильные стороны
                                        </h4>
                                        <StringList
                                            items={item.pros}
                                            emptyText="Не выявлены или не указаны."
                                            tone="positive"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-red-400">
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
            </Section>

            <Section
                title="Конкурентное окружение"
                description="Доля присутствия, средний ранг и количество упоминаний брендов в учитываемых запросах."
            >
                {competitorItems.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl bg-surface-1">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead className="bg-surface-3 text-content-secondary text-left">
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
                                    {competitorItems.map((item, index) => (
                                        <tr
                                            key={`${item.name}-${index}`}
                                            className="border-t border-surface-3"
                                        >
                                            <td className="px-4 py-3 text-content-primary">
                                                <div className="flex items-center gap-2">
                                                    <span className="break-words">
                                                        {item.name}
                                                    </span>
                                                    {item.name ===
                                                        project.name && (
                                                        <Tag tone="accent">
                                                            Ваш бренд
                                                        </Tag>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-content-primary tabular-nums">
                                                {formatNumber(item.sov)}%
                                            </td>
                                            <td className="px-4 py-3 text-right text-content-secondary tabular-nums">
                                                {formatNumber(
                                                    item.average_rank,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-content-secondary tabular-nums">
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
            </Section>

            <Section
                title="Источники"
                description="Домены, найденные в цитатах и извлечённых источниках."
            >
                <div className="rounded-2xl bg-surface-1 p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-content-secondary">
                            Доля запросов с источниками
                        </div>
                        <div className="text-2xl font-semibold text-content-primary mt-1">
                            {formatNumber(report.citation_rate)}%
                        </div>
                    </div>
                </div>
                {topSources.length > 0 ? (
                    <div className="space-y-2">
                        {topSources.map((source, index) => {
                            const href = externalHref(source.domain);
                            return (
                                <div
                                    key={`${source.domain}-${index}`}
                                    className="rounded-2xl bg-surface-1 p-4 flex flex-wrap items-center justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-xl bg-surface-3 flex items-center justify-center text-xs text-content-secondary shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0">
                                            {href ? (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm font-medium text-content-primary hover:text-accent-2 transition-colors break-all"
                                                >
                                                    {source.domain}
                                                </a>
                                            ) : (
                                                <div className="text-sm font-medium text-content-primary break-all">
                                                    {source.domain}
                                                </div>
                                            )}
                                            <div className="text-xs text-content-secondary mt-1">
                                                {formatNumber(source.count, 0)}{" "}
                                                упоминаний ·{" "}
                                                {formatNumber(
                                                    source.percentage,
                                                )}
                                                % запросов
                                            </div>
                                        </div>
                                    </div>
                                    {source.mentions_target_brand ? (
                                        <Tag tone="positive">
                                            Есть упоминание бренда
                                        </Tag>
                                    ) : (
                                        <Tag>Без упоминания бренда</Tag>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState text="Цитируемые источники не найдены." />
                )}
            </Section>

            <Section
                title={`Результаты по промптам (${promptResults.length})`}
                description="Детализация ответов, извлечённых метрик, цитат и исходного текста. Исходные тексты ответов нейросетей и ссылки на источники хранятся неделю, позже очищаются. Вы будете иметь доступ к остальной информации."
            >
                {hasUnavailableOriginalData && (
                    <EmptyState text="Исходные промпты и ссылки хранятся ограниченное время, они были очищены." />
                )}
                {promptResults.length > 0 ? (
                    <div className="space-y-3">
                        {promptResults.map((result, index) => {
                            const extractedDomains = (
                                result.extracted_domains || []
                            ).filter((value) => value.trim());
                            const citations = (
                                result.raw_citations || []
                            ).filter((value) => value.trim());
                            const hasLinks =
                                extractedDomains.length > 0 ||
                                citations.length > 0;
                            const targetProsCons = Object.entries(
                                result.brands_pros_cons || {},
                            ).find(
                                ([brand]) =>
                                    normalizeBrandKey(brand) ===
                                    normalizeBrandKey(project.name),
                            )?.[1];

                            return (
                                <article
                                    key={result.id}
                                    className="rounded-2xl bg-surface-1 p-5 md:p-6 space-y-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Tag>{`Запрос ${index + 1}`}</Tag>
                                            <Tag tone="accent">
                                                {categoryLabel(
                                                    result.prompt_category,
                                                )}
                                            </Tag>
                                            {result.provider && (
                                                <Tag>{result.provider}</Tag>
                                            )}
                                        </div>
                                        <div className="text-xs text-content-light break-all">
                                            ID: {result.id}
                                        </div>
                                    </div>

                                    {result.prompt_text?.trim() && (
                                        <h3 className="text-base font-medium text-content-primary leading-relaxed">
                                            {result.prompt_text}
                                        </h3>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-xl bg-surface-2 p-3">
                                            <div className="text-xs text-content-secondary">
                                                Целевой бренд упомянут
                                            </div>
                                            <div className="text-sm font-semibold text-content-primary mt-1">
                                                {result.brand_mentioned == null
                                                    ? "Не определено"
                                                    : result.brand_mentioned
                                                      ? "Да"
                                                      : "Нет"}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-surface-2 p-3">
                                            <div className="text-xs text-content-secondary">
                                                Тональность
                                            </div>
                                            <div className="text-sm font-semibold text-content-primary mt-1">
                                                {sentimentLabel(
                                                    result.sentiment,
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-surface-2 p-3">
                                            <div className="text-xs text-content-secondary">
                                                Найдено конкурентов
                                            </div>
                                            <div className="text-sm font-semibold text-content-primary mt-1">
                                                {result.found_competitors
                                                    ?.length || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {result.found_competitors &&
                                        result.found_competitors.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-semibold text-content-primary">
                                                    Найденные бренды и
                                                    конкуренты
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.found_competitors.map(
                                                        (brand, i) => (
                                                            <Tag
                                                                key={`${brand}-${i}`}
                                                            >
                                                                {brand}
                                                            </Tag>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {targetProsCons && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-content-primary">
                                                Плюсы и минусы
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-surface-2 p-4 space-y-2">
                                                    <div className="text-xs font-semibold text-emerald-400">
                                                        Плюсы
                                                    </div>
                                                    <StringList
                                                        items={
                                                            targetProsCons.pros
                                                        }
                                                        emptyText="Не указаны"
                                                        tone="positive"
                                                    />
                                                </div>
                                                <div className="rounded-xl bg-surface-2 p-4 space-y-2">
                                                    <div className="text-xs font-semibold text-red-400">
                                                        Минусы
                                                    </div>
                                                    <StringList
                                                        items={
                                                            targetProsCons.cons
                                                        }
                                                        emptyText="Не указаны"
                                                        tone="negative"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hasLinks && (
                                        <details className="group rounded-xl bg-surface-2 overflow-hidden">
                                            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-content-secondary hover:text-content-primary select-none">
                                                Показать цитаты и ссылки (
                                                {citations.length +
                                                    extractedDomains.length}
                                                )
                                            </summary>
                                            <div className="border-t border-surface-3 p-4 space-y-4">
                                                {extractedDomains.length >
                                                    0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold text-content-primary">
                                                            Извлечённые домены
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {extractedDomains.map(
                                                                (domain, i) => {
                                                                    const href =
                                                                        externalHref(
                                                                            domain,
                                                                        );
                                                                    return href ? (
                                                                        <a
                                                                            key={`${domain}-${i}`}
                                                                            href={
                                                                                href
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="rounded-full bg-surface-1 px-3 py-1.5 text-xs text-accent-2 hover:bg-surface-3 break-all"
                                                                        >
                                                                            {
                                                                                domain
                                                                            }
                                                                        </a>
                                                                    ) : (
                                                                        <Tag
                                                                            key={`${domain}-${i}`}
                                                                        >
                                                                            {
                                                                                domain
                                                                            }
                                                                        </Tag>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {citations.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold text-content-primary">
                                                            Цитаты и ссылки
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {citations.map(
                                                                (
                                                                    citation,
                                                                    i,
                                                                ) => {
                                                                    const href =
                                                                        externalHref(
                                                                            citation,
                                                                        );
                                                                    return (
                                                                        <li
                                                                            key={`${citation}-${i}`}
                                                                            className="rounded-xl bg-surface-1 px-3 py-2 text-xs break-all"
                                                                        >
                                                                            {href ? (
                                                                                <a
                                                                                    href={
                                                                                        href
                                                                                    }
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="text-accent-2 hover:underline"
                                                                                >
                                                                                    {
                                                                                        citation
                                                                                    }
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-content-secondary">
                                                                                    {
                                                                                        citation
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                },
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    )}

                                    <details className="group rounded-xl bg-surface-2 overflow-hidden">
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-content-secondary hover:text-content-primary select-none">
                                            Показать исходный ответ
                                        </summary>
                                        <div className="border-t border-surface-3 p-4 text-sm text-content-secondary whitespace-pre-wrap leading-6 break-words">
                                            {result.raw_text ||
                                                "Исходный ответ отсутствует."}
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState text="Результаты по промптам не найдены." />
                )}
            </Section>

            <div className="no-print pt-2 flex justify-center">
                <Link
                    href={`/projects/${projectId}/reports`}
                    className="inline-flex items-center justify-center rounded-full bg-surface-3 px-6 py-3 text-sm font-medium text-content-primary hover:bg-surface-2 transition-colors"
                >
                    Вернуться к отчётам
                </Link>
            </div>
        </main>
    );
}
