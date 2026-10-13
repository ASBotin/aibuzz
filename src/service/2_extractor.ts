import { z } from 'zod';
import { openaiClient } from '@/lib/ai';
import { normalizeBrandName } from '../utils/normName';

export const ExtractionMetricsSchema = z.object({
    brand_mentioned: z
        .boolean()
        .describe('Упомянут ли целевой бренд в тексте ответа'),

    brands_ranking: z
        .record(z.string(), z.number().nullable())
        .default({})
        .describe('Словарь где ключ — название бренда, а значение — его порядковый номер в списке'),

    sentiment: z
        .enum(['positive', 'neutral', 'negative', 'not_found'])
        .describe('Тональность контекста, в котором упоминается целевой бренд'),

    found_competitors: z
        .array(z.string())
        .describe('Список всех сторонних брендов, сервисов и компаний, упомянутых в тексте (исключая целевой бренд)'),

    extracted_domains: z
        .array(z.string())
        .describe('Список всех доменных имен и сайтов, явно упомянутых в тексте'),

    brands_pros_cons: z
        .record(
            z.string(),
            z.object({
                pros: z.array(z.string()),
                cons: z.array(z.string()),
            })
        )
        .default({})
        .describe('Словарь с плюсами и минусами, привязанными к конкретным брендам'),
});

export type ExtractionMetrics = z.infer<typeof ExtractionMetricsSchema>;

export interface ExtractionParams {
    rawText: string;
    targetBrand: string;
    category: string;
    competitors?: string[];
}

export async function executeExtraction(params: ExtractionParams): Promise<ExtractionMetrics> {
    const { rawText, targetBrand, category, competitors = [] } = params;

    const competitorsContext = competitors.length > 0
        ? `Известные целевые конкуренты для отслеживания: ${competitors.join(', ')}.`
        : '';

    const systemPrompt = `
        Вы — строгий аналитик данных. Ваша задача — проанализировать текст ответа ИИ и извлечь метрики в формате JSON.

        ЦЕЛЕВОЙ БРЕНД: "${targetBrand}"
        КАТЕГОРИЯ ЗАПРОСА: "${category}"
        ${competitorsContext}

        Правила извлечения:
        1. "brand_mentioned": true, если целевой бренд ("${targetBrand}") прямо упомянут в тексте. Иначе false.
        2. "brands_ranking": Если в тексте есть нумерованный или маркированный список рекомендаций/сервисов, зафиксируйте позиции (1, 2, 3...) ВСЕХ упомянутых брендов.
        3. "sentiment": Оцените контекст упоминания целевого бренда ("positive", "neutral", "negative"). Если бренд не упомянут — "not_found".
        4. "found_competitors": Соберите названия ВСЕХ других брендов, продуктов и сервисов-конкурентов, упомянутых в тексте. Исключите сам бренд "${targetBrand}".
        5. "extracted_domains": Извлеките все явные доменные имена и ссылки из текста (например, "example.com", "vc.ru").
        6. "brands_pros_cons": Извлеките плюсы и минусы по КАЖДОМУ отдельному бренду, для которого они приводятся в тексте. 
        Ключом должен быть точный бренд (например, "${targetBrand}"), а значением — объект { "pros": [...], "cons": [...] }. 
        Не смешивайте плюсы и минусы разных брендов. Если для какого-то бренда в тексте нет явных плюсов или минусов, передайте пустые массивы.

        Ответ должен быть СТРОГО в формате JSON:
        {
        "brand_mentioned": boolean,
        "brands_ranking": { [brandName: string]: number | null },
        "sentiment": "positive" | "neutral" | "negative" | "not_found",
        "found_competitors": string[],
        "extracted_domains": string[],
        "brands_pros_cons": {
            [brandName: string]: { "pros": string[], "cons": string[] }
        }
        }
    `;

    try {
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: rawText },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const parsedJson = JSON.parse(content);

        if (parsedJson.brands_ranking && typeof parsedJson.brands_ranking === 'object') {
            const normalizedRanking: Record<string, number | null> = {};
            for (const [key, val] of Object.entries(parsedJson.brands_ranking)) {
                normalizedRanking[normalizeBrandName(key)] = val as number | null;
            }
            parsedJson.brands_ranking = normalizedRanking;
        }

        if (Array.isArray(parsedJson.found_competitors)) {
            parsedJson.found_competitors = parsedJson.found_competitors.map((c: string) => 
                normalizeBrandName(c)
            );
        }

        if (parsedJson.brands_pros_cons && typeof parsedJson.brands_pros_cons === 'object') {
            const normalizedProsCons: Record<string, { pros: string[]; cons: string[] }> = {};
            for (const [key, val] of Object.entries(parsedJson.brands_pros_cons)) {
                normalizedProsCons[normalizeBrandName(key)] = val as { pros: string[]; cons: string[] };
            }
            parsedJson.brands_pros_cons = normalizedProsCons;
        }

        return ExtractionMetricsSchema.parse(parsedJson);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        console.error('[Pass 2 Error]:', error);
        throw new Error(`Ошибка при извлечении метрик в Pass 2: ${errorMessage}`);
    }
}