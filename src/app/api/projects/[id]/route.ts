import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID =
    process.env.NEXT_PUBLIC_TEST_USER_ID ||
    "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

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
    try {
        const { id: projectId } = await params;
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", TEST_USER_ID)
            .maybeSingle();

        if (projectError) {
            throw new Error(
                `Не удалось проверить проект: ${projectError.message}`,
            );
        }
        if (!project) {
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
            .eq("user_id", TEST_USER_ID)
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
