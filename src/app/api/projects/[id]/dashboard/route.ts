import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID =
    process.env.NEXT_PUBLIC_TEST_USER_ID ||
    "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Period = "all_time" | "range" | "since_settings_change";

type ReportRow = {
    id: string;
    created_at: string;
    prompts_total: number | null;
    competitors_breakdown: unknown;
};

type PromptMetricRow = {
    report_id: string;
    prompt_category: string;
    brand_mentioned: boolean | null;
    sentiment: string | null;
};

type CompetitorMetric = {
    name: string;
    sov: number;
    isTarget: boolean;
};

type SentimentCategory = "positive" | "neutral" | "negative";

type SentimentCounts = Record<SentimentCategory, number>;

const SENTIMENT_CATEGORIES: SentimentCategory[] = [
    "positive",
    "neutral",
    "negative",
];

const PAGE_SIZE = 1000;

function isSentimentCategory(value: string | null): value is SentimentCategory {
    return (
        value === "positive" || value === "neutral" || value === "negative"
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getCompetitorMetrics(
    value: unknown,
    targetBrand: string,
): CompetitorMetric[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
        if (!isRecord(item) || typeof item.name !== "string") return [];
        const sov = finiteNumber(item.sov);
        if (sov === null) return [];
        return [
            {
                name: item.name,
                sov,
                isTarget: item.name === targetBrand,
            },
        ];
    });
}

function parseDate(value: string | null): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
        ? null
        : date.toISOString();
}

function nextDay(date: string): string {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: projectId } = await params;
        const searchParams = new URL(request.url).searchParams;
        const rawPeriod = searchParams.get("period") ?? "all_time";

        if (
            rawPeriod !== "all_time" &&
            rawPeriod !== "range" &&
            rawPeriod !== "since_settings_change"
        ) {
            return NextResponse.json(
                { error: "Неизвестный период дашборда." },
                { status: 400 },
            );
        }
        const period: Period = rawPeriod;

        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("id, name, updated_at")
            .eq("id", projectId)
            .eq("user_id", TEST_USER_ID)
            .maybeSingle();

        if (projectError) {
            throw new Error(
                `Не удалось загрузить проект: ${projectError.message}`,
            );
        }
        if (!project) {
            return NextResponse.json(
                { error: "Проект не найден." },
                { status: 404 },
            );
        }

        const reportsQuery = supabase
            .from("reports")
            .select("id, created_at, prompts_total, competitors_breakdown")
            .eq("project_id", projectId)
            .eq("status", "completed")
            .order("created_at", { ascending: true })
            .order("id", { ascending: true });

        if (period === "range") {
            const from = parseDate(searchParams.get("from"));
            const to = parseDate(searchParams.get("to"));
            if (!from || !to || from > to) {
                return NextResponse.json(
                    { error: "Укажите корректный диапазон дат." },
                    { status: 400 },
                );
            }
            reportsQuery.gte("created_at", from).lt("created_at", nextDay(to));
        } else if (period === "since_settings_change" && project.updated_at) {
            reportsQuery.gte("created_at", project.updated_at);
        }

        const reports: ReportRow[] = [];
        for (let offset = 0; ; offset += PAGE_SIZE) {
            const { data: page, error: reportsError } = await reportsQuery.range(
                offset,
                offset + PAGE_SIZE - 1,
            );
            if (reportsError) {
                throw new Error(
                    `Не удалось загрузить отчёты проекта: ${reportsError.message}`,
                );
            }

            const pageRows = (page ?? []) as ReportRow[];
            reports.push(...pageRows);
            if (pageRows.length < PAGE_SIZE) break;
        }

        const promptsTotal = reports.reduce((total, report) => {
            const count = report.prompts_total;
            return (
                total +
                (typeof count === "number" &&
                Number.isInteger(count) &&
                count >= 0
                    ? count
                    : 0)
            );
        }, 0);

        let mainPromptCount = 0;
        let targetMentionCount = 0;
        let sentimentPromptCount = 0;
        const sentimentCounts: SentimentCounts = {
            positive: 0,
            neutral: 0,
            negative: 0,
        };
        const reportDates = new Map(
            reports.map((report) => [report.id, report.created_at.slice(0, 10)]),
        );
        const sentimentByDate = new Map<
            string,
            { counts: SentimentCounts; total: number }
        >();

        if (reports.length > 0) {
            const reportIds = reports.map((report) => report.id);
            const promptRows: PromptMetricRow[] = [];
            for (let i = 0; i < reportIds.length; i += 100) {
                const reportIdBatch = reportIds.slice(i, i + 100);
                for (let offset = 0; ; offset += PAGE_SIZE) {
                    const { data: page, error: promptRowsError } = await supabase
                        .from("prompt_results")
                        .select(
                            "report_id, prompt_category, brand_mentioned, sentiment",
                        )
                        .in("report_id", reportIdBatch)
                        .order("report_id", { ascending: true })
                        .order("id", { ascending: true })
                        .range(offset, offset + PAGE_SIZE - 1);

                    if (promptRowsError) {
                        throw new Error(
                            `Не удалось загрузить результаты промптов: ${promptRowsError.message}`,
                        );
                    }

                    const pageRows = (page ?? []) as PromptMetricRow[];
                    promptRows.push(...pageRows);
                    if (pageRows.length < PAGE_SIZE) break;
                }
            }

            for (const prompt of promptRows) {
                const date = reportDates.get(prompt.report_id);
                if (!date) {
                    throw new Error(
                        `Результат промпта связан с неизвестным отчётом: ${prompt.report_id}`,
                    );
                }

                if (prompt.prompt_category === "main") {
                    mainPromptCount += 1;
                    if (prompt.brand_mentioned === true) {
                        targetMentionCount += 1;
                    }
                }

                if (
                    prompt.brand_mentioned !== true ||
                    !isSentimentCategory(prompt.sentiment)
                ) {
                    continue;
                }

                const sentiment = prompt.sentiment;
                sentimentCounts[sentiment] += 1;
                sentimentPromptCount += 1;

                const sentimentDay = sentimentByDate.get(date) ?? {
                    counts: { positive: 0, neutral: 0, negative: 0 },
                    total: 0,
                };
                sentimentDay.counts[sentiment] += 1;
                sentimentDay.total += 1;
                sentimentByDate.set(date, sentimentDay);
            }
        }

        const shareOfVoiceValue =
            mainPromptCount > 0
                ? Number(((targetMentionCount / mainPromptCount) * 100).toFixed(1))
                : 0;
        const aggregateSentiment = Object.fromEntries(
            SENTIMENT_CATEGORIES.map((category) => [
                category,
                sentimentPromptCount > 0
                    ? Number(
                          (
                              (sentimentCounts[category] /
                                  sentimentPromptCount) *
                              100
                          ).toFixed(1),
                      )
                    : 0,
            ]),
        ) as Record<SentimentCategory, number>;

        const shareOfVoiceByDate = new Map<
            string,
            { totals: Record<string, number>; count: number }
        >();
        for (const report of reports) {
            const date = report.created_at.slice(0, 10);
            const competitorMetrics = getCompetitorMetrics(
                report.competitors_breakdown,
                project.name,
            );
            const shareOfVoiceDay = shareOfVoiceByDate.get(date) ?? {
                totals: {},
                count: 0,
            };
            for (const metric of competitorMetrics) {
                shareOfVoiceDay.totals[metric.name] =
                    (shareOfVoiceDay.totals[metric.name] ?? 0) + metric.sov;
            }
            shareOfVoiceDay.count += 1;
            shareOfVoiceByDate.set(date, shareOfVoiceDay);

        }

        return NextResponse.json({
            promptsTotal,
            shareOfVoice: {
                distribution: [
                    {
                        brand: project.name,
                        value: shareOfVoiceValue,
                        isTarget: true,
                    },
                ],
                history: [...shareOfVoiceByDate.entries()].map(
                    ([date, { totals, count }]) => ({
                        date,
                        values: Object.fromEntries(
                            Object.entries(totals).map(([brand, total]) => [
                                brand,
                                Number((total / count).toFixed(1)),
                            ]),
                        ),
                    }),
                ),
            },
            sentiment: {
                distribution: SENTIMENT_CATEGORIES.map((sentiment) => ({
                    sentiment,
                    value: aggregateSentiment[sentiment],
                })),
                history: [...sentimentByDate.entries()].map(
                    ([date, { counts, total }]) => ({
                        date,
                        positive: Number(
                            ((counts.positive / total) * 100).toFixed(1),
                        ),
                        neutral: Number(
                            ((counts.neutral / total) * 100).toFixed(1),
                        ),
                        negative: Number(
                            ((counts.negative / total) * 100).toFixed(1),
                        ),
                    }),
                ),
            },
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Неизвестная ошибка.";
        console.error("[Dashboard API Error]:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}