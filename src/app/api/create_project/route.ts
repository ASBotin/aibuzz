import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const { projectData, prompts } = await request.json();

    // 1. Создаем проект
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .insert({
        user_id: "1a58f792-2ceb-4e71-9db3-d1d732fe257c",
        name: projectData.brandName,
        domain: projectData.domain || null,
        niche: projectData.niche,
        country: projectData.country || null,
        city: projectData.city || null,
        description: projectData.description || null,
        competitors: projectData.competitors || []
      })
      .select('id')
      .single();

    if (projectErr || !project) throw new Error(`Ошибка создания проекта: ${projectErr?.message}`);

    // 2. Подготавливаем и сохраняем промпты
    const promptsToInsert = prompts.map((p: any) => ({
      project_id: project.id,
      text: p.text,
      category: p.category
    }));

    const { error: promptsErr } = await supabase
      .from('prompts')
      .insert(promptsToInsert);

    if (promptsErr) throw new Error(`Ошибка сохранения промптов: ${promptsErr.message}`);

    return NextResponse.json({ projectId: project.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}