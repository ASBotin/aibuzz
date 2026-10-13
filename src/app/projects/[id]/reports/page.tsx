import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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
                    <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-md">
                        Готов
                    </span>
                );
            case "processing":
                return (
                    <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2.5 py-1 rounded-md">
                        В обработке
                    </span>
                );
            case "failed":
                return (
                    <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2.5 py-1 rounded-md">
                        Ошибка
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="mb-6">
                <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                >
                    ← К проекту
                </Link>
            </div>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">
                        Отчеты
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Проект: {project.name}
                    </p>
                </div>
                <Link
                    href={`/projects/${projectId}/run-audit`}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                    Новое исследование
                </Link>
            </div>

            {reports.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                    <p className="text-slate-400 mb-4">
                        Для этого проекта еще не проводились исследования
                    </p>
                    <Link
                        href={`/projects/${projectId}/run-audit`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
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

                        const isCompleted = report.status === "completed";

                        const content = (
                            <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors">
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-200">
                                            Исследование от {dateStr}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            ID: {report.id}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {getStatusBadge(report.status)}
                                    {isCompleted && (
                                        <svg
                                            className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
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
                                className="opacity-75 cursor-not-allowed"
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
