import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID =
    process.env.NEXT_PUBLIC_TEST_USER_ID ||
    "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string; reportId: string }> },
) {
    try {
        const { id: projectId, reportId } = await params;
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

        const { data: report, error: deleteError } = await supabase
            .from("reports")
            .delete()
            .eq("id", reportId)
            .eq("project_id", projectId)
            .select("id")
            .maybeSingle();

        if (deleteError) {
            throw new Error(`Не удалось удалить отчёт: ${deleteError.message}`);
        }
        if (!report) {
            return NextResponse.json(
                { error: "Отчёт не найден." },
                { status: 404 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Неизвестная ошибка.";
        console.error("[Report Delete API Error]:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
