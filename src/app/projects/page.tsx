import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID = "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ProjectWithReports = {
    id: string;
    name: string;
    niche: string;
    created_at: string;
    reports: { created_at: string }[];
};

export const revalidate = 0; // Отключаем кэш для актуальных данных

export default async function ProjectsPage() {
    const { data: rawProjects, error } = await supabase
        .from("projects")
        .select(
            `
      id,
      name,
      niche,
      created_at,
      reports (
        created_at
      )
    `,
        )
        .eq("user_id", TEST_USER_ID)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[Projects Fetch Error]:", error);
    }

    const projects = (rawProjects as unknown as ProjectWithReports[]) || [];

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">
                        Проекты
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Список созданных проектов и отчетов
                    </p>
                </div>
                <Link
                    href="/projects/new"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    Новый проект
                </Link>
            </div>

            {projects.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                    <p className="text-slate-400 mb-4">
                        У вас пока нет активных проектов
                    </p>
                    <Link
                        href="/projects/new"
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                        Создать первый проект →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((project) => {
                        // Находим самую свежую дату отчета, либо берем дату создания проекта
                        const lastReport = project.reports?.length
                            ? project.reports.reduce((latest, r) =>
                                  new Date(r.created_at) >
                                  new Date(latest.created_at)
                                      ? r
                                      : latest,
                              )
                            : null;

                        const lastAuditDate = lastReport
                            ? new Date(lastReport.created_at).toLocaleString(
                                  "ru-RU",
                                  {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  },
                              )
                            : "Еще не проводилось";

                        return (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="block bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-all hover:bg-slate-800/40 group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase tracking-wide">
                                        {project.name}
                                    </h2>
                                    <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">
                                        {project.niche}
                                    </span>
                                </div>

                                <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                                    <span>Последнее исследование:</span>
                                    <span className="font-medium text-slate-300">
                                        {lastAuditDate}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
