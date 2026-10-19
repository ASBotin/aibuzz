import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import ArrowRight from "@/assets/arrow_right.svg?react";
import GradientButton from "@/components/ui/GradientButton";

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

export const revalidate = 0;

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
            <div className="flex justify-between items-center mb-8 select-none">
                <div>
                    <h1 className="text-3xl font-bold text-content-primary">
                        Проекты
                    </h1>
                </div>
                <GradientButton
                    size="lg"
                    href="/projects/new"
                    className="px-8"
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
                </GradientButton>
            </div>

            {projects.length === 0 ? (
                <div className="p-12 text-center">
                    <p className="text-content-secondary text-xl mb-4">
                        У вас пока нет активных проектов
                    </p>
                    <Link
                        href="/projects/new"
                        className="text-accent-2 hover:text-accent-2-hover text-xl font-medium"
                    >
                        Создать первый проект →
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {projects.map((project) => {
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
                                className="block bg-surface-1 rounded-3xl p-6 group hover:bg-surface-3 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold text-content-primary uppercase tracking-wide">
                                                {project.name}
                                            </h2>
                                            <span className="text-sm text-content-secondary font-normal">
                                                {project.niche}
                                            </span>
                                        </div>

                                        <div className="flex gap-1 items-center text-sm text-content-secondary font-normal">
                                            <span className="font-medium">
                                                Последнее исследование:
                                            </span>
                                            <span>{lastAuditDate}</span>
                                        </div>
                                    </div>

                                    <ArrowRight className="w-5 h-5 text-content-light group-hover:text-accent-2 transition-transform group-hover:translate-x-1 shrink-0" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
