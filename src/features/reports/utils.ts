export function formatNumber(
    value: unknown,
    maximumFractionDigits = 1,
): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return value.toLocaleString("ru-RU", { maximumFractionDigits });
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

export function sentimentLabel(value: string | null | undefined): string {
    switch (value) {
        case "positive":
            return "Позитивный";
        case "neutral":
            return "Нейтральный";
        case "negative":
            return "Негативный";
        case "not_found":
            return "Не определён";
        default:
            return value || "—";
    }
}

export function categoryLabel(value: string | null | undefined): string {
    switch (value) {
        case "main":
            return "Основные запросы";
        case "brand_direct":
            return "Прямые запросы";
        case "head_to_head":
            return "Сравнение с конкурентами";
        default:
            return value || "Категория не указана";
    }
}

export function statusLabel(value: string | null | undefined): string {
    switch (value) {
        case "completed":
            return "Завершён";
        case "processing":
            return "Выполняется";
        case "failed":
            return "Ошибка";
        default:
            return value || "Неизвестен";
    }
}

export function externalHref(value: string): string | null {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^(www\.)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return null;
}

export function normalizeBrandKey(value: string): string {
    return value
        .normalize("NFKC")
        .toLocaleLowerCase("ru-RU")
        .replace(/ё/g, "е")
        .replace(/[^\p{L}\p{N}]/gu, "");
}
