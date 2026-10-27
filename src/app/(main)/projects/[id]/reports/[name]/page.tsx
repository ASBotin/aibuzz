import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import CompetitorAnalysis from "@/components/reports/CompetitorAnalysis";
import KeywordMentionsChart from "@/components/reports/KeywordMentionsChart";
import PromptResults from "@/components/reports/PromptResults";
import ReportTabs from "@/components/reports/ReportTabs";
import ReportMetrics from "@/components/reports/ReportMetrics";
import ReportSummary from "@/components/reports/ReportSummary";
import SourcesAnalysis from "@/components/reports/SourcesAnalysis";
import StatusNotice from "@/components/ui/StatusNotice";
import Tag from "@/components/ui/Tag";
import type {
    CompetitorItem,
    H2HItem,
    KeywordMentionItem,
    PromptResult,
    SentimentIndex,
    SourceItem,
    TrackedSources,
} from "@/features/reports/types";
import {
    externalHref,
    formatDate,
    statusLabel,
} from "@/features/reports/utils";
import DeleteReportButton from "./DeleteReportButton";
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
        .select("id, name, niche, domain, competitors")
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

    const { data: previousReport, error: previousReportError } = await supabase
        .from("reports")
        .select("share_of_voice, sentiment_index")
        .eq("project_id", projectId)
        .eq("status", "completed")
        .lt("created_at", report.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (previousReportError) {
        throw new Error(
            `Не удалось загрузить предыдущий отчёт: ${previousReportError.message}`,
        );
    }

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
    const promptResults = promptResultRows.filter(
        (result) => result.brand_mentioned != null,
    );
    const promptCount =
        typeof report.prompts_total === "number" &&
        Number.isInteger(report.prompts_total) &&
        report.prompts_total >= 0
            ? report.prompts_total
            : promptResults.length;
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
    const keywordBreakdown = (
        Array.isArray(report.keywords_breakdown)
            ? report.keywords_breakdown
            : []
    ) as KeywordMentionItem[];
    const keywordMentions = keywordBreakdown.filter(
        (item): item is KeywordMentionItem =>
            item &&
            typeof item.keyword === "string" &&
            item.keyword.trim().length > 0 &&
            typeof item.count === "number" &&
            Number.isFinite(item.count) &&
            typeof item.percentage === "number" &&
            Number.isFinite(item.percentage),
    );
    const trackedSources =
        report.tracked_sources &&
        typeof report.tracked_sources === "object" &&
        !Array.isArray(report.tracked_sources)
            ? (report.tracked_sources as TrackedSources)
            : null;
    const trackedPages = Array.isArray(trackedSources?.pages)
        ? trackedSources.pages.filter(
              (page) =>
                  typeof page.url === "string" &&
                  typeof page.count === "number" &&
                  Number.isFinite(page.count),
          )
        : [];
    const domainCitationCount = trackedSources?.domain?.count;
    const domainCitationRate =
        typeof domainCitationCount === "number" &&
        Number.isFinite(domainCitationCount) &&
        domainCitationCount >= 0 &&
        promptCount > 0
            ? Math.min(100, (domainCitationCount / promptCount) * 100)
            : null;
    const originalLinksByDomain = promptResults.reduce<
        Record<string, string[]>
    >((linksByDomain, result) => {
        for (const citation of result.raw_citations || []) {
            const href = externalHref(citation);
            if (!href) continue;

            const hostname = new URL(href).hostname
                .toLocaleLowerCase("en-US")
                .replace(/^www\./, "");
            const domainLinks = (linksByDomain[hostname] ||= []);
            if (!domainLinks.includes(href)) domainLinks.push(href);
        }

        return linksByDomain;
    }, {});
    const sortedCompetitorItems = [...competitorItems].sort((a, b) => {
        const aIsOther = a.name.trim().toLocaleLowerCase("ru-RU") === "other";
        const bIsOther = b.name.trim().toLocaleLowerCase("ru-RU") === "other";
        return Number(aIsOther) - Number(bIsOther);
    });
    const configuredCompetitors = Array.isArray(project.competitors)
        ? project.competitors.filter(
              (competitor): competitor is string =>
                  typeof competitor === "string",
          )
        : [];
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
    const previousShareOfVoice =
        typeof previousReport?.share_of_voice === "number" &&
        Number.isFinite(previousReport.share_of_voice)
            ? Math.min(100, Math.max(0, previousReport.share_of_voice))
            : null;
    const previousSentiment =
        previousReport?.sentiment_index &&
        typeof previousReport.sentiment_index === "object" &&
        !Array.isArray(previousReport.sentiment_index)
            ? (previousReport.sentiment_index as SentimentIndex)
            : null;
    const previousPositiveSentiment =
        typeof previousSentiment?.positive === "number" &&
        Number.isFinite(previousSentiment.positive)
            ? Math.min(100, Math.max(0, previousSentiment.positive))
            : null;
    const currentPositiveSentiment =
        typeof sentiment?.positive === "number" &&
        Number.isFinite(sentiment.positive)
            ? Math.min(100, Math.max(0, sentiment.positive))
            : null;

    const statusTone =
        report.status === "completed"
            ? "positive"
            : report.status === "failed"
              ? "negative"
              : "warning";

    return (
        <main className="report-print-root w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <Link
                    href={`/projects/${projectId}/reports`}
                    className="inline-flex items-center gap-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
                >
                    <span aria-hidden="true">←</span> К списку отчётов
                </Link>
                <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-content-secondary hover:text-content-primary transition-colors"
                >
                    К проекту →
                </Link>
            </div>

            <header className="space-y-5 rounded-3xl bg-linear-to-r from-accent-1 via-accent-2 to-accent-3 p-6 text-white shadow-sm md:p-8">
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
                    <div className="flex shrink-0 flex-col items-stretch gap-2">
                        <ExportPdfButton />
                        <DeleteReportButton
                            projectId={projectId}
                            reportId={reportId}
                        />
                    </div>
                </div>
                {report.error_message && (
                    <StatusNotice
                        variant="error"
                        className="border-white/25 bg-white/95"
                    >
                        <div className="mb-1 font-semibold">
                            Ошибка обработки
                        </div>
                        <p className="whitespace-pre-wrap break-words">
                            {report.error_message}
                        </p>
                    </StatusNotice>
                )}
            </header>

            <ReportTabs
                sections={[
                    {
                        id: "overview",
                        label: "Обзор",
                        content: (
                            <>
                                <ReportMetrics
                                    projectName={project.name}
                                    shareOfVoice={shareOfVoice}
                                    sentiment={sentiment}
                                    averageRank={report.average_rank}
                                    promptCount={promptCount}
                                    shareOfVoiceChange={
                                        shareOfVoice != null &&
                                        previousShareOfVoice != null
                                            ? shareOfVoice -
                                              previousShareOfVoice
                                            : null
                                    }
                                    positiveSentimentChange={
                                        currentPositiveSentiment != null &&
                                        previousPositiveSentiment != null
                                            ? currentPositiveSentiment -
                                              previousPositiveSentiment
                                            : null
                                    }
                                    hasPreviousReport={previousReport != null}
                                    domainCitationRate={domainCitationRate}
                                />
                                <ReportSummary
                                    summary={report.ai_summary}
                                    brandDirectSummary={
                                        report.brand_direct_summary
                                    }
                                    headToHeadSummary={
                                        typeof report.h2h_summary === "string"
                                            ? report.h2h_summary
                                            : null
                                    }
                                />
                            </>
                        ),
                    },
                    {
                        id: "competitors",
                        label: "Конкуренты",
                        content: (
                            <CompetitorAnalysis
                                comparisons={h2hItems}
                                competitors={sortedCompetitorItems}
                                projectName={project.name}
                                configuredCompetitors={configuredCompetitors}
                            />
                        ),
                    },
                    ...(keywordMentions.length > 0
                        ? [
                              {
                                  id: "keywords",
                                  label: "Ключевые слова",
                                  content: (
                                      <KeywordMentionsChart
                                          data={keywordMentions}
                                      />
                                  ),
                              },
                          ]
                        : []),
                    {
                        id: "sources",
                        label: "Источники",
                        content: (
                            <SourcesAnalysis
                                citationRate={report.citation_rate}
                                sources={topSources}
                                originalLinksByDomain={originalLinksByDomain}
                                projectDomain={project.domain}
                                trackedPages={trackedPages}
                            />
                        ),
                    },
                    {
                        id: "answers",
                        label: "Ответы",
                        content: (
                            <PromptResults
                                results={promptResults}
                                projectName={project.name}
                                hasUnavailableOriginalData={
                                    hasUnavailableOriginalData
                                }
                                projectDomain={project.domain}
                                trackedUrls={trackedPages.map(
                                    (page) => page.url,
                                )}
                            />
                        ),
                    },
                ]}
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
