import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/auth";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PAGE_SIZE = 1000;
const REPORT_BATCH_SIZE = 100;

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const admin = await getAdminUser();
    if (admin.response) return admin.response;

    try {
        const { id: projectId } = await params;
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("id, user_id, is_demo")
            .eq("id", projectId)
            .maybeSingle();

        if (projectError) {
            throw new Error(
                `Не удалось проверить проект: ${projectError.message}`,
            );
        }
        if (
            !project ||
            (project.user_id !== admin.userId && project.is_demo !== true)
        ) {
            return NextResponse.json(
                { error: "Проект не найден." },
                { status: 404 },
            );
        }

        const reportIds: string[] = [];
        for (let offset = 0; ; offset += PAGE_SIZE) {
            const { data: reports, error: reportsError } = await supabase
                .from("reports")
                .select("id")
                .eq("project_id", projectId)
                .order("id", { ascending: true })
                .range(offset, offset + PAGE_SIZE - 1);

            if (reportsError) {
                throw new Error(
                    `Не удалось загрузить отчёты проекта: ${reportsError.message}`,
                );
            }

            const page = reports ?? [];
            reportIds.push(...page.map((report) => report.id));
            if (page.length < PAGE_SIZE) break;
        }

        for (
            let offset = 0;
            offset < reportIds.length;
            offset += REPORT_BATCH_SIZE
        ) {
            const reportBatch = reportIds.slice(
                offset,
                offset + REPORT_BATCH_SIZE,
            );
            const { error: resultsError } = await supabase
                .from("prompt_results")
                .delete()
                .in("report_id", reportBatch);

            if (resultsError) {
                throw new Error(
                    `Не удалось удалить результаты отчётов: ${resultsError.message}`,
                );
            }
        }

        const { error: promptsError } = await supabase
            .from("prompts")
            .delete()
            .eq("project_id", projectId);

        if (promptsError) {
            throw new Error(
                `Не удалось удалить промпты проекта: ${promptsError.message}`,
            );
        }

        const { error: reportsDeleteError } = await supabase
            .from("reports")
            .delete()
            .eq("project_id", projectId);

        if (reportsDeleteError) {
            throw new Error(
                `Не удалось удалить отчёты проекта: ${reportsDeleteError.message}`,
            );
        }

        const { data: deletedProject, error: deleteError } = await supabase
            .from("projects")
            .delete()
            .eq("id", projectId)
            .or(`user_id.eq.${admin.userId},is_demo.eq.true`)
            .select("id")
            .maybeSingle();

        if (deleteError) {
            throw new Error(`Не удалось удалить проект: ${deleteError.message}`);
        }
        if (!deletedProject) {
            return NextResponse.json(
                { error: "Проект не найден." },
                { status: 404 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Неизвестная ошибка.";
        console.error("[Project Delete API Error]:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
