import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MAX_KEYWORDS, MAX_PAGES, MAX_PROMPTS } from '@/features/projects';

type ProjectDataInput = {
  brandName: string;
  niche: string;
  domain?: string | null;
  country?: string | null;
  city?: string | null;
  description?: string | null;
  competitors?: string[];
  keywords?: unknown;
  pages?: unknown;
};

type PromptInput = {
  text: string;
  category: string;
  is_custom?: boolean;
  isCustom?: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const { projectData, prompts } = (await request.json()) as {
      projectData?: ProjectDataInput;
      prompts?: PromptInput[];
    };

    if (!projectData) {
      return NextResponse.json(
        { error: 'Не удалось получить данные проекта.' },
        { status: 400 },
      );
    }

    if (!Array.isArray(prompts) || prompts.length > MAX_PROMPTS) {
      return NextResponse.json(
        {
          error: `В проекте должно быть не более ${MAX_PROMPTS} промптов.`,
        },
        { status: 400 },
      );
    }

    const keywordsInput = projectData.keywords ?? [];
    const pagesInput = projectData.pages ?? [];
    if (
      !Array.isArray(keywordsInput) ||
      !keywordsInput.every((keyword: unknown) => typeof keyword === 'string') ||
      !Array.isArray(pagesInput) ||
      !pagesInput.every((page: unknown) => typeof page === 'string')
    ) {
      return NextResponse.json(
        {
          error:
            'Ключевые слова и ссылки должны быть указаны в корректном формате.',
        },
        { status: 400 },
      );
    }

    const keywords = keywordsInput
      .map((keyword: string) => keyword.trim())
      .filter(Boolean);
    const pages = pagesInput.map((page: string) => page.trim()).filter(Boolean);
    if (keywords.length > MAX_KEYWORDS || pages.length > MAX_PAGES) {
      return NextResponse.json(
        {
          error: `Можно указать не более ${MAX_KEYWORDS} ключевых слов и ${MAX_PAGES} ссылок.`,
        },
        { status: 400 },
      );
    }

    // 1. Создаем проект
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .insert({
        user_id: '1a58f792-2ceb-4e71-9db3-d1d732fe257c',
        name: projectData.brandName,
        domain: projectData.domain?.trim() || null,
        niche: projectData.niche,
        country: projectData.country || null,
        city: projectData.city || null,
        description: projectData.description || null,
        competitors: projectData.competitors || [],
        keywords: keywords.length ? keywords : null,
        pages: pages.length ? pages : null,
      })
      .select('id')
      .single();

    if (projectErr || !project) {
      throw new Error(`Ошибка создания проекта: ${projectErr?.message}`);
    }

    // 2. Сохраняем промпты вместе с признаком пользовательского промпта.
    const promptsToInsert = prompts.map((p) => ({
      project_id: project.id,
      text: p.text,
      category: p.category,
      is_custom: p.is_custom === true || p.isCustom === true,
    }));

    if (promptsToInsert.length > 0) {
      const { error: promptsErr } = await supabase
        .from('prompts')
        .insert(promptsToInsert);

      if (promptsErr)
        throw new Error(`Ошибка сохранения промптов: ${promptsErr.message}`);
    }

    return NextResponse.json({ projectId: project.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
