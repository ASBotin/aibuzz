import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ArrowRight from "@/assets/arrow_right.svg?react";
import Dashboard from "@/components/dashboard/dashboard";
import GradientButton from "@/components/ui/GradientButton";
import DeleteProjectButton from "./DeleteProjectButton";

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
        <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mb-6 flex items-center justify-between gap-4">
                <Link
                    href="/projects"
                    className="text-sm text-content-secondary hover:text-content-primary inline-flex items-center gap-1.5"
                >
                    ← Все проекты
                </Link>
                <DeleteProjectButton projectId={id} />
            </div>

            <div className="mb-6 flex flex-col items-start justify-between gap-6 rounded-3xl bg-surface-1 p-6 sm:p-8 lg:flex-row lg:items-center">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="text-3xl font-bold text-content-primary uppercase tracking-wide">
                            {project.name}
                        </h1>
                        <span className="text-sm text-content-secondary font-normal">
                            {project.niche}
                        </span>
                    </div>
                    {project.description ? (
                        <p className="text-content-primary font-normal">
                            {project.description}
                        </p>
                    ) : (
                        <></>
                    )}
                </div>

                <GradientButton
                    size="md"
                    href={`/projects/${project.id}/run-audit`}
                    className="shrink-0 py-4 whitespace-nowrap"
                >
                    Начать исследование
                </GradientButton>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link
                    href={`/projects/${project.id}/reports`}
                    className="group flex items-center justify-between rounded-3xl bg-surface-1 p-6 transition-all hover:bg-surface-3 sm:p-7"
                >
                    <div>
                        <h2 className="text-lg font-semibold text-content-primary">
                            Отчеты
                        </h2>
                        <p className="text-content-secondary text-sm mt-1">
                            История проведенных исследований и аналитика
                        </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-content-light group-hover:text-accent-2 transition-transform group-hover:translate-x-1 shrink-0" />
                </Link>

                <Link
                    href={`/projects/${project.id}/settings`}
                    className="group flex items-center justify-between rounded-3xl bg-surface-1 p-6 transition-all hover:bg-surface-3 sm:p-7"
                >
                    <div>
                        <h2 className="text-lg font-semibold text-content-primary">
                            Настройки
                        </h2>
                        <p className="text-content-secondary text-sm mt-1">
                            Управление промптами, конкурентами и параметрами
                        </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-content-light group-hover:text-accent-2 transition-transform group-hover:translate-x-1 shrink-0" />
                </Link>
            </div>
            <Dashboard projectId={project.id} className="mt-6" />
        </div>
    );
}
