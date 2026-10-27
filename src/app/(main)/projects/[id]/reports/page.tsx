import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Report from "@/assets/report.svg?react";
import ArrowRight from "@/assets/arrow_right.svg?react";
import DeleteReportButton from "./[name]/DeleteReportButton";

const TEST_USER_ID =
    process.env.NEXT_PUBLIC_TEST_USER_ID ||
    "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PageProps {
    params: Promise<{ id: string }>;
}

export const revalidate = 0;

type ReportItem = {
    id: string;
    created_at: string;
    status: "completed" | "processing" | "failed";
};

export default async function ReportsPage({ params }: PageProps) {
    const { id: projectId } = await params;

    // Проверяем принадлежность проекта пользователю
    const { data: project } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", TEST_USER_ID)
        .single();

    if (!project) {
        notFound();
    }

    // Загружаем список отчетов
    const { data: rawReports } = await supabase
        .from("reports")
        .select("id, created_at, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    const reports = (rawReports as ReportItem[]) || [];

    const getStatusBadge = (status: ReportItem["status"]) => {
        switch (status) {
            case "completed":
                return (
                    <span className="text-xs bg-green-300/40 text-emerald-800 px-6 py-1 rounded-full">
                        Готов
                    </span>
                );
            case "processing":
                return (
                    <span className="text-xs bg-amber-300/40 text-amber-800 px-4 py-1 rounded-full">
                        В обработке
                    </span>
                );
            case "failed":
                return (
                    <span className="text-xs bg-red-300/40 text-red-800 px-5.5 py-1 rounded-full">
                        Ошибка
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <div className="relative">
                <div className="mb-6 select-none xl:absolute xl:left-0 xl:top-0 xl:z-10 xl:mb-0">
                    <h1 className="text-3xl font-bold text-content-primary">
                        Отчеты
                    </h1>
                    <p className="text-content-secondary text-sm mt-1">
                        Проект: {project.name}
                    </p>
                </div>

                <div className="mx-auto w-full max-w-5xl">
                    {reports.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-content-secondary mb-4">
                                Для этого проекта еще не проводились исследования
                            </p>
                            <Link
                                href={`/projects/${projectId}/run-audit`}
                                className="text-sm font-medium text-accent-2 hover:text-accent-2-hover"
                            >
                                Запустить первое исследование →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => {
                                const dateStr = new Date(
                                    report.created_at,
                                ).toLocaleString("ru-RU", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });

                                const isCompleted =
                                    report.status === "completed";

                                const content = (
                                    <div className="group mb-4 flex flex-col items-start justify-between gap-6 rounded-3xl bg-surface-1 p-8 transition-colors hover:bg-surface-3 md:flex-row md:items-center">
                                        <div className="flex items-center gap-4">
                                            <Report className="h-7 w-7 text-content-secondary group-hover:text-accent-2" />
                                            <div className="flex flex-col items-start gap-2">
                                                <div className="text-base font-medium text-content-primary">
                                                    Исследование от {dateStr}
                                                </div>
                                                {getStatusBadge(report.status)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {isCompleted && (
                                                <ArrowRight className="h-5 w-5 shrink-0 text-content-light transition-transform group-hover:translate-x-1 group-hover:text-accent-2" />
                                            )}
                                            {report.status === "failed" && (
                                                <DeleteReportButton
                                                    projectId={projectId}
                                                    reportId={report.id}
                                                    variant="list"
                                                />
                                            )}
                                        </div>
                                    </div>
                                );

                                return isCompleted ? (
                                    <Link
                                        key={report.id}
                                        href={`/projects/${projectId}/reports/${report.id}`}
                                        className="block"
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <div
                                        key={report.id}
                                        className="cursor-not-allowed opacity-75"
                                    >
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
