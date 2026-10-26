import { perplexityClient } from '@/lib/ai';

export interface SearchResult {
    rawText: string;
    citations: string[];
}

interface PerplexityUrlCitation {
    url: string;
    title?: string;
    start_index?: number;
    end_index?: number;
}

interface PerplexityAnnotation {
    type: string;
    url_citation?: PerplexityUrlCitation;
}

interface PerplexityMessage {
    role: string;
    content: string;
    annotations?: PerplexityAnnotation[];
}

interface PerplexityChoice {
    index: number;
    finish_reason: string;
    message: PerplexityMessage;
}

interface PerplexityResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: PerplexityChoice[];
}

export async function executeSearch(prompt: string): Promise<SearchResult> {
    try {
        const response = await perplexityClient.chat.completions.create({
            model: 'sonar',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
        }) as unknown as PerplexityResponse;

        const choice = response.choices?.[0];
        const rawText = choice?.message?.content || '';
        const annotations = choice?.message?.annotations || [];

        const citations = annotations
            .filter((ann) => ann.type === 'url_citation' && Boolean(ann.url_citation?.url))
            .map((ann) => ann.url_citation!.url);

        return { rawText, citations };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        console.error('[Pass 1 Error]:', error);
        throw new Error(`Ошибка при запросе к Perplexity: ${errorMessage}`);
    }
}