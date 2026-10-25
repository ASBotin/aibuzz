export type ProjectFormData = {
    brandName: string;
    niche: string;
    domain: string;
    country: string;
    city: string;
    description: string;
};

export type PromptCategory = "main" | "brand_direct" | "head_to_head";

export type ProjectPrompt = {
    id: string;
    text: string;
    category: PromptCategory;
    isCustom?: boolean;
};

export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_COMPETITORS = 10;
export const MAX_KEYWORDS = 10;
export const MAX_PAGES = 5;
export const MAX_PROMPTS = 25;

export const PROMPT_CATEGORIES: {
    id: PromptCategory;
    name: string;
    description: string;
}[] = [
    {
        id: "main",
        name: "Основные запросы",
        description:
            "исследует запросы целевой аудитории без упоминания бренда. Показывает, как часто и в каких контекстах пользователи будут видеть ваш бренд в выдаче.",
    },
    {
        id: "brand_direct",
        name: "Прямые запросы",
        description:
            "анализирует выдачу нейросети при прямом упоминании бренда в запросе. Показывает, как нейросеть воспринимает ваш бренд и его позиционирование.",
    },
    {
        id: "head_to_head",
        name: "Сравнение с конкурентами",
        description:
            "анализирует выдачу нейросети при прямом сравнении вашего бренда с конкурентами. Показывает, как нейросеть воспринимает ваш бренд в сравнении с конкурентами.",
    },
];

export function createEmptyProjectFormData(): ProjectFormData {
    return {
        brandName: "",
        niche: "",
        domain: "",
        country: "",
        city: "",
        description: "",
    };
}
