import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID = "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PageProps {
    params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function ProjectDashboardPage({ params }: PageProps) {
    const { id } = await params;

    const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", TEST_USER_ID)
        .single();

    if (error || !project) {
        notFound();
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <div className="mb-6">
                <Link
                    href="/projects"
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                >
                    ← Все проекты
                </Link>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-100 uppercase tracking-wide">
                            {project.name}
                        </h1>
                        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                            {project.niche}
                        </span>
                    </div>
                    {project.description ? (
                        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                            {project.description}
                        </p>
                    ) : (
                        <p className="text-slate-500 text-sm italic">
                            Описание отсутствует
                        </p>
                    )}
                </div>

                <Link
                    href={`/projects/${project.id}/run-audit`}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2 text-sm whitespace-nowrap"
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
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    Запустить исследование
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    href={`/projects/${project.id}/reports`}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-all hover:bg-slate-800/40 group flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                            Отчеты
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            История проведенных исследований и аналитика
                        </p>
                    </div>
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
                </Link>

                <Link
                    href={`/projects/${project.id}/settings`}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-all hover:bg-slate-800/40 group flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                            Настройки
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Управление промптами, конкурентами и параметрами
                        </p>
                    </div>
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
                </Link>
            </div>
        </div>
    );
}
