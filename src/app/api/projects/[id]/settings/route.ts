import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MAX_KEYWORDS, MAX_PAGES, MAX_PROMPTS } from "@/features/projects";

type PromptInput = {
    text: string;
    category: string;
    is_custom?: boolean;
    isCustom?: boolean;
};

type SettingsInput = {
    projectData: {
        brandName: string;
        domain?: string | null;
        niche: string;
        country?: string | null;
        city?: string | null;
        description?: string | null;
    };
    competitors?: string[];
    keywords?: unknown;
    pages?: unknown;
    prompts?: PromptInput[];
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: projectId } = await params;
        const body = (await request.json()) as SettingsInput;
        const { projectData, competitors, keywords, pages, prompts } = body;

        // Проверяем лимит до изменения проекта и удаления старых промптов.
        if (!Array.isArray(prompts) || prompts.length > MAX_PROMPTS) {
            return NextResponse.json(
                {
                    error: `В проекте должно быть не более ${MAX_PROMPTS} промптов.`,
                },
                { status: 400 },
            );
        }
        const keywordsInput = keywords ?? [];
        const pagesInput = pages ?? [];
        if (
            !Array.isArray(keywordsInput) ||
            !keywordsInput.every(
                (keyword: unknown) => typeof keyword === "string",
            ) ||
            keywordsInput.length > MAX_KEYWORDS ||
            !Array.isArray(pagesInput) ||
            !pagesInput.every((page: unknown) => typeof page === "string") ||
            pagesInput.length > MAX_PAGES
        ) {
            return NextResponse.json(
                {
                    error: `Ключевые слова и ссылки должны быть корректными: не более ${MAX_KEYWORDS} слов и ${MAX_PAGES} ссылок.`,
                },
                { status: 400 },
            );
        }

        const normalizedKeywords = keywordsInput
            .map((keyword: string) => keyword.trim())
            .filter(Boolean);
        const normalizedPages = pagesInput
            .map((page: string) => page.trim())
            .filter(Boolean);

        // Обновляем проект
        const { error: updateErr } = await supabase
            .from("projects")
            .update({
                name: projectData.brandName,
                domain: projectData.domain?.trim() || null,
                niche: projectData.niche,
                country: projectData.country || null,
                city: projectData.city || null,
                description: projectData.description || null,
                competitors: competitors || [],
                keywords: normalizedKeywords.length ? normalizedKeywords : null,
                pages: normalizedPages.length ? normalizedPages : null,
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
            const promptsToInsert = prompts.map((p) => ({
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
