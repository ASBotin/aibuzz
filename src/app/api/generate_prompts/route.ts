import { NextResponse } from 'next/server';
import { generateProjectPrompts, GeneratePromptsInput } from '../../../service/promptGen';

export async function POST(request: Request) {
  try {
    const body: GeneratePromptsInput = await request.json();
    const prompts = await generateProjectPrompts(body);
    return NextResponse.json({ prompts });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}