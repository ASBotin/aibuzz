import { z } from 'zod';
import { openaiClient } from '@/lib/ai';
import { normalizeBrandName } from '../utils/normName';

export const ExtractionMetricsSchema = z.object({
    brand_mentioned: z.boolean().describe('Упомянут ли целевой бренд в тексте ответа'),

    brands_ranking: z.record(z.string(), z.number().nullable()).default({}).describe('Словарь где ключ — название бренда, а значение — его порядковый номер в списке'),

    sentiment: z.enum(['positive', 'neutral', 'negative', 'not_found']).describe('Тональность контекста, в котором упоминается целевой бренд'),

    found_competitors: z.array(z.string()).describe('Список всех сторонних брендов, сервисов и компаний, упомянутых в тексте (исключая целевой бренд)'),

    extracted_domains: z.array(z.string()).default([]).describe('Список всех доменных имен и сайтов, явно упомянутых в тексте'),

    mentioned_keywords: z.array(z.string()).default([]).describe('Ключевые слова из заданного списка, встречающиеся в ответе'),

    domain_mentioned: z.boolean().default(false).describe('Упомянут ли настроенный домен в ответе или ссылках-источниках'),

    mentioned_pages: z.array(z.string()).default([]).describe('Настроенные ссылки, которые приведены в ответе или среди источников'),

    brands_pros_cons: z
        .record(
            z.string(),
            z.object({
                pros: z.array(z.string()),
                cons: z.array(z.string()),
            }),
        )
        .default({})
        .describe('Словарь с плюсами и минусами, привязанными к конкретным брендам'),
});

export type ExtractionMetrics = z.infer<typeof ExtractionMetricsSchema>;

export interface ExtractionParams {
    rawText: string;
    rawCitations?: string[];
    targetBrand: string;
    category: string;
    competitors?: string[];
    keywords?: string[];
    domain?: string | null;
    pages?: string[];
}

function getHostname(value: string): string | null {
    try {
        return new URL(value.includes('://') ? value : `https://${value}`)
            .hostname.toLowerCase()
            .replace(/^www\./, '');
    } catch {
        return null;
    }
}

function normalizePageUrl(value: string): string | null {
    try {
        const url = new URL(value.includes('://') ? value : `https://${value}`);
        const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
        const path = url.pathname.replace(/\/+$/, '');
        return `${hostname}${path}`;
    } catch {
        return null;
    }
}

function getUrls(text: string): string[] {
    return (
        text
            .match(/https?:\/\/[^\s<>"')\]]+/gi)
            ?.map((url) => url.replace(/[.,;:!?]+$/, '')) ?? []
    );
}

function isDomainMentioned(domain: string, rawText: string, citations: string[]): boolean {
    const expectedHost = getHostname(domain);
    if (!expectedHost) return false;

    const referencedHosts = [...getUrls(rawText), ...citations]
        .map(getHostname)
        .filter((hostname): hostname is string => hostname !== null);
    if (
        referencedHosts.some(
            (hostname) =>
                hostname === expectedHost ||
                hostname.endsWith(`.${expectedHost}`),
        )
    ) {
        return true;
    }

    const escapedHost = expectedHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
        `(?:^|[^a-z0-9.-])(?:[a-z0-9-]+\\.)*${escapedHost}(?=$|[^a-z0-9.-])`,
        'i',
    ).test(rawText);
}

function getMentionedPages(pages: string[], rawText: string, citations: string[]): string[] {
    const referencedUrls = [...getUrls(rawText), ...citations]
        .map(normalizePageUrl)
        .filter((url): url is string => url !== null);

    return [
        ...new Set(
            pages.filter((page) => {
                const normalizedPage = normalizePageUrl(page);
                return normalizedPage !== null && referencedUrls.includes(normalizedPage);
            }),
        ),
    ];
}

export async function executeExtraction(params: ExtractionParams): Promise<ExtractionMetrics> {
    const {
        rawText,
        targetBrand,
        category,
        competitors = [],
        keywords = [],
        domain = null,
        pages = [],
    } = params;

    const competitorsContext =
        competitors.length > 0
            ? `Известные целевые конкуренты для отслеживания: ${competitors.join(', ')}.`
            : '';
    const keywordsContext =
        keywords.length > 0
            ? `Ключевые слова для отслеживания: ${JSON.stringify(keywords)}.`
            : 'Список ключевых слов для отслеживания пуст.';

    const systemPrompt = `
        Вы — строгий аналитик данных. Ваша задача — проанализировать текст ответа ИИ и извлечь метрики в формате JSON.

        ЦЕЛЕВОЙ БРЕНД: "${targetBrand}"
        КАТЕГОРИЯ ЗАПРОСА: "${category}"
        ${competitorsContext}
        ${keywordsContext}

        Правила извлечения:
        1. "brand_mentioned": true, если целевой бренд ("${targetBrand}") прямо упомянут в тексте. Иначе false.
        2. "brands_ranking": Если в тексте есть нумерованный или маркированный список рекомендаций/сервисов, зафиксируйте позиции (1, 2, 3...) ВСЕХ упомянутых брендов.
        3. "sentiment": Оцените контекст упоминания целевого бренда ("positive", "neutral", "negative"). Если бренд не упомянут — "not_found".
        4. "found_competitors": Соберите названия ВСЕХ других брендов, продуктов и сервисов-конкурентов, упомянутых в тексте. Исключите сам бренд "${targetBrand}".
        5. "extracted_domains": Извлеките все явные доменные имена и ссылки из текста (например, "example.com", "vc.ru").
        6. "mentioned_keywords": Верните только элементы из списка ключевых слов, которые явно встречаются в ответе. Допускайте очевидные грамматические формы и регистр, но не семантически похожие слова. Используйте исходное написание ключевого слова.
        Если в кейворде два и более слов, УЧИТЫВАЙТЕ ТОЛЬКО ЕСЛИ ВСТРЕЧАЮТСЯ ВСЕ СЛОВА (с поправкой на форму)! Например, ключевым словом может быть сочетания названия бренда и конкретной линейки/продукта, нужно считать ТОЛЬКО если в тексте упоминается именно это!
        Отмечай упоминания keyword ТОГДА И ТОЛЬКО ТОГДА КОГДА АБСОЛЮТНО ТОЧНО ПОНЯТНО ЧТО ИМЕННО ОН УПОМИНАЕТСЯ В ТЕКСТЕ, ИЗБЕГАЙ ЛОЖНЫХ ОТМЕТОК! Пример: keyword: "OZON Fresh". Не отмечается если в тексте упоминается только "OZON" или только "Fresh", отмечается тогда и только тогда, когда все слова искомого слова стоят рядом в том же порядке!
        7. "brands_pros_cons": Извлеките плюсы и минусы по КАЖДОМУ отдельному бренду, для которого они приводятся в тексте.
        Ключом должен быть точный бренд (например, "${targetBrand}"), а значением — объект { "pros": [...], "cons": [...] }. 
        Не смешивайте плюсы и минусы разных брендов. Если для какого-то бренда в тексте нет явных плюсов или минусов, передайте пустые массивы.

        Ответ должен быть СТРОГО в формате JSON:
        {
        "brand_mentioned": boolean,
        "brands_ranking": { [brandName: string]: number | null },
        "sentiment": "positive" | "neutral" | "negative" | "not_found",
        "found_competitors": string[],
        "extracted_domains": string[],
        "mentioned_keywords": string[],
        "brands_pros_cons": {
            [brandName: string]: { "pros": string[], "cons": string[] }
        }
        }
    `;

    try {
        let parsedMetrics: ExtractionMetrics | undefined;
        let lastResponseError: Error | undefined;

        for (const maxTokens of [2000, 3000]) {
            const response = await openaiClient.chat.completions.create({
                model: 'gpt-6-luna-pro',
                messages: [
                    {
                        role: 'system',
                        content:
                            maxTokens === 2500
                                ? systemPrompt
                                : `${systemPrompt}\n\nПредыдущий ответ был неполным или не соответствовал схеме. Верните полный JSON со всеми обязательными полями; формулируйте списки кратко.`,
                    },
                    { role: 'user', content: rawText },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: maxTokens,
            });

            const choice = response.choices[0];
            const content = choice?.message?.content;
            if (!content) {
                lastResponseError = new Error('Модель вернула пустой ответ');
                continue;
            }

            let parsedJson: unknown;
            try {
                parsedJson = JSON.parse(content);
            } catch (error: unknown) {
                const reason = error instanceof Error ? error.message : 'некорректный JSON';
                lastResponseError = new Error(
                    `Модель вернула некорректный JSON (${choice.finish_reason ?? 'причина завершения не указана'}): ${reason}`,
                );
                continue;
            }

            if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
                lastResponseError = new Error('Ответ модели должен быть JSON-объектом');
                continue;
            }

            const responseData = parsedJson as Record<string, unknown>;
            if (
                responseData.brands_ranking &&
                typeof responseData.brands_ranking === 'object' &&
                !Array.isArray(responseData.brands_ranking)
            ) {
                const normalizedRanking: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(responseData.brands_ranking)) {
                    normalizedRanking[normalizeBrandName(key)] = value;
                }
                responseData.brands_ranking = normalizedRanking;
            }

            if (Array.isArray(responseData.found_competitors)) {
                responseData.found_competitors = responseData.found_competitors.map((competitor) =>
                    typeof competitor === 'string' ? normalizeBrandName(competitor) : competitor,
                );
            }

            if (
                responseData.brands_pros_cons &&
                typeof responseData.brands_pros_cons === 'object' &&
                !Array.isArray(responseData.brands_pros_cons)
            ) {
                const normalizedProsCons: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(responseData.brands_pros_cons)) {
                    normalizedProsCons[normalizeBrandName(key)] = value;
                }
                responseData.brands_pros_cons = normalizedProsCons;
            }

            const validation = ExtractionMetricsSchema.safeParse(responseData);
            if (!validation.success) {
                lastResponseError = new Error(validation.error.message);
                continue;
            }

            if (choice.finish_reason === 'length') {
                lastResponseError = new Error('Ответ модели был обрезан по лимиту токенов');
                continue;
            }

            parsedMetrics = validation.data;
            break;
        }

        if (!parsedMetrics) {
            throw lastResponseError ?? new Error('Не удалось получить корректный ответ модели');
        }

        const configuredKeywords = new Map(
            keywords.map((keyword) => [
                keyword.trim().toLocaleLowerCase('ru-RU'),
                keyword,
            ]),
        );
        const mentionedKeywords = [
            ...new Set(
                parsedMetrics.mentioned_keywords
                    .map((keyword) =>
                        configuredKeywords.get(
                            keyword.trim().toLocaleLowerCase('ru-RU'),
                        ),
                    )
                    .filter((keyword): keyword is string => Boolean(keyword)),
            ),
        ];

        return {
            ...parsedMetrics,
            mentioned_keywords: mentionedKeywords,
            domain_mentioned: domain
                ? isDomainMentioned(domain, rawText, params.rawCitations ?? [])
                : false,
            mentioned_pages: getMentionedPages(pages, rawText, params.rawCitations ?? []),
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        console.error('[Pass 2 Error]:', error);
        throw new Error(`Ошибка при извлечении метрик в Pass 2: ${errorMessage}`);
    }
}
