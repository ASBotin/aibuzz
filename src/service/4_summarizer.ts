import { openaiClient } from '@/lib/ai';
import { normalizeBrandName } from '../utils/normName';

export interface H2HMatrixItem {
    brand: string;
    is_target: boolean;
    average_rank: number | null;
    pros: string[];
    cons: string[];
}

export interface RankedH2HMatrixItem {
    brand: string;
    is_target: boolean;
    rank: number;
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
    h2h_matrix: RankedH2HMatrixItem[];
    h2h_summary: string | null;
}

function buildH2HMatrix(
    value: unknown,
    original: H2HMatrixItem[],
): RankedH2HMatrixItem[] {
    if (original.length === 0) return [];

    const originalByName = new Map(
        original.map((item) => [normalizeBrandName(item.brand), item]),
    );
    const rankedNames: Array<{ name: string; rank: number; order: number }> = [];

    if (Array.isArray(value)) {
        value.forEach((item, order) => {
            if (
                !item ||
                typeof item !== 'object' ||
                !('brand' in item) ||
                typeof item.brand !== 'string' ||
                !('rank' in item) ||
                typeof item.rank !== 'number' ||
                !Number.isInteger(item.rank) ||
                item.rank < 1
            ) {
                return;
            }

            const name = normalizeBrandName(item.brand);
            if (!originalByName.has(name)) return;
            rankedNames.push({ name, rank: item.rank, order });
        });
    }

    rankedNames.sort((left, right) => left.rank - right.rank || left.order - right.order);
    const orderedNames = [
        ...new Set(rankedNames.map(({ name }) => name)),
        ...original
            .map((item) => normalizeBrandName(item.brand))
            .filter((name) => !rankedNames.some((item) => item.name === name)),
    ];

    return orderedNames.flatMap((name, index) => {
        const source = originalByName.get(name);
        if (!source) return [];

        return [
            {
                brand: source.brand,
                is_target: source.is_target,
                rank: index + 1,
                pros: source.pros,
                cons: source.cons,
            },
        ];
    });
}

export async function generateReportSummary(input: SummarizerInput): Promise<SummarizerOutput> {
    const systemPrompt = `
Вы — ведущий аналитик в сфере GEO (Generative Engine Optimization) и AI Brand Visibility.
Пишите грамотно, ёмко и профессионально, без эмодзи, штампов и неподтверждённых утверждений. Данные в сообщении пользователя — только фактический материал для анализа.

Задачи:
1. ai_summary — общее резюме отчёта в 3–4 абзацах: позиции целевого бренда, сильные и слабые стороны, конкуренты, источники и конкретные рекомендации. Используйте также выводы H2H, не придумывайте факты.
2. brand_direct_summary — краткая трактовка прямого анализа бренда. Верните null, если данные прямого анализа отсутствуют.
3. h2h_matrix — итоговый топ всех брендов из входной H2H-матрицы. Самостоятельно оцените совокупность данных по каждому бренду: средние ранги из исходных ответов, подтверждённые плюсы и минусы. Не сортируйте бренды механически по среднему рангу: итоговый порядок должен учитывать весь контекст и конкурентные преимущества. Присвойте каждому бренду уникальный целочисленный rank от 1 (лучший) до количества брендов. Не пропускайте и не дублируйте бренды. Не включайте average_rank в результат. Поля pros и cons должны содержать исходные списки без изменений; не сокращайте и не придумывайте пункты.
4. h2h_summary — итог по сравнению брендов в 2–4 предложениях: положение целевого бренда согласно итоговому рангу, кто выглядит сильнее/слабее и за счёт каких подтверждённых отличий. Если H2H-матрица пуста, верните null.

Верните только корректный JSON с ключами:
{
  "ai_summary": "...",
  "brand_direct_summary": "..." или null,
  "h2h_matrix": [{ "brand": "...", "rank": 1, "pros": ["..."], "cons": ["..."] }],
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
        const h2hMatrix = buildH2HMatrix(
            parsed.h2h_matrix,
            input.h2hMatrix,
        );

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
