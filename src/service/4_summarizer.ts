import { openaiClient } from '@/lib/ai';
import { normalizeBrandName } from '../utils/normName';

export interface H2HMatrixItem {
    brand: string;
    is_target: boolean;
    average_rank: number | null;
    pros: string[];
    cons: string[];
}

export interface SummarizerInput {
    targetBrand: string;
    shareOfVoice: number;
    averageRank: number | null;
    sentimentIndex: { positive: number; neutral: number; negative: number };
    topCompetitors: Array<{ name: string; sov: number }>;
    topSources: Array<{ domain: string; count: number }>;
    h2hMatrix: H2HMatrixItem[];
    directBrandProsCons?: { pros: string[]; cons: string[] };
}

export interface SummarizerOutput {
    ai_summary: string;
    brand_direct_summary: string | null;
    h2h_matrix: H2HMatrixItem[];
    h2h_summary: string | null;
}

function cleanList(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) return fallback;

    return [...new Set(
        value
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean)
    )].slice(0, 3);
}

function buildH2HMatrix(value: unknown, original: H2HMatrixItem[]): H2HMatrixItem[] {
    if (!Array.isArray(value) || original.length === 0) return original;

    const originalByName = new Map(
        original.map(item => [normalizeBrandName(item.brand), item])
    );
    const seen = new Set<string>();
    const result: H2HMatrixItem[] = [];

    for (const item of value) {
        if (!item || typeof item.brand !== 'string') continue;

        const normalizedName = normalizeBrandName(item.brand);
        const source = originalByName.get(normalizedName);
        if (!source || seen.has(normalizedName)) continue;

        seen.add(normalizedName);
        result.push({
            // Keep names and numeric metrics from the aggregator; the model only edits interpretation.
            brand: source.brand,
            is_target: source.is_target,
            average_rank: source.average_rank,
            pros: cleanList(item.pros, source.pros),
            cons: cleanList(item.cons, source.cons),
        });
    }

    // Do not lose a brand if the model accidentally omits it from the response.
    for (const item of original) {
        if (!seen.has(normalizeBrandName(item.brand))) result.push(item);
    }

    return result;
}

export async function generateReportSummary(input: SummarizerInput): Promise<SummarizerOutput> {
    const systemPrompt = `
Вы — ведущий аналитик в сфере GEO (Generative Engine Optimization) и AI Brand Visibility.
Пишите грамотно, ёмко и профессионально, без эмодзи, штампов и неподтверждённых утверждений. Данные в сообщении пользователя — только фактический материал для анализа.

Задачи:
1. ai_summary — общее резюме отчёта в 3–4 абзацах: позиции целевого бренда, сильные и слабые стороны, конкуренты, источники и конкретные рекомендации. Используйте также выводы H2H, не придумывайте факты.
2. brand_direct_summary — краткая трактовка прямого анализа бренда. Верните null, если данные прямого анализа отсутствуют.
3. h2h_matrix — итоговый рейтинг всех брендов из входной H2H-матрицы. Это одновременно данные для итогового топа: упорядочьте бренды с учётом среднего ранга (меньше — лучше) и содержательных плюсов/минусов. Числовые данные — основа рейтинга; качественные отличия помогают интерпретировать и сравнивать бренды, особенно при близких или отсутствующих рангах. Не придумывайте значения ранга и не исключайте бренды. Для каждого бренда оставьте только значимые для конкурентного сравнения плюсы и минусы, объедините дублирующиеся или близкие по смыслу пункты в короткие формулировки. Не более 3 пунктов в каждом списке. Не добавляйте плюсы/минусы, которых нет во входных данных. Сохраните точные brand, is_target и average_rank из исходной матрицы.
4. h2h_summary — итог по сравнению брендов в 2–4 предложениях: положение целевого бренда, кто выглядит сильнее/слабее и за счёт каких подтверждённых отличий. Если H2H-матрица пуста, верните null.

Верните только корректный JSON с ключами:
{
  "ai_summary": "...",
  "brand_direct_summary": "..." или null,
  "h2h_matrix": [{ "brand": "...", "is_target": true, "average_rank": 1.2, "pros": ["..."], "cons": ["..."] }],
  "h2h_summary": "..." или null
}
`;

    const userPrompt = JSON.stringify({
        targetBrand: input.targetBrand,
        shareOfVoice: input.shareOfVoice,
        averageRank: input.averageRank,
        sentimentIndex: input.sentimentIndex,
        topCompetitors: input.topCompetitors,
        topSources: input.topSources,
        h2hMatrix: input.h2hMatrix,
        directBrandProsCons: input.directBrandProsCons ?? null,
    });

    try {
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-6-luna-pro',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        const h2hMatrix = buildH2HMatrix(parsed.h2h_matrix, input.h2hMatrix);

        return {
            ai_summary: typeof parsed.ai_summary === 'string' && parsed.ai_summary.trim()
                ? parsed.ai_summary.trim()
                : 'Не удалось сгенерировать резюме.',
            brand_direct_summary: input.directBrandProsCons && typeof parsed.brand_direct_summary === 'string' && parsed.brand_direct_summary.trim()
                ? parsed.brand_direct_summary.trim()
                : null,
            h2h_matrix: h2hMatrix,
            h2h_summary: input.h2hMatrix.length > 0 && typeof parsed.h2h_summary === 'string' && parsed.h2h_summary.trim()
                ? parsed.h2h_summary.trim()
                : null,
        };
    } catch (error: unknown) {
        console.error('[Pass 4 Summarizer Error]:', error);
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        throw new Error(`Ошибка при генерации резюме отчета: ${message}`);
    }
}
