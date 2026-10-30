import Link from "next/link";

import ArrowRight from "@/assets/arrow_right.svg?react";
import GradientButton from "@/components/ui/GradientButton";
import { isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProjectWithReports = {
    id: string;
    name: string;
    niche: string;
    created_at: string;
    reports: { created_at: string }[];
};

export const revalidate = 0;

export default async function ProjectsPage() {
    const admin = await isAdmin();
    const supabase = await createSupabaseServerClient();
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
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Не удалось загрузить проекты: ${error.message}`);
    }

    const projects = rawProjects as unknown as ProjectWithReports[];

    return (
        <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <div className="relative">
                <div className="mb-6 select-none xl:absolute xl:left-0 xl:top-0 xl:z-10 xl:mb-0">
                    <h1 className="text-3xl font-bold text-content-primary">
                        Проекты
                    </h1>
                </div>

                <div className="mx-auto w-full max-w-6xl">
                    {projects.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-content-secondary text-xl">
                                У вас пока нет активных проектов
                            </p>
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
                                    ? new Date(
                                          lastReport.created_at,
                                      ).toLocaleString("ru-RU", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "Еще не проводилось";

                                return (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="group block rounded-3xl bg-surface-1 p-6 transition-all hover:bg-surface-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-xl font-bold uppercase tracking-wide text-content-primary">
                                                        {project.name}
                                                    </h2>
                                                    <span className="text-sm font-normal text-content-secondary">
                                                        {project.niche}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 text-sm font-normal text-content-secondary">
                                                    <span className="font-medium">
                                                        Последнее исследование:
                                                    </span>
                                                    <span>{lastAuditDate}</span>
                                                </div>
                                            </div>

                                            <ArrowRight className="h-5 w-5 shrink-0 text-content-light transition-transform group-hover:translate-x-1 group-hover:text-accent-2" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 flex justify-center">
                        <GradientButton
                            size="lg"
                            href="/projects/new"
                            disabled={!admin}
                            className="px-8"
                        >
                            <svg
                                className="h-4 w-4"
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
                </div>
            </div>
        </div>
    );
}
