import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runReportPipeline } from '../../../../../service/pipeline';
import { getAdminUser } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin.response) return admin.response;

  try {
    const { id: projectId } = await params;
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, is_demo')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError) {
      throw new Error(`Не удалось проверить проект: ${projectError.message}`);
    }
    if (
      !project ||
      (project.user_id !== admin.userId && project.is_demo !== true)
    ) {
      return NextResponse.json({ error: 'Проект не найден.' }, { status: 404 });
    }

    await runReportPipeline(supabase, projectId);

    const { data: latestReport } = await supabase
      .from('reports')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ success: true, reportId: latestReport?.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}