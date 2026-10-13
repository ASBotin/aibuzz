export function normalizeBrandName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[’`‘]/g, "'")
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ');
}