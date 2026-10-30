import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/auth";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string; reportId: string }> },
) {
    const admin = await getAdminUser();
    if (admin.response) return admin.response;

    try {
        const { id: projectId, reportId } = await params;
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
