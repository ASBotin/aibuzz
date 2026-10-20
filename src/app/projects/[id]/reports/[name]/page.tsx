import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import CompetitorAnalysis from "@/components/reports/CompetitorAnalysis";
import PromptResults from "@/components/reports/PromptResults";
import ReportMetrics from "@/components/reports/ReportMetrics";
import ReportSummary from "@/components/reports/ReportSummary";
import SourcesAnalysis from "@/components/reports/SourcesAnalysis";
import Tag from "@/components/ui/Tag";
import type {
    CompetitorItem,
    H2HItem,
    PromptResult,
    SentimentIndex,
    SourceItem,
} from "@/features/reports/types";
import { formatDate, statusLabel } from "@/features/reports/utils";
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

    const { data: rawPromptResults, error: promptResultsError } = await supabase
        .from("prompt_results")
        .select("*")
        .eq("report_id", reportId);

    if (promptResultsError) {
        throw new Error(
            `Не удалось загрузить результаты промптов: ${promptResultsError.message}`,
        );
    }

    const promptResultRows = (rawPromptResults || []) as PromptResult[];
    const promptIds = [
        ...new Set(
            promptResultRows
                .map((result) => result.prompt_id)
                .filter((promptId): promptId is string => Boolean(promptId)),
        ),
    ];
    let customByPromptId = new Map<string, boolean>();

    if (promptIds.length > 0) {
        const { data: prompts, error: promptsError } = await supabase
            .from("prompts")
            .select("id, is_custom")
            .in("id", promptIds);

        if (promptsError) {
            throw new Error(
                `Не удалось загрузить происхождение промптов: ${promptsError.message}`,
            );
        }

        const promptOrigins = (prompts || []) as Array<{
            id: string;
            is_custom: boolean | null;
        }>;
        customByPromptId = new Map(
            promptOrigins.map((prompt) => [
                prompt.id,
                prompt.is_custom === true,
            ]),
        );
    }

    const promptResults = promptResultRows.map((result) => ({
        ...result,
        is_custom: result.prompt_id
            ? (customByPromptId.get(result.prompt_id) ?? null)
            : null,
    }));
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
    const sortedCompetitorItems = [...competitorItems].sort((a, b) => {
        const aIsOther = a.name.trim().toLocaleLowerCase("ru-RU") === "other";
        const bIsOther = b.name.trim().toLocaleLowerCase("ru-RU") === "other";
        return Number(aIsOther) - Number(bIsOther);
    });
    const hasUnavailableOriginalData = promptResults.some((result) => {
        const hasPromptText = Boolean(result.prompt_text?.trim());
        const hasLinks = Boolean(
            result.raw_citations?.some((value) => value.trim()) ||
            result.extracted_domains?.some((value) => value.trim()),
        );
        return !hasPromptText || !hasLinks;
    });
    const sentiment =
        report.sentiment_index && typeof report.sentiment_index === "object"
            ? (report.sentiment_index as SentimentIndex)
            : null;
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

            <ReportMetrics
                projectName={project.name}
                shareOfVoice={shareOfVoice}
                sentiment={sentiment}
                averageRank={report.average_rank}
                promptCount={promptResults.length}
            />

            <ReportSummary
                summary={report.ai_summary}
                brandDirectSummary={report.brand_direct_summary}
                headToHeadSummary={
                    typeof report.h2h_summary === "string"
                        ? report.h2h_summary
                        : null
                }
            />

            <CompetitorAnalysis
                comparisons={h2hItems}
                competitors={sortedCompetitorItems}
                projectName={project.name}
            />

            <SourcesAnalysis
                citationRate={report.citation_rate}
                sources={topSources}
            />

            <PromptResults
                results={promptResults}
                projectName={project.name}
                hasUnavailableOriginalData={hasUnavailableOriginalData}
            />

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
