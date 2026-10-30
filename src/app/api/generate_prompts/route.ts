import { NextResponse } from 'next/server';
import { generateProjectPrompts, GeneratePromptsInput } from '../../../service/promptGen';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  const authResponse = await requireAdmin();
  if (authResponse) return authResponse;

  try {
    const body: GeneratePromptsInput = await request.json();
    const prompts = await generateProjectPrompts(body);
    return NextResponse.json({ prompts });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}