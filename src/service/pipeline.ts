import { SupabaseClient } from '@supabase/supabase-js';
import { executeSearch } from './1_search';
import { executeExtraction } from './2_extractor';
import { 
    calculatePrimaryMetrics, 
    calculateH2HMetrics, 
    calculateSourceMetrics, 
    getBrandProsCons,
    ProjectContext, 
    PromptResultData 
} from './3_aggregator';
import { generateReportSummary, SummarizerInput } from './4_summarizer';

export interface PromptResultRow {
    id: string;
    report_id: string;
    prompt_id: string;
    prompt_text: string;
    prompt_category: string;
    provider: string;
    raw_text: string;
    raw_citations: string[];
    is_excluded_from_stats: boolean;
    brand_mentioned?: boolean | null;
    brands_ranking?: Record<string, number | null> | null;
    sentiment?: 'positive' | 'neutral' | 'negative' | 'not_found' | null;
    found_competitors?: string[] | null;
    extracted_domains?: string[] | null;
    brands_pros_cons?: Record<string, { pros: string[]; cons: string[] }> | null;
}

async function processInBatches<T, R>(
    items: T[], 
    batchSize: number, 
    processor: (item: T) => Promise<R>
): Promise<Array<R | null>> {
    const results: Array<R | null> = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        //eslint-disable-next-line no-await-in-loop
        const batchResults = await Promise.all(
            batch.map(async (item) => {
                try {
                    return await processor(item);
                } catch (error: unknown) {
                    console.error('[Batch Processing Error]:', error);
                    return null;
                }
            })
        );
        results.push(...batchResults);
    }
    return results;
}

export async function runReportPipeline(
    supabase: SupabaseClient, 
    projectId: string
): Promise<void> {
    let reportId: string | null = null;

    try {
        // --- 0. ИНИЦИАЛИЗАЦИЯ ---
        const { data: project, error: projectErr } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectErr || !project) throw new Error('Проект не найден');

        const { data: prompts, error: promptsErr } = await supabase
            .from('prompts')
            .select('*')
            .eq('project_id', projectId);

        if (promptsErr || !prompts || prompts.length === 0) {
            throw new Error('У проекта нет доступных промптов');
        }

        const projectContext: ProjectContext = {
            targetBrand: project.name,
            competitors: project.competitors || []
        };

        const { data: report, error: reportErr } = await supabase
            .from('reports')
            .insert({ project_id: projectId, status: 'processing' })
            .select()
            .single();

        if (reportErr || !report) throw new Error('Не удалось создать запись отчета');
        reportId = report.id;

        // --- 1. ПОИСК  ---
        const searchResults = await processInBatches(prompts, 3, async (prompt) => {
            const searchData = await executeSearch(prompt.text);
            const isExcluded = prompt.category === 'brand_direct';
            
            const { data: insertedResult, error: insertErr } = await supabase
                .from('prompt_results')
                .insert({
                    report_id: reportId,
                    prompt_id: prompt.id,
                    prompt_text: prompt.text,
                    prompt_category: prompt.category,
                    provider: 'perplexity',
                    raw_text: searchData.rawText,
                    raw_citations: searchData.citations,
                    is_excluded_from_stats: isExcluded
                })
                .select()
                .single();

            if (insertErr) throw new Error(`Ошибка записи в БД Pass 1: ${insertErr.message}`);
            return insertedResult as PromptResultRow;
        });

        const validSearchRecords = searchResults.filter((record): record is PromptResultRow => record !== null);
        if (validSearchRecords.length === 0) {
            throw new Error('Не удалось получить ни одного ответа от Perplexity');
        }

        // --- 2. ИЗВЛЕЧЕНИЕ ---
        await processInBatches(validSearchRecords, 5, async (record: PromptResultRow) => {
            const extractionMetrics = await executeExtraction({
                rawText: record.raw_text,
                targetBrand: project.name,
                category: record.prompt_category,
                competitors: project.competitors || []
            });

            const { error: updateErr } = await supabase
                .from('prompt_results')
                .update({
                    brand_mentioned: extractionMetrics.brand_mentioned,
                    brands_ranking: extractionMetrics.brands_ranking,
                    sentiment: extractionMetrics.sentiment,
                    found_competitors: extractionMetrics.found_competitors,
                    extracted_domains: extractionMetrics.extracted_domains,
                    brands_pros_cons: extractionMetrics.brands_pros_cons
                })
                .eq('id', record.id);

            if (updateErr) throw new Error(`Ошибка обновления метрик Pass 2: ${updateErr.message}`);
            return true;
        });

        // --- 3. АГРЕГАЦИЯ ---
        const { data: finalResults, error: finalErr } = await supabase
            .from('prompt_results')
            .select('*')
            .eq('report_id', reportId)
            .not('brand_mentioned', 'is', null);

        if (finalErr || !finalResults) throw new Error('Ошибка чтения результатов для агрегации');

        const aggregatorInput: PromptResultData[] = finalResults.map((r: PromptResultRow) => ({
            prompt_id: r.prompt_id,
            prompt_category: r.prompt_category as PromptResultData['prompt_category'],
            raw_citations: r.raw_citations || [],
            metrics: {
                brand_mentioned: r.brand_mentioned ?? false,
                brands_ranking: r.brands_ranking || {},
                sentiment: r.sentiment || 'not_found',
                found_competitors: r.found_competitors || [],
                extracted_domains: r.extracted_domains || [],
                brands_pros_cons: r.brands_pros_cons || {} 
            }
        }));

        const primaryMetrics = calculatePrimaryMetrics(aggregatorInput, projectContext);
        const h2hMetrics = calculateH2HMetrics(aggregatorInput, projectContext);
        const sourceMetrics = calculateSourceMetrics(aggregatorInput);

        // --- 4. ФИНАЛЬНОЕ РЕЗЮМЕ И ЗАПИСЬ ---
        const brandDirectResults = aggregatorInput.filter(p => p.prompt_category === 'brand_direct');
        const directBrandProsCons = brandDirectResults.length > 0 ? {
            pros: brandDirectResults.flatMap(p => getBrandProsCons(p.metrics.brands_pros_cons, projectContext.targetBrand).pros),
            cons: brandDirectResults.flatMap(p => getBrandProsCons(p.metrics.brands_pros_cons, projectContext.targetBrand).cons)
        } : undefined;

        const summarizerInput: SummarizerInput = {
            targetBrand: projectContext.targetBrand,
            shareOfVoice: primaryMetrics.share_of_voice,
            averageRank: primaryMetrics.average_rank,
            sentimentIndex: primaryMetrics.sentiment_index,
            topCompetitors: primaryMetrics.competitors_breakdown.slice(0, 3).map(c => ({ name: c.name, sov: c.sov })),
            topSources: sourceMetrics.top_sources.slice(0, 3).map(s => ({ domain: s.domain, count: s.count })),
            directBrandProsCons
        };

        const textSummaries = await generateReportSummary(summarizerInput);

        const { error: finishErr } = await supabase
            .from('reports')
            .update({
                status: 'completed',
                share_of_voice: primaryMetrics.share_of_voice,
                average_rank: primaryMetrics.average_rank,
                sentiment_index: primaryMetrics.sentiment_index,
                citation_rate: sourceMetrics.citation_rate,
                h2h_matrix: h2hMetrics.h2h_matrix,
                competitors_breakdown: primaryMetrics.competitors_breakdown,
                top_sources: sourceMetrics.top_sources,
                ai_summary: textSummaries.ai_summary,
                brand_direct_summary: textSummaries.brand_direct_summary,
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (finishErr) throw new Error(`Ошибка финальной записи отчета: ${finishErr.message}`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        console.error('[Pipeline Critical Error]:', error);
        if (reportId) {
            await supabase
                .from('reports')
                .update({ 
                    status: 'failed', 
                    error_message: errorMessage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reportId);
        }
        throw error;
    }
}