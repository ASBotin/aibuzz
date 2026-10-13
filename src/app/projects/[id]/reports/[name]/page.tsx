import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID =
    process.env.NEXT_PUBLIC_TEST_USER_ID ||
    "1a58f792-2ceb-4e71-9db3-d1d732fe257c";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PageProps {
    params: Promise<{ id: string; name: string }>;
}

export const revalidate = 0;

type H2HItem = {
    brand: string;
    is_target: boolean;
    average_rank: number | null;
    pros: string[];
    cons: string[];
};

export default async function ReportStubPage({ params }: PageProps) {
    const { id: projectId, name: reportId } = await params;

    // Проверка проекта
    const { data: project } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", TEST_USER_ID)
        .single();

    if (!project) {
        notFound();
    }

    // Загрузка отчета
    const { data: report, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .eq("project_id", projectId)
        .single();

    if (error || !report) {
        notFound();
    }

    // Загрузка результатов по промптам для полной картины
    const { data: promptResults } = await supabase
        .from("prompt_results")
        .select("*")
        .eq("report_id", reportId);

    const sentiment = report.sentiment_index as {
        positive?: number;
        neutral?: number;
        negative?: number;
    } | null;

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 font-mono text-sm text-slate-300">
            <div className="mb-6">
                <Link
                    href={`/projects/${projectId}/reports`}
                    className="text-slate-400 hover:text-slate-100 transition-colors"
                >
                    ← Назад к списку отчетов
                </Link>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-100 mb-1">
                        Отчет по проекту: {project.name}
                    </h1>
                    <p className="text-xs text-slate-500">
                        ID отчета: {report.id}
                    </p>
                    <p className="text-xs text-slate-500">
                        Дата:{" "}
                        {new Date(report.created_at).toLocaleString("ru-RU")}
                    </p>
                    <p className="text-xs text-slate-500">
                        Статус: {report.status}
                    </p>
                </div>

                {report.error_message && (
                    <div className="p-4 bg-red-950/50 border border-red-800 rounded text-red-200">
                        Ошибка: {report.error_message}
                    </div>
                )}

                {/* Основные метрики */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950 rounded border border-slate-800">
                    <div>
                        <div className="text-slate-500 text-xs">
                            Share of Voice
                        </div>
                        <div className="text-lg font-bold text-slate-100">
                            {report.share_of_voice ?? "—"}%
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500 text-xs">
                            Средний ранг
                        </div>
                        <div className="text-lg font-bold text-slate-100">
                            {report.average_rank ?? "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500 text-xs mb-1">
                            Индекс сентимента
                        </div>
                        <div className="text-xs font-medium text-slate-200 space-y-0.5">
                            {sentiment && typeof sentiment === "object" ? (
                                <>
                                    <div className="text-emerald-400">
                                        Pos: {sentiment.positive ?? 0}%
                                    </div>
                                    <div className="text-amber-400">
                                        Neu: {sentiment.neutral ?? 0}%
                                    </div>
                                    <div className="text-red-400">
                                        Neg: {sentiment.negative ?? 0}%
                                    </div>
                                </>
                            ) : (
                                <div>—</div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500 text-xs">
                            Доля цитирования
                        </div>
                        <div className="text-lg font-bold text-slate-100">
                            {report.citation_rate ?? "—"}%
                        </div>
                    </div>
                </div>

                {/* Текстовые резюме */}
                {report.ai_summary && (
                    <div className="space-y-2">
                        <h2 className="text-slate-200 font-bold">
                            Общее резюме ИИ:
                        </h2>
                        <div className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-300 whitespace-pre-line leading-relaxed">
                            {report.ai_summary}
                        </div>
                    </div>
                )}

                {report.brand_direct_summary && (
                    <div className="space-y-2">
                        <h2 className="text-slate-200 font-bold">
                            Резюме прямых запросов:
                        </h2>
                        <div className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-300 whitespace-pre-line leading-relaxed">
                            {report.brand_direct_summary}
                        </div>
                    </div>
                )}

                {/* Конкуренты */}
                {report.competitors_breakdown && (
                    <div className="space-y-2">
                        <h2 className="text-slate-200 font-bold">
                            Разбор конкурентов:
                        </h2>
                        <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-xs overflow-x-auto text-slate-300">
                            {JSON.stringify(
                                report.competitors_breakdown,
                                null,
                                2,
                            )}
                        </pre>
                    </div>
                )}

                {/* H2H Матрица / Топ сравнения */}
                {report.h2h_matrix && (
                    <div className="space-y-2">
                        <h2 className="text-slate-200 font-bold">
                            Сравнение (Head-to-Head Top):
                        </h2>
                        <div className="space-y-3">
                            {(report.h2h_matrix as H2HItem[]).map(
                                (item, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 bg-slate-950 rounded border ${item.is_target ? "border-blue-600/60 bg-blue-950/10" : "border-slate-800"}`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-bold text-slate-100 flex items-center gap-2">
                                                <span>
                                                    #{idx + 1} {item.brand}
                                                </span>
                                                {item.is_target && (
                                                    <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
                                                        Ваш бренд
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                Средний ранг:{" "}
                                                <span className="text-slate-200 font-bold">
                                                    {item.average_rank ?? "—"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                                            <div className="space-y-1">
                                                <span className="text-emerald-400 font-semibold">
                                                    Плюсы:
                                                </span>
                                                {item.pros.length > 0 ? (
                                                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                                                        {item.pros.map(
                                                            (pro, i) => (
                                                                <li key={i}>
                                                                    {pro}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : (
                                                    <div className="text-slate-500 italic">
                                                        Нет данных
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-red-400 font-semibold">
                                                    Минусы:
                                                </span>
                                                {item.cons.length > 0 ? (
                                                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                                                        {item.cons.map(
                                                            (con, i) => (
                                                                <li key={i}>
                                                                    {con}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : (
                                                    <div className="text-slate-500 italic">
                                                        Нет данных
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

                {/* Топ источников */}
                {report.top_sources && (
                    <div className="space-y-2">
                        <h2 className="text-slate-200 font-bold">
                            Топ источников:
                        </h2>
                        <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-xs overflow-x-auto text-slate-300">
                            {JSON.stringify(report.top_sources, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Результаты по промптам */}
                <div className="space-y-2">
                    <h2 className="text-slate-200 font-bold">
                        Результаты по промптам ({promptResults?.length || 0}):
                    </h2>
                    <div className="space-y-3">
                        {promptResults?.map((res, index) => (
                            <div
                                key={res.id}
                                className="p-4 bg-slate-950 rounded border border-slate-800 space-y-2"
                            >
                                <div className="text-xs text-slate-500">
                                    #{index + 1} [{res.prompt_category}]
                                </div>
                                <div className="font-semibold text-slate-200">
                                    {res.prompt_text}
                                </div>
                                <div className="text-xs text-slate-400">
                                    Бренд упомянут:{" "}
                                    {res.brand_mentioned ? "Да" : "Нет"} |
                                    Сентимент: {res.sentiment || "—"}
                                </div>
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                                        Показать сырой ответ ИИ
                                    </summary>
                                    <p className="mt-2 text-slate-400 whitespace-pre-line bg-slate-900 p-3 rounded">
                                        {res.raw_text}
                                    </p>
                                </details>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
