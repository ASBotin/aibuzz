import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

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
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}