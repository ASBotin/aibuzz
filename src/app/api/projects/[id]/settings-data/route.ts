import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const supabase = await createSupabaseServerClient();

        const { data: project, error: projErr } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();

        if (projErr || !project) throw new Error("Проект не найден");

        const { data: prompts, error: promptErr } = await supabase
            .from("prompts")
            .select("*")
            .eq("project_id", projectId);

        if (promptErr) throw new Error("Ошибка загрузки промптов");

        return NextResponse.json({ project, prompts });
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Неизвестная ошибка";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}