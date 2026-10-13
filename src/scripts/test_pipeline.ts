import dotenv from 'dotenv';
import path from 'path';

// 1. Загружаем env ДО инициализации клиентов в lib/ai.ts
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Ошибка: не заданы NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local');
    process.exit(1);
}

if (!process.env.AITUNNEL_API_KEY) {
    console.error('Ошибка: не задан AITUNNEL_API_KEY в .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('=== ЗАПУСК ТЕСТИРОВАНИЯ PIPELINE ===\n');

    // 2. Динамический импорт гарантирует, что lib/ai прочитает уже инициализированный process.env
    const { runReportPipeline } = await import('../service/pipeline');

    // Находим тестовый проект Befree
    const { data: project, error: projErr } = await supabase
        .from('projects')
        .select('id, name, niche')
        .eq('name', 'Befree')
        .single();

    if (projErr || !project) {
        console.error('Тестовый проект "Befree" не найден в БД. Сначала выполните SQL-скрипт наполнения.');
        process.exit(1);
    }

    console.log(`Проект найден: "${project.name}" (ID: ${project.id}, Ниша: ${project.niche})`);
    console.log('Запуск пайплайна...\n');

    const startTime = Date.now();

    try {
        await runReportPipeline(supabase, project.id);
    } catch (err: any) {
        console.error('\nПадение пайплайна:', err.message);
        process.exit(1);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nПайплайн завершен за ${duration} сек.\n`);

    // Получаем созданный отчет
    const { data: report, error: repErr } = await supabase
        .from('reports')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (repErr || !report) {
        console.error('Не удалось загрузить итоговый отчет из БД');
        process.exit(1);
    }

    // Получаем детализированные результаты по промптам
    const { data: promptResults } = await supabase
        .from('prompt_results')
        .select('prompt_text, prompt_category, brand_mentioned, brands_ranking, sentiment, found_competitors, brands_pros_cons')
        .eq('report_id', report.id);

    // Вывод результатов
    console.log('====================================================');
    console.log('                 ИТОГОВЫЙ ОТЧЕТ                     ');
    console.log('====================================================');
    console.log(`Статус: ${report.status}`);
    console.log(`Share of Voice (SoV): ${report.share_of_voice}%`);
    console.log(`Средняя позиция (Rank): ${report.average_rank ?? 'Н/Д'}`);
    console.log(`Процент цитирования: ${report.citation_rate}%`);
    console.log('Индекс тональности:', JSON.stringify(report.sentiment_index, null, 2));

    console.log('\n--- РАСПРЕДЕЛЕНИЕ ДОЛЕЙ И РАНГОВ (Competitors Breakdown) ---');
    console.table(report.competitors_breakdown);

    console.log('\n--- H2H СРАВНЕНИЕ (Head-to-Head Matrix) ---');
    if (Array.isArray(report.h2h_matrix) && report.h2h_matrix.length > 0) {
        report.h2h_matrix.forEach((h: any) => {
            const compName = h.competitor || h.name || 'Неизвестно';

            const ourPros = Array.isArray(h.our_pros) && h.our_pros.length > 0 ? h.our_pros.join('; ') : 'Нет';
            const ourCons = Array.isArray(h.our_cons) && h.our_cons.length > 0 ? h.our_cons.join('; ') : 'Нет';

            const compProsArr = h.competitor_pros || h.their_pros || h.pros || [];
            const compConsArr = h.competitor_cons || h.their_cons || h.cons || [];

            const compPros = Array.isArray(compProsArr) && compProsArr.length > 0 ? compProsArr.join('; ') : 'Нет';
            const compCons = Array.isArray(compConsArr) && compConsArr.length > 0 ? compConsArr.join('; ') : 'Нет';

            console.log(`\nПротив ${compName}:`);
            console.log(`  [Наш бренд] Плюсы: ${ourPros}`);
            console.log(`  [Наш бренд] Минусы: ${ourCons}`);
            console.log(`  [${compName}] Плюсы: ${compPros}`);
            console.log(`  [${compName}] Минусы: ${compCons}`);
        });
    } else {
        console.log('Данные отсутствуют');
    }

    console.log('\n--- ТОП ИСТОЧНИКОВ (Top Sources) ---');
    console.table(report.top_sources);

    console.log('\n--- РЕЗЮМЕ ОТ ИИ (AI Summary) ---');
    console.log(report.ai_summary);

    if (report.brand_direct_summary) {
        console.log('\n--- ПРЯМОЙ АНАЛИЗ БРЕНДА (Brand Direct Summary) ---');
        console.log(report.brand_direct_summary);
    }

    console.log('\n--- ДЕТАЛИЗАЦИЯ ПО ПРОМПТАМ ---');
    console.table(promptResults?.map(p => ({
        Category: p.prompt_category,
        Mentioned: p.brand_mentioned,
        Rankings: JSON.stringify(p.brands_ranking || {}),
        Sentiment: p.sentiment,
        Competitors: (p.found_competitors || []).join(', '),
        ProsCons: JSON.stringify(p.brands_pros_cons || {})
    })));

    console.log('\nТест пройден успешно.');
}

main();