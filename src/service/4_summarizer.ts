import { openaiClient } from '@/lib/ai';

export interface SummarizerInput {
    targetBrand: string;
    shareOfVoice: number;
    averageRank: number | null;
    sentimentIndex: { positive: number; neutral: number; negative: number };
    topCompetitors: Array<{ name: string; sov: number }>;
    topSources: Array<{ domain: string; count: number }>;
    directBrandProsCons?: { pros: string[]; cons: string[] };
}

export interface SummarizerOutput {
    ai_summary: string;
    brand_direct_summary: string | null;
}

export async function generateReportSummary(input: SummarizerInput): Promise<SummarizerOutput> {
    const systemPrompt = `
Вы — ведущий аналитик в сфере GEO (Generative Engine Optimization) и AI Brand Visibility.
Ваша задача — проанализировать агрегированные данные присутствия бренда в ответах ИИ-систем и написать ёмкое, профессиональное резюме.

Тексты должны быть грамотными, человечными, структурированными, без эмодзи и без нейросетевых штампов. Пишите строго по делу.

ВХОДНЫЕ ДАННЫЕ:
- Целевой бренд: "${input.targetBrand}"
- Share of Voice (Доля присутствия): ${input.shareOfVoice}%
- Средний ранг в выдаче: ${input.averageRank ?? 'Не определен'}
- Тональность: Позитивная ${input.sentimentIndex.positive}%, Нейтральная ${input.sentimentIndex.neutral}%, Негативная ${input.sentimentIndex.negative}%
- Главные конкуренты (SoV): ${JSON.stringify(input.topCompetitors)}
- Ключевые цитируемые источники: ${JSON.stringify(input.topSources)}
${input.directBrandProsCons ? `- Прямой анализ бренда (Плюсы/Минусы): ${JSON.stringify(input.directBrandProsCons)}` : ''}

ОТВЕТ ДОЛЖЕН БЫТЬ В ФОРМАТЕ JSON СО СЛЕДУЮЩИМИ КЛЮЧАМИ:
1. "ai_summary": Общее резюме отчета (3-4 абзаца). Опишите текущие позиции бренда, сильные и слабые стороны в сравнении с конкурентами, ключевые площадки-источники и конкретные рекомендации по улучшению видимости.
2. "brand_direct_summary": Если были данные по прямому анализу бренда — тезисный вывод о том, какой образ складывается у нейросетей при прямом запросе. Если данных нет — верните null.
`;

    try {
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        return {
            ai_summary: parsed.ai_summary || 'Не удалось сгенерировать резюме.',
            brand_direct_summary: parsed.brand_direct_summary || null,
        };
    } catch (error: any) {
        console.error('[Pass 4 Summarizer Error]:', error);
        throw new Error(`Ошибка при генерации резюме отчета: ${error.message}`);
    }
}