import { ExtractionMetrics } from './2_extractor';
import { normalizeBrandName } from '../utils/normName';

export interface ProjectContext {
    targetBrand: string;
    competitors: string[];
}

export interface KeywordMentionMetric {
    keyword: string;
    count: number;
    percentage: number;
}

export interface TrackedSourceMetrics {
    domain: { value: string; count: number } | null;
    pages: Array<{ url: string; count: number }>;
}

export interface PromptResultData {
    prompt_id: string;
    prompt_category: 'main' | 'brand_direct' | 'head_to_head';
    raw_citations: string[];
    metrics: ExtractionMetrics;
}

export interface AggregatedMain {
    share_of_voice: number;
    average_rank: number | null;
    sentiment_index: {
        positive: number;
        neutral: number;
        negative: number;
    };
    competitors_breakdown: Array<{
        name: string;
        sov: number;
        average_rank: number | null;
        mentions_count: number;
        is_target: boolean;
    }>;
}

export interface AggregatedH2H {
    h2h_matrix: Array<{
        brand: string;
        is_target: boolean;
        average_rank: number | null;
        pros: string[];
        cons: string[];
    }>;
}

export interface AggregatedSources {
    citation_rate: number;
    top_sources: Array<{
        domain: string;
        count: number;
        percentage: number;
        mentions_target_brand: boolean;
    }>;
}

export function calculateKeywordMetrics(
    data: PromptResultData[],
    configuredKeywords: string[],
): KeywordMentionMetric[] {
    const normalizedKeywords = new Map<string, string>();
    configuredKeywords.forEach((keyword) => {
        const trimmed = keyword.trim();
        if (trimmed) normalizedKeywords.set(trimmed.toLocaleLowerCase('ru-RU'), trimmed);
    });

    return Array.from(normalizedKeywords.entries()).map(
        ([normalized, keyword]) => {
            const count = data.filter((result) =>
                result.metrics.mentioned_keywords.some(
                    (mentioned) =>
                        mentioned.trim().toLocaleLowerCase('ru-RU') ===
                        normalized,
                ),
            ).length;

            return {
                keyword,
                count,
                percentage:
                    data.length > 0
                        ? Number(((count / data.length) * 100).toFixed(1))
                        : 0,
            };
        },
    );
}

export function calculateTrackedSourceMetrics(
    data: PromptResultData[],
    configuredDomain: string | null | undefined,
    configuredPages: string[],
): TrackedSourceMetrics {
    const domain = configuredDomain?.trim();
    const pageCounts = new Map<string, number>();
    configuredPages.forEach((page) => {
        const url = page.trim();
        if (url && !pageCounts.has(url)) pageCounts.set(url, 0);
    });

    let domainCount = 0;
    data.forEach((result) => {
        if (domain && result.metrics.domain_mentioned) domainCount++;

        const mentionedPages = new Set(result.metrics.mentioned_pages);
        pageCounts.forEach((count, url) => {
            if (mentionedPages.has(url)) pageCounts.set(url, count + 1);
        });
    });

    return {
        domain: domain ? { value: domain, count: domainCount } : null,
        pages: Array.from(pageCounts, ([url, count]) => ({ url, count })),
    };
}

function getBrandRank(ranking: Record<string, number | null>, brandName: string): number | null {
    if (!ranking) return null;
    const targetNorm = normalizeBrandName(brandName);

    for (const [key, rank] of Object.entries(ranking)) {
        if (normalizeBrandName(key) === targetNorm && rank !== null) {
            return rank;
        }
    }
    return null;
}

export function getBrandProsCons(brandsProsCons: Record<string, { pros: string[]; cons: string[] }>, brandName: string): { pros: string[]; cons: string[] } {
    if (!brandsProsCons) return { pros: [], cons: [] };
    const targetNorm = normalizeBrandName(brandName);

    for (const [key, value] of Object.entries(brandsProsCons)) {
        if (normalizeBrandName(key) === targetNorm) {
            return value || { pros: [], cons: [] };
        }
    }
    return { pros: [], cons: [] };
}

export function calculatePrimaryMetrics(data: PromptResultData[], context: ProjectContext): AggregatedMain {
    // Исключаем brand_direct и head_to_head из расчета основных метрик (SoV и т.д.)
    const validPrompts = data.filter((p) => p.prompt_category !== 'brand_direct' && p.prompt_category !== 'head_to_head');
    const totalValid = validPrompts.length;
    const targetNorm = normalizeBrandName(context.targetBrand);

    if (totalValid === 0) {
        return {
            share_of_voice: 0,
            average_rank: null,
            sentiment_index: { positive: 0, neutral: 0, negative: 0 },
            competitors_breakdown: [],
        };
    }

    let targetMentions = 0;
    const targetRanks: number[] = [];
    let pos = 0,
        neu = 0,
        neg = 0;

    validPrompts.forEach((p) => {
        if (p.metrics.brand_mentioned) {
            targetMentions++;

            const rank = getBrandRank(p.metrics.brands_ranking, context.targetBrand);
            if (rank !== null) {
                targetRanks.push(rank);
            }

            if (p.metrics.sentiment === 'positive') pos++;
            else if (p.metrics.sentiment === 'neutral') neu++;
            else if (p.metrics.sentiment === 'negative') neg++;
        }
    });

    const targetSoV = (targetMentions / totalValid) * 100;
    const targetAvgRank = targetRanks.length > 0 ? targetRanks.reduce((a, b) => a + b, 0) / targetRanks.length : null;

    const sentiment_index = { positive: 0, neutral: 0, negative: 0 };
    if (targetMentions > 0) {
        sentiment_index.positive = Number(((pos / targetMentions) * 100).toFixed(1));
        sentiment_index.neutral = Number(((neu / targetMentions) * 100).toFixed(1));
        sentiment_index.negative = Number(((neg / targetMentions) * 100).toFixed(1));
    }

    const competitorMap = new Map<
        string,
        {
            originalName: string;
            count: number;
            is_target: boolean;
            ranks: number[];
        }
    >();

    const userCompetitorNorms = new Set<string>();
    context.competitors.forEach((c) => {
        const norm = normalizeBrandName(c);
        userCompetitorNorms.add(norm);
        competitorMap.set(norm, {
            originalName: c,
            count: 0,
            is_target: true,
            ranks: [],
        });
    });

    validPrompts.forEach((p) => {
        const uniqueCompetitorsInPrompt = new Map<string, string>();

        p.metrics.found_competitors.forEach((c) => {
            const normKey = normalizeBrandName(c);
            if (!uniqueCompetitorsInPrompt.has(normKey)) {
                uniqueCompetitorsInPrompt.set(normKey, c);
            }
        });

        uniqueCompetitorsInPrompt.forEach((origName, normKey) => {
            if (normKey === targetNorm) return;

            if (!competitorMap.has(normKey)) {
                competitorMap.set(normKey, {
                    originalName: origName,
                    count: 0,
                    is_target: userCompetitorNorms.has(normKey),
                    ranks: [],
                });
            }

            const compData = competitorMap.get(normKey)!;
            compData.count++;

            const rank = getBrandRank(p.metrics.brands_ranking, compData.originalName);
            if (rank !== null) {
                compData.ranks.push(rank);
            }
        });
    });

    const allCompetitors = Array.from(competitorMap.entries()).map(([normKey, compData]) => ({
        normKey,
        ...compData,
    }));

    allCompetitors.sort((a, b) => b.count - a.count);

    const topCompetitors = allCompetitors.slice(0, 15);
    const standaloneKeys = new Set(topCompetitors.map((c) => c.normKey));

    let otherPromptsCount = 0;
    validPrompts.forEach((p) => {
        const hasOther = p.metrics.found_competitors.some((c) => {
            const normKey = normalizeBrandName(c);
            return normKey !== targetNorm && !standaloneKeys.has(normKey);
        });
        if (hasOther) {
            otherPromptsCount++;
        }
    });

    const competitors_breakdown: AggregatedMain['competitors_breakdown'] = [];

    competitors_breakdown.push({
        name: context.targetBrand,
        sov: Number(targetSoV.toFixed(1)),
        average_rank: targetAvgRank !== null ? Number(targetAvgRank.toFixed(1)) : null,
        mentions_count: targetMentions,
        is_target: true,
    });

    topCompetitors.forEach((compData) => {
        if (compData.count === 0) return;

        const avgRank = compData.ranks.length > 0 ? compData.ranks.reduce((a, b) => a + b, 0) / compData.ranks.length : null;

        competitors_breakdown.push({
            name: compData.originalName,
            sov: Number(((compData.count / totalValid) * 100).toFixed(1)),
            average_rank: avgRank !== null ? Number(avgRank.toFixed(1)) : null,
            mentions_count: compData.count,
            is_target: compData.is_target,
        });
    });

    if (otherPromptsCount > 0) {
        competitors_breakdown.push({
            name: 'Other',
            sov: Number(((otherPromptsCount / totalValid) * 100).toFixed(1)),
            average_rank: null,
            mentions_count: otherPromptsCount,
            is_target: false,
        });
    }

    competitors_breakdown.sort((a, b) => b.sov - a.sov);

    return {
        share_of_voice: Number(targetSoV.toFixed(1)),
        average_rank: targetAvgRank !== null ? Number(targetAvgRank.toFixed(1)) : null,
        sentiment_index,
        competitors_breakdown,
    };
}

export function calculateH2HMetrics(data: PromptResultData[], context: ProjectContext): AggregatedH2H {
    const h2hPrompts = data.filter((p) => p.prompt_category === 'head_to_head');

    if (h2hPrompts.length === 0) {
        return { h2h_matrix: [] };
    }

    const targetNorm = normalizeBrandName(context.targetBrand);
    const brandMap = new Map<
        string,
        {
            originalName: string;
            is_target: boolean;
            ranks: number[];
            pros: Set<string>;
            cons: Set<string>;
        }
    >();

    brandMap.set(targetNorm, {
        originalName: context.targetBrand,
        is_target: true,
        ranks: [],
        pros: new Set(),
        cons: new Set(),
    });

    h2hPrompts.forEach((p) => {
        const promptBrands = new Map<string, string>();
        promptBrands.set(targetNorm, context.targetBrand);

        if (p.metrics.found_competitors) {
            p.metrics.found_competitors.forEach((c) => {
                promptBrands.set(normalizeBrandName(c), c);
            });
        }
        if (p.metrics.brands_ranking) {
            Object.keys(p.metrics.brands_ranking).forEach((c) => {
                promptBrands.set(normalizeBrandName(c), c);
            });
        }
        if (p.metrics.brands_pros_cons) {
            Object.keys(p.metrics.brands_pros_cons).forEach((c) => {
                promptBrands.set(normalizeBrandName(c), c);
            });
        }

        promptBrands.forEach((origName, normKey) => {
            if (!brandMap.has(normKey)) {
                brandMap.set(normKey, {
                    originalName: origName,
                    is_target: false,
                    ranks: [],
                    pros: new Set(),
                    cons: new Set(),
                });
            }

            const brandData = brandMap.get(normKey)!;

            const rank = getBrandRank(p.metrics.brands_ranking, brandData.originalName);
            if (rank !== null) {
                brandData.ranks.push(rank);
            }

            const pc = getBrandProsCons(p.metrics.brands_pros_cons, brandData.originalName);
            pc.pros.forEach((pro) => brandData.pros.add(pro));
            pc.cons.forEach((con) => brandData.cons.add(con));
        });
    });

    const h2h_matrix = Array.from(brandMap.entries()).map(([, data]) => {
        const avgRank = data.ranks.length > 0 ? data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length : null;

        return {
            brand: data.originalName,
            is_target: data.is_target,
            average_rank: avgRank !== null ? Number(avgRank.toFixed(1)) : null,
            pros: Array.from(data.pros),
            cons: Array.from(data.cons),
        };
    });

    h2h_matrix.sort((a, b) => {
        if (a.average_rank !== null && b.average_rank !== null) {
            return a.average_rank - b.average_rank;
        }
        if (a.average_rank !== null && b.average_rank === null) {
            return -1;
        }
        if (a.average_rank === null && b.average_rank !== null) {
            return 1;
        }
        if (a.is_target && !b.is_target) return -1;
        if (!a.is_target && b.is_target) return 1;
        return 0;
    });

    return { h2h_matrix };
}

function getRootDomain(input: string): string | null {
    try {
        const urlString = input.startsWith('http') ? input : `https://${input}`;
        const url = new URL(urlString);
        let hostname = url.hostname.toLowerCase();

        if (hostname.startsWith('www.')) {
            hostname = hostname.slice(4);
        }
        return hostname;
    } catch {
        return null;
    }
}

export function calculateSourceMetrics(data: PromptResultData[]): AggregatedSources {
    const validPrompts = data.filter((p) => p.prompt_category !== 'brand_direct');
    const totalValid = validPrompts.length;

    if (totalValid === 0) {
        return { citation_rate: 0, top_sources: [] };
    }

    let promptsWithCitations = 0;
    const domainStats = new Map<string, { count: number; mentions_target_brand: boolean }>();

    validPrompts.forEach((p) => {
        const combinedSources = [...p.raw_citations, ...p.metrics.extracted_domains];
        const uniqueDomainsInPrompt = new Set<string>();

        combinedSources.forEach((source) => {
            const domain = getRootDomain(source);
            if (domain) {
                uniqueDomainsInPrompt.add(domain);
            }
        });

        if (uniqueDomainsInPrompt.size > 0) {
            promptsWithCitations++;
        }

        uniqueDomainsInPrompt.forEach((domain) => {
            if (!domainStats.has(domain)) {
                domainStats.set(domain, {
                    count: 0,
                    mentions_target_brand: false,
                });
            }

            const stat = domainStats.get(domain)!;
            stat.count++;

            if (p.metrics.brand_mentioned) {
                stat.mentions_target_brand = true;
            }
        });
    });

    const citation_rate = Number(((promptsWithCitations / totalValid) * 100).toFixed(1));

    const top_sources = Array.from(domainStats.entries())
        .map(([domain, stat]) => ({
            domain,
            count: stat.count,
            percentage: Number(((stat.count / totalValid) * 100).toFixed(1)),
            mentions_target_brand: stat.mentions_target_brand,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        citation_rate,
        top_sources,
    };
}
