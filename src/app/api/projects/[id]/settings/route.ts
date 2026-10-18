import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const body = await request.json();
        const { projectData, competitors, prompts } = body;

        // Проверяем лимит до изменения проекта и удаления старых промптов.
        if (!Array.isArray(prompts) || prompts.length > 25) {
            return NextResponse.json(
                { error: 'В проекте должно быть не более 25 промптов.' },
                { status: 400 }
            );
        }

        // Обновляем проект
        const { error: updateErr } = await supabase
            .from("projects")
            .update({
                name: projectData.brandName,
                niche: projectData.niche,
                country: projectData.country || null,
                city: projectData.city || null,
                description: projectData.description || null,
                competitors: competitors || [],
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);

        if (updateErr) throw new Error(updateErr.message);

        // Перезаписываем промпты
        const { error: deleteErr } = await supabase
            .from("prompts")
            .delete()
            .eq("project_id", projectId);

        if (deleteErr) throw new Error(deleteErr.message);

        if (prompts.length > 0) {
            const promptsToInsert = prompts.map((p: any) => ({
                project_id: projectId,
                text: p.text,
                category: p.category,
                is_custom: p.is_custom === true || p.isCustom === true,
            }));

            const { error: promptInsertErr } = await supabase
                .from("prompts")
                .insert(promptsToInsert);

            if (promptInsertErr) throw new Error(promptInsertErr.message);
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Ошибка сохранения";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
