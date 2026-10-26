"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AccentButton from "@/components/ui/AccentButton";
import GradientButton from "@/components/ui/GradientButton";
import StatusNotice from "@/components/ui/StatusNotice";

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
                    className="text-sm text-content-secondary hover:text-content-primary inline-flex items-center gap-1.5"
                >
                    ← К проекту
                </Link>
            </div>

            <div className="max-w-2xl mx-auto py-20 px-4 text-center select-none">
                <h1 className="text-2xl font-bold text-content-primary mb-2">
                    {success ? "Исследование запущено" : "Запуск исследования"}
                </h1>
                {success ? (
                    <StatusNotice variant="success" className="mb-8 text-left">
                        Анализ успешно завершён. Результаты сохранены в системе.
                    </StatusNotice>
                ) : (
                    <p className="text-content-secondary text-sm mb-8 leading-relaxed">
                        Система выполнит поисковые запросы, соберет данные из
                        ИИ-источников, проанализирует упоминания бренда и
                        сформирует итоговый отчет.
                    </p>
                )}

                {error && (
                    <StatusNotice variant="error" className="mb-6 text-left">
                        {error}
                    </StatusNotice>
                )}

                {success ? (
                    <AccentButton
                        size="lg"
                        href={`/projects/${projectId}/reports`}
                    >
                        Перейти к отчетам
                    </AccentButton>
                ) : (
                    <GradientButton
                        size="lg"
                        onClick={handleRun}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                <span>Выполняется анализ...</span>
                            </>
                        ) : (
                            "Запустить исследование"
                        )}
                    </GradientButton>
                )}
            </div>
        </div>
    );
}
