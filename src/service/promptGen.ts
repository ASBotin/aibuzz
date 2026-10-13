import { z } from 'zod';
import { openaiClient } from '@/lib/ai';

export const GeneratedPromptCategorySchema = z.enum([
  'brand_direct',
  'category_discovery',
  'head_to_head',
]);

export const GeneratedPromptSchema = z.object({
  text: z.string().min(1, 'Текст промпта не может быть пустым'),
  category: GeneratedPromptCategorySchema,
});

export const GeneratedPromptsResponseSchema = z.object({
  prompts: z.array(GeneratedPromptSchema),
});

export type GeneratedPromptCategory = z.infer<typeof GeneratedPromptCategorySchema>;
export type GeneratedPrompt = z.infer<typeof GeneratedPromptSchema>;

export interface GeneratePromptsInput {
  brandName: string;
  niche: string;
  country?: string;
  city?: string;
  description?: string;
  competitors?: string[];
}

export async function generateProjectPrompts(
  input: GeneratePromptsInput
): Promise<GeneratedPrompt[]> {
  const {
    brandName,
    niche,
    country = 'Не указана',
    city = 'Не указан',
    description = 'Не указано',
    competitors = [],
  } = input;

  const competitorsList = competitors.length > 0 ? competitors.join(', ') : 'Отсутствуют';

  const systemPrompt = `
Вы — ведущий эксперт по GEO (Generative Engine Optimization) и анализу видимости брендов в ИИ-системах. 
Ваша задача — сгенерировать реалистичный список поисковых запросов (промптов), которые потенциальные клиенты задают нейросетям (ChatGPT, Perplexity и др.).

ВХОДНЫЕ ДАННЫЕ:
- Название бренда: "${brandName}"
- Ниша / Категория: "${niche}"
- Страна: "${country}"
- Город: "${city}"
- Описание бизнеса: "${description}"
- Список конкурентов: ${competitorsList}

ПРАВИЛА ГЕНЕРАЦИИ ПРОМПТОВ:

1. Категория "brand_direct" (СТРОГО 2 промпта):
   - Прямые запросы информации о конкретном бренде "${brandName}".
   - Сформулированы от лица пользователя, который уже знает бренд и хочет узнать детали (плюсы/минусы, отзывы, специфика, надежность).

2. Категория "category_discovery" (СТРОГО 13 промптов):
   - Реалистичные категориальные запросы целевой аудитории в нише "${niche}".
   - Пользователь НЕ знает о бренде "${brandName}" заранее и ищет решение проблемы, топ сервисов/продуктов, рекомендации или советы.
   - Не упоминайте бренд "${brandName}" и другие бренды промптах этой категории.
   - Учитывайте контекст локации (страна/город), если они указаны.
   - Разнообразьте интенты: выбор лучших ("топ 5..."), поиск под конкретную задачу ("посоветуй... для..."), сравнение критериев ("на что обратить внимание при выборе...").
   - Запросы должны подразумевать, что в ответах пользователь ожидает увидеть различные бренды/компании.

3. Категория "head_to_head" (0 или 5 промптов):
   - Если список конкурентов ПУСТ — сгенерируйте 0 промптов этой категории.
   - Если конкуренты ЕСТЬ сгенерируйте СТРОГО 5 промптов НЕ БОЛЬШЕ НЕ МЕНЬШЕ:
     1) Сгенерируйте СТРОГО 2 промпта, где прямо сравниваются "${brandName}" и ВСЕ перечисленные конкуренты одновременно (например: "Сравни ${brandName}, Comp1, Comp2...").
     2) Сгенерируйте ещё 3 дополнительных промпта (так, чтобы общее число H2H не превышало 5), разбивая конкурентов на логичные подгруппы или делая точечные сравнения 1-на-1 (например: "${brandName} или Comp1", "${brandName} против Comp2 и Comp3").
   - Формулируйте запросы в этой категории так, чтобы нейросеть чаще давала ранджированые списки (топы).
   - 

ТРЕБОВАНИЯ К ТЕКСТАМ:
- Запросы должны звучать максимально естественно для живого человека, обращающегося к ИИ.
- Избегайте слишком формального или рекламного языка.
- Все промпты должны быть на русском языке.

ВЫХОДНОЙ ФОРМАТ (СТРОГО JSON):
{
  "prompts": [
    {
      "text": "Текст промпта",
      "category": "brand_direct" | "category_discovery" | "head_to_head"
    }
  ]
}
`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsedJson = JSON.parse(content);
    const validatedData = GeneratedPromptsResponseSchema.parse(parsedJson);

    return validatedData.prompts;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[Prompt Generator Error]:', error);
    throw new Error(`Ошибка при генерации промптов: ${errorMessage}`);
  }
}