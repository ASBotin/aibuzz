export type H2HItem = {
    brand: string;
    is_target: boolean;
    rank?: number;
    pros?: string[];
    cons?: string[];
};

export type CompetitorItem = {
    name: string;
    sov: number;
    average_rank: number | null;
    mentions_count: number;
    is_target: boolean;
};

export type SourceItem = {
    domain: string;
    count: number;
    percentage: number;
    mentions_target_brand: boolean;
};

export type BrandProsCons = {
    pros?: string[];
    cons?: string[];
};

export type PromptResult = {
    id: string;
    prompt_id?: string | null;
    prompt_text?: string | null;
    prompt_category?: string | null;
    provider?: string | null;
    is_custom?: boolean | null;
    raw_text?: string | null;
    raw_citations?: string[] | null;
    is_excluded_from_stats?: boolean | null;
    brand_mentioned?: boolean | null;
    brands_ranking?: Record<string, number | null> | null;
    sentiment?: string | null;
    found_competitors?: string[] | null;
    extracted_domains?: string[] | null;
    mentioned_keywords?: string[] | null;
    domain_mentioned?: boolean | null;
    mentioned_pages?: string[] | null;
    brands_pros_cons?: Record<string, BrandProsCons> | null;
};

export type KeywordMentionItem = {
    keyword: string;
    count: number;
    percentage: number;
};

export type TrackedSources = {
    domain: { value: string; count: number } | null;
    pages: Array<{ url: string; count: number }>;
};

export type SentimentIndex = {
    positive?: number;
    neutral?: number;
    negative?: number;
};
