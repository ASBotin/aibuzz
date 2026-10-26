"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import SentimentPieChart from "./sentiment_pie";
import SovPieChart from "./sov_pie";
import ShareOfVoiceHistoryChart, {
    type ShareOfVoiceHistoryPoint,
} from "./sov_history_chart";
import SentimentHistoryChart, {
    type SentimentHistoryPoint,
} from "./sentiment_history_chart";
import StatusNotice from "@/components/ui/StatusNotice";

export type DashboardPeriod = "all_time" | "range" | "since_settings_change";
export type Sentiment = "positive" | "neutral" | "negative";

export interface ShareOfVoiceDistributionItem {
    brand: string;
    value: number;
    isTarget?: boolean;
}

export interface SentimentDistributionItem {
    sentiment: Sentiment;
    value: number;
}

export type SentimentHistoryItem = SentimentHistoryPoint;

export interface DashboardResponse {
    promptsTotal: number;
    shareOfVoice: {
        distribution: ShareOfVoiceDistributionItem[];
        history: ShareOfVoiceHistoryPoint[];
    };
    sentiment: {
        distribution: SentimentDistributionItem[];
        history: SentimentHistoryItem[];
    };
}

export interface DashboardChartComponents {
    shareOfVoicePie: ComponentType<{
        data: ShareOfVoiceDistributionItem[];
    }>;
    shareOfVoiceHistory: ComponentType<{
        data: ShareOfVoiceHistoryPoint[];
    }>;
    sentimentPie: ComponentType<{
        data: SentimentDistributionItem[];
    }>;
    sentimentHistory: ComponentType<{
        data: SentimentHistoryItem[];
    }>;
}

interface DashboardProps {
    projectId: string;
    endpoint?: string;
    chartComponents?: Partial<DashboardChartComponents>;
    className?: string;
}

function toLocalDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);

    return {
        from: toLocalDateInputValue(from),
        to: toLocalDateInputValue(to),
    };
}

function isDashboardResponse(value: unknown): value is DashboardResponse {
    if (typeof value !== "object" || value === null) return false;

    const response = value as Record<string, unknown>;
    if (
        typeof response.promptsTotal !== "number" ||
        !Number.isFinite(response.promptsTotal) ||
        response.promptsTotal < 0
    ) {
        return false;
    }

    const shareOfVoice = response.shareOfVoice as
        Record<string, unknown> | undefined;
    const sentiment = response.sentiment as Record<string, unknown> | undefined;

    return (
        Array.isArray(shareOfVoice?.distribution) &&
        Array.isArray(shareOfVoice?.history) &&
        Array.isArray(sentiment?.distribution) &&
        Array.isArray(sentiment?.history)
    );
}

export default function Dashboard({
    projectId,
    endpoint,
    chartComponents,
    className = "",
}: DashboardProps) {
    const defaultRange = useMemo(() => getDefaultDateRange(), []);
    const [period, setPeriod] = useState<DashboardPeriod>("all_time");
    const [from, setFrom] = useState(defaultRange.from);
    const [to, setTo] = useState(defaultRange.to);
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const invalidRange = period === "range" && (!from || !to || from > to);
    const validationError = !projectId
        ? "Не указан идентификатор проекта."
        : invalidRange
          ? "Укажите корректный период: дата начала не должна быть позже даты окончания."
          : null;

    useEffect(() => {
        if (!projectId || invalidRange) return;

        const controller = new AbortController();

        async function loadDashboard() {
            setIsLoading(true);
            setError(null);

            try {
                const baseUrl =
                    endpoint ??
                    `/api/projects/${encodeURIComponent(projectId)}/dashboard`;
                const url = new URL(baseUrl, window.location.origin);
                url.searchParams.set("period", period);

                if (period === "range") {
                    url.searchParams.set("from", from);
                    url.searchParams.set("to", to);
                }

                const response = await fetch(url.toString(), {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    credentials: "same-origin",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `Не удалось загрузить статистику (HTTP ${response.status}).`,
                    );
                }

                const result: unknown = await response.json();
                if (!isDashboardResponse(result)) {
                    throw new Error(
                        "Сервер вернул данные в неожиданном формате.",
                    );
                }

                setData(result);
            } catch (cause) {
                if (cause instanceof Error && cause.name === "AbortError")
                    return;
                setData(null);
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "Не удалось загрузить статистику проекта.",
                );
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }

        void loadDashboard();
        return () => controller.abort();
    }, [projectId, endpoint, period, from, to, invalidRange]);

    const ShareOfVoicePie = chartComponents?.shareOfVoicePie ?? SovPieChart;
    const ShareOfVoiceHistory =
        chartComponents?.shareOfVoiceHistory ?? ShareOfVoiceHistoryChart;
    const SentimentPie = chartComponents?.sentimentPie ?? SentimentPieChart;
    const SentimentHistory =
        chartComponents?.sentimentHistory ?? SentimentHistoryChart;

    const periodButtonClass = (selected: boolean) =>
        [
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            selected
                ? "bg-surface-2 text-content-primary"
                : "text-content-secondary",
        ].join(" ");

    return (
        <section
            aria-labelledby="project-dashboard-title"
            className={`rounded-3xl bg-surface-1 p-6 md:p-8 ${className}`}
        >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h2
                        id="project-dashboard-title"
                        className="text-xl font-semibold text-content-primary"
                    >
                        Сводка проекта
                    </h2>
                    <p className="mt-1 text-sm text-content-secondary">
                        Сводная статистика по результатам исследований
                    </p>
                </div>

                <div className="flex flex-wrap gap-1 rounded-full bg-surface-3 p-1">
                    <button
                        type="button"
                        aria-pressed={period === "all_time"}
                        className={periodButtonClass(period === "all_time")}
                        onClick={() => setPeriod("all_time")}
                    >
                        За всё время
                    </button>
                    <button
                        type="button"
                        aria-pressed={period === "range"}
                        className={periodButtonClass(period === "range")}
                        onClick={() => setPeriod("range")}
                    >
                        За период
                    </button>
                    <button
                        type="button"
                        aria-pressed={period === "since_settings_change"}
                        className={periodButtonClass(
                            period === "since_settings_change",
                        )}
                        onClick={() => setPeriod("since_settings_change")}
                    >
                        С изменения настроек
                    </button>
                </div>
            </div>

            {period === "range" && (
                <div className="mt-4 flex flex-wrap items-end gap-1 justify-end">
                    <label className="flex flex-row items-center gap-1 text-sm text-content-secondary">
                        <span>С </span>
                        <input
                            type="date"
                            value={from}
                            max={to || undefined}
                            onChange={(event) => setFrom(event.target.value)}
                            className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-content-primary outline-none focus:border-accent-2 focus:ring-2 focus:ring-accent-2/20"
                        />
                    </label>
                    <label className="flex flex-row items-center gap-1 text-sm text-content-secondary">
                        <span>По</span>
                        <input
                            type="date"
                            value={to}
                            min={from || undefined}
                            max={toLocalDateInputValue(new Date())}
                            onChange={(event) => setTo(event.target.value)}
                            className="rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-content-primary outline-none focus:border-accent-2 focus:ring-2 focus:ring-accent-2/20"
                        />
                    </label>
                </div>
            )}

            {(validationError || error) && (
                <StatusNotice variant="error" className="mt-5">
                    {validationError || error}
                </StatusNotice>
            )}

            <div className="mt-5">
                <section className="rounded-3xl bg-surface-2 p-4">
                    <p className="text-sm font-medium text-content-secondary">
                        Обработано ответов
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tracking-tight text-content-primary">
                            {isLoading || validationError
                                ? "—"
                                : (data?.promptsTotal ?? 0).toLocaleString(
                                      "ru-RU",
                                  )}
                        </span>
                        <span className="text-sm text-content-secondary">
                            за выбранный период
                        </span>
                    </div>
                </section>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {data && !validationError ? (
                    <>
                        <ShareOfVoicePie
                            data={data.shareOfVoice.distribution}
                        />
                        <ShareOfVoiceHistory
                            data={data.shareOfVoice.history}
                        />
                        <SentimentPie data={data.sentiment.distribution} />
                        <SentimentHistory data={data.sentiment.history} />
                    </>
                ) : isLoading && !validationError ? (
                    <p role="status" className="text-sm text-content-secondary">
                        Загрузка статистики...
                    </p>
                ) : (
                    <p className="text-sm text-content-secondary">
                        Данные статистики пока недоступны.
                    </p>
                )}
            </div>
        </section>
    );
}
