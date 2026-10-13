"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/cn";

export default function RunAuditPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRun = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/projects/${projectId}/run-audit`,
                {
                    method: "POST",
                },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Ошибка при запуске исследования",
                );
            }

            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Неизвестная ошибка");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <div className="mb-6">
                <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                >
                    ← К проекту
                </Link>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">
                    {success ? "Исследование запущено" : "Запуск исследования"}
                </h1>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    {success
                        ? "Анализ успешно завершен. Результаты сохранены в системе."
                        : "Система выполнит поисковые запросы, соберет данные из ИИ-источников, проанализирует упоминания бренда и сформирует итоговый отчет."}
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {success ? (
                    <Link
                        href={`/projects/${projectId}/reports`}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2 text-sm shadow-lg shadow-blue-900/20"
                    >
                        Перейти к отчетам
                    </Link>
                ) : (
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className={cn(
                            "px-8 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2 text-sm",
                            loading
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
                        )}
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                <span>Выполняется анализ...</span>
                            </>
                        ) : (
                            "Запустить исследование"
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
